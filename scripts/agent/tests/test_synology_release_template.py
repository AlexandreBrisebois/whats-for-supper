"""End-to-end verification of release-template/synology/ setup.sh, permissions, and contracts."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
TEMPLATE_DIR = ROOT / 'release-template' / 'synology'
API_DOCKERFILE = ROOT / 'api' / 'Dockerfile'
HEX_64_RE = re.compile(r'^[0-9a-f]{64}$')


def _strip_inline_comment(value: str) -> str:
    in_single = False
    in_double = False
    for idx, ch in enumerate(value):
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single:
            in_double = not in_double
        elif ch == '#' and not in_single and not in_double and (idx == 0 or value[idx - 1].isspace()):
            return value[:idx]
    return value


def _unquote_scalar(value: str):
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        return value[1:-1]
    return value


def load_yaml_mapping(path: Path) -> dict:
    text = path.read_text(encoding='utf-8')
    try:
        import yaml  # type: ignore
        return yaml.safe_load(text)
    except ModuleNotFoundError:
        pass

    root: dict = {}
    stack: list[tuple[int, dict | list, str | None]] = [(-1, root, None)]
    for raw_line in text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith('#'):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(' '))
        stripped = raw_line.strip()

        while len(stack) > 1:
            top_indent, top_obj, pending = stack[-1]
            if pending is not None:
                assert isinstance(top_obj, dict)
                if indent > top_indent or (indent == top_indent and stripped.startswith('- ')):
                    child: dict | list = [] if stripped.startswith('- ') else {}
                    top_obj[pending] = child
                    stack.pop()
                    stack.append((indent, child, None))
                    break
                top_obj[pending] = None
                stack.pop()
                continue
            if indent < top_indent:
                stack.pop()
                continue
            break

        _, cur_obj, _ = stack[-1]
        if stripped.startswith('- '):
            assert isinstance(cur_obj, list)
            item_val = _strip_inline_comment(stripped[2:]).strip()
            cur_obj.append(_unquote_scalar(item_val))
        else:
            assert isinstance(cur_obj, dict)
            key, sep, rest = stripped.partition(':')
            if sep != ':':
                raise AssertionError(f'Unsupported YAML line in {path}: {raw_line!r}')
            key = key.strip()
            val_str = _strip_inline_comment(rest).strip()
            if val_str == '':
                stack.append((indent, cur_obj, key))
            elif val_str.startswith('[') or val_str.startswith('{'):
                cur_obj[key] = json.loads(val_str)
            else:
                cur_obj[key] = _unquote_scalar(val_str)

    while stack:
        _, top_obj, pending = stack.pop()
        if pending is not None and isinstance(top_obj, dict):
            top_obj[pending] = None
    return root


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue
        key, sep, value = raw_line.partition('=')
        if sep != '=':
            raise AssertionError(f'Unexpected non-KEY=VALUE line in .env: {raw_line!r}')
        values[key] = value
    return values


class SynologyReleaseTemplateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.project = self.root / 'synology'
        shutil.copytree(TEMPLATE_DIR, self.project)

        # Install a guard docker shim so accidental `docker compose up` in no-start mode fails loudly.
        self.bin_dir = self.root / 'bin'
        self.bin_dir.mkdir()
        self.docker_log = self.root / 'docker.log'
        docker_shim = self.bin_dir / 'docker'
        docker_shim.write_text(
            '#!/bin/sh\n'
            'echo "$*" >> "$DOCKER_CALL_LOG"\n'
            'case "$*" in\n'
            '  *"up -d"*|*" up "*) exit 99 ;;\n'
            'esac\n'
            'exit 0\n',
            encoding='utf-8',
        )
        docker_shim.chmod(0o755)

        self.env = {
            k: v
            for k, v in os.environ.items()
            if not k.startswith(
                (
                    'COMPOSE_',
                    'WFS_',
                    'CLOUDFLARE_',
                    'POSTGRES_',
                    'HEARTH_',
                    'GEMINI_',
                    'ELEVATED_',
                    'DEMO_',
                    'START_CONTAINERS',
                )
            )
        }
        self.env['PATH'] = f'{self.bin_dir}:{self.env.get("PATH", "")}'
        self.env['DOCKER_CALL_LOG'] = str(self.docker_log)

    def write_secrets_file(self, content: str, mode: int = 0o600, name: str = 'secrets.env') -> Path:
        secrets_path = self.root / name
        secrets_path.write_text(content, encoding='utf-8')
        secrets_path.chmod(mode)
        return secrets_path

    def run_setup(self, *args: str, stdin_data: str | None = None, cwd: Path | None = None):
        return subprocess.run(
            ['bash', str(self.project / 'setup.sh'), *args],
            cwd=cwd or self.project,
            env=self.env,
            input=stdin_data,
            stdin=subprocess.DEVNULL if stdin_data is None else None,
            text=True,
            capture_output=True,
        )

    def test_non_tty_without_non_interactive_flag_fails_cleanly(self):
        result = self.run_setup()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn('interactively in a terminal', result.stderr)
        self.assertFalse((self.project / '.env').exists())
        self.assertFalse((self.project / 'data').exists())

    def test_rejects_world_or_group_readable_secrets_file(self):
        valid_content = (
            'SCENARIO=1\n'
            'GEMINI_API_KEY=gemini-secret-key\n'
            'CLOUDFLARE_TUNNEL_TOKEN=cf-tunnel-token\n'
            'ELEVATED_ACTIONS_PIN=123456\n'
        )
        for bad_mode in (0o644, 0o640, 0o604):
            with self.subTest(mode=oct(bad_mode)):
                secrets_path = self.write_secrets_file(valid_content, mode=bad_mode)
                result = self.run_setup('--non-interactive', '--secrets-file', str(secrets_path), '--no-start')
                self.assertEqual(result.returncode, 1)
                self.assertIn('0600', result.stderr)
                self.assertFalse((self.project / '.env').exists())

    def test_rejects_cli_secret_flags_and_incomplete_non_interactive_invocation(self):
        cases = [
            ('--non-interactive',),
            ('--secrets-stdin',),
            ('--gemini-key', 'leaked-secret'),
            ('--non-interactive', '--gemini-key=leaked-secret'),
            ('--non-interactive', '--token', 'leaked-token'),
            ('positional-secret',),
        ]
        for args in cases:
            with self.subTest(args=args):
                result = self.run_setup(*args)
                self.assertEqual(result.returncode, 1)
                self.assertFalse((self.project / '.env').exists())

    def test_scenario_1_bundled_tunnel_creates_secure_env_and_uid_1654_traversable_dirs(self):
        secrets_path = self.write_secrets_file(
            '# Bundled tunnel secrets\n'
            'SCENARIO=1\n'
            'GEMINI_API_KEY=gemini-live-key-abc123\n'
            'CLOUDFLARE_TUNNEL_TOKEN=cf-tunnel-tok-xyz789\n'
            'ELEVATED_ACTIONS_PIN=987654\n',
            mode=0o600,
        )
        result = self.run_setup('--non-interactive', '--secrets-file', str(secrets_path), '--no-start')
        self.assertEqual(result.returncode, 0, result.stderr)

        env_path = self.project / '.env'
        self.assertTrue(env_path.is_file())
        self.assertEqual(env_path.stat().st_mode & 0o777, 0o600)

        parsed = parse_env_file(env_path)
        self.assertEqual(parsed['COMPOSE_FILE'], 'compose.yaml:compose.tunnel.yaml')
        self.assertEqual(parsed['GEMINI_API_KEY'], 'gemini-live-key-abc123')
        self.assertEqual(parsed['CLOUDFLARE_TUNNEL_TOKEN'], 'cf-tunnel-tok-xyz789')
        self.assertEqual(parsed['ELEVATED_ACTIONS_PIN'], '987654')
        self.assertEqual(parsed['WFS_PROXY_NETWORK'], 'cloudflare-proxy')
        self.assertEqual(parsed['WFS_PROXY_ALIAS'], '')
        self.assertRegex(parsed['POSTGRES_PASSWORD'], HEX_64_RE)
        self.assertRegex(parsed['HEARTH_SECRET'], HEX_64_RE)
        self.assertNotEqual(parsed['POSTGRES_PASSWORD'], parsed['HEARTH_SECRET'])

        data_dir = self.project / 'data'
        app_dir = data_dir / 'app'
        pg_dir = data_dir / 'postgres'
        self.assertTrue(data_dir.is_dir())
        self.assertTrue(app_dir.is_dir())
        self.assertTrue(pg_dir.is_dir())
        # Must remain 0755 despite umask 077 so non-root UID 1654 can traverse/read!
        self.assertEqual(data_dir.stat().st_mode & 0o777, 0o755)
        self.assertEqual(app_dir.stat().st_mode & 0o777, 0o755)
        self.assertEqual(pg_dir.stat().st_mode & 0o777, 0o700)

        # Confirm docker was never invoked to start containers.
        self.assertFalse(self.docker_log.exists())

        # Re-running when .env already exists preserves the existing .env idempotently.
        before_bytes = env_path.read_bytes()
        rerun = self.run_setup('--non-interactive', '--secrets-file', str(secrets_path), '--no-start')
        self.assertEqual(rerun.returncode, 0)
        self.assertEqual(env_path.read_bytes(), before_bytes)

    def test_secrets_stdin_and_relative_secrets_file_default_to_no_start(self):
        stdin_payload = (
            'GEMINI_API_KEY=stdin-gemini-key\n'
            'CLOUDFLARE_TUNNEL_TOKEN=stdin-tunnel-token\n'
            'ELEVATED_ACTIONS_PIN=654321\n'
        )
        result = self.run_setup('--non-interactive', '--secrets-stdin', stdin_data=stdin_payload)
        self.assertEqual(result.returncode, 0, result.stderr)
        parsed = parse_env_file(self.project / '.env')
        self.assertEqual(parsed['COMPOSE_FILE'], 'compose.yaml:compose.tunnel.yaml')
        self.assertEqual(parsed['GEMINI_API_KEY'], 'stdin-gemini-key')
        self.assertFalse(self.docker_log.exists())

        # Verify relative --secrets-file resolves from caller's working directory, not dirname($0).
        (self.project / '.env').unlink()
        rel_secrets = self.write_secrets_file(stdin_payload, mode=0o600, name='rel-secrets.env')
        rel_result = self.run_setup(
            '--non-interactive',
            f'--secrets-file={rel_secrets.name}',
            cwd=self.root,
        )
        self.assertEqual(rel_result.returncode, 0, rel_result.stderr)
        self.assertEqual((self.project / '.env').stat().st_mode & 0o777, 0o600)

    def test_scenario_2_shared_tunnel_validates_dns_label_and_writes_shared_overlay(self):
        secrets_path = self.write_secrets_file(
            'SCENARIO=2\n'
            'GEMINI_API_KEY=shared-gemini-key\n'
            'ELEVATED_ACTIONS_PIN=112233\n'
            'WFS_PROXY_NETWORK=shared-cf-edge\n'
            'WFS_PROXY_ALIAS=wfs-home-proxy\n',
            mode=0o600,
        )
        result = self.run_setup('--non-interactive', '--secrets-file', str(secrets_path), '--no-start')
        self.assertEqual(result.returncode, 0, result.stderr)

        parsed = parse_env_file(self.project / '.env')
        self.assertEqual(parsed['COMPOSE_FILE'], 'compose.yaml:compose.shared-tunnel.yaml')
        self.assertEqual(parsed['WFS_PROXY_NETWORK'], 'shared-cf-edge')
        self.assertEqual(parsed['WFS_PROXY_ALIAS'], 'wfs-home-proxy')
        self.assertEqual(parsed['CLOUDFLARE_TUNNEL_TOKEN'], '')
        self.assertIn('http://wfs-home-proxy:80', result.stdout)

        # Invalid DNS labels and network names must fail cleanly without creating .env.
        (self.project / '.env').unlink()
        invalid_shared_cases = [
            ('empty-alias', 'cloudflare-proxy', ''),
            ('uppercase-alias', 'cloudflare-proxy', 'WFS-Prod-Proxy'),
            ('leading-hyphen', 'cloudflare-proxy', '-wfs-proxy'),
            ('trailing-hyphen', 'cloudflare-proxy', 'wfs-proxy-'),
            ('too-long-alias', 'cloudflare-proxy', 'a' * 64),
            ('underscore-alias', 'cloudflare-proxy', 'wfs_proxy'),
            ('invalid-network', '-bad-network', 'wfs-prod-proxy'),
            ('space-network', 'bad network', 'wfs-prod-proxy'),
        ]
        for label, network, alias in invalid_shared_cases:
            with self.subTest(case=label):
                bad_file = self.write_secrets_file(
                    f'SCENARIO=2\n'
                    f'GEMINI_API_KEY=shared-gemini-key\n'
                    f'ELEVATED_ACTIONS_PIN=112233\n'
                    f'WFS_PROXY_NETWORK={network}\n'
                    f'WFS_PROXY_ALIAS={alias}\n',
                    mode=0o600,
                )
                bad_res = self.run_setup('--non-interactive', '--secrets-file', str(bad_file), '--no-start')
                self.assertEqual(bad_res.returncode, 1)
                self.assertFalse((self.project / '.env').exists())

    def test_invalid_pin_or_unsafe_secret_chars_fail_without_leaving_env(self):
        invalid_payloads = {
            'short-pin': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=valid-key\n'
                'CLOUDFLARE_TUNNEL_TOKEN=valid-token\n'
                'ELEVATED_ACTIONS_PIN=123\n'
            ),
            'alpha-pin': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=valid-key\n'
                'CLOUDFLARE_TUNNEL_TOKEN=valid-token\n'
                'ELEVATED_ACTIONS_PIN=12345a\n'
            ),
            'hash-in-secret': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=key#withhash\n'
                'CLOUDFLARE_TUNNEL_TOKEN=valid-token\n'
                'ELEVATED_ACTIONS_PIN=123456\n'
            ),
            'dollar-in-secret': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=key$withdollar\n'
                'CLOUDFLARE_TUNNEL_TOKEN=valid-token\n'
                'ELEVATED_ACTIONS_PIN=123456\n'
            ),
            'space-in-secret': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=key with space\n'
                'CLOUDFLARE_TUNNEL_TOKEN=valid-token\n'
                'ELEVATED_ACTIONS_PIN=123456\n'
            ),
            'cr-in-secret': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=valid-key\n'
                'CLOUDFLARE_TUNNEL_TOKEN=token\rwithcr\n'
                'ELEVATED_ACTIONS_PIN=123456\n'
            ),
            'missing-tunnel-token-scenario-1': (
                'SCENARIO=1\n'
                'GEMINI_API_KEY=valid-key\n'
                'ELEVATED_ACTIONS_PIN=123456\n'
            ),
            'missing-gemini-key': (
                'SCENARIO=1\n'
                'CLOUDFLARE_TUNNEL_TOKEN=valid-token\n'
                'ELEVATED_ACTIONS_PIN=123456\n'
            ),
        }
        for name, payload in invalid_payloads.items():
            with self.subTest(case=name):
                secrets_path = self.write_secrets_file(payload, mode=0o600)
                result = self.run_setup('--non-interactive', '--secrets-file', str(secrets_path), '--no-start')
                self.assertEqual(result.returncode, 1)
                self.assertFalse((self.project / '.env').exists())

    def test_traefik_forwarded_proto_and_compose_non_root_volume_contracts(self):
        traefik = load_yaml_mapping(TEMPLATE_DIR / 'traefik.yml')
        middlewares = traefik['http']['middlewares']
        self.assertIn('cf-proto-https', middlewares)
        custom_req_headers = middlewares['cf-proto-https']['headers']['customRequestHeaders']
        self.assertEqual(custom_req_headers.get('X-Forwarded-Proto'), 'https')

        routers = traefik['http']['routers']
        for router_name in ('api', 'api-stream', 'pwa'):
            with self.subTest(router=router_name):
                self.assertIn(router_name, routers)
                router = routers[router_name]
                self.assertIn('web', router['entryPoints'])
                self.assertIn('cf-proto-https', router['middlewares'])

        compose = load_yaml_mapping(TEMPLATE_DIR / 'compose.yaml')
        services = compose['services']

        traefik_svc = services['traefik']
        self.assertIn('./traefik.yml:/etc/traefik/dynamic.yml:ro', traefik_svc['volumes'])

        api_svc = services['api']
        data_root = api_svc['environment']['DATA_ROOT']
        self.assertTrue(data_root.startswith('/'), f'Expected absolute DATA_ROOT, got {data_root!r}')
        self.assertIn(f'./data/app:{data_root}', api_svc['volumes'])

        # Non-root UID 1654 compatibility: compose either sets 1654 explicitly or inherits
        # the chiseled ASP.NET runtime image's non-root APP_UID (1654) without root override.
        configured_user = api_svc.get('user')
        if configured_user is not None:
            self.assertIn(str(configured_user), {'1654', '1654:1654'})
        dockerfile_text = API_DOCKERFILE.read_text(encoding='utf-8')
        self.assertIn('-chiseled AS base', dockerfile_text)
        prod_stage = dockerfile_text.split('FROM base AS production', 1)[1].split('FROM ', 1)[0]
        self.assertNotRegex(prod_stage, re.compile(r'^\s*USER\s+(root|0)\b', re.MULTILINE))

        postgres_svc = services['postgres']
        self.assertIn('./data/postgres:/var/lib/postgresql/data', postgres_svc['volumes'])


if __name__ == '__main__':
    unittest.main()
