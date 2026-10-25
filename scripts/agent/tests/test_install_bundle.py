"""Exercise shipped Compose selections without starting containers or using secrets."""
import json
import os
import pty
import select
import time
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[3]


class InstallBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name).resolve()
        bundle = self.directory / 'install.zip'
        subprocess.run(['bash', str(ROOT / 'scripts/release/build-install-zip.sh'),
                        '1.2.3', str(bundle)], check=True, capture_output=True)
        with ZipFile(bundle) as archive:
            archive.extractall(self.directory)
        self.project = self.directory / 'whats-for-supper'
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith(('COMPOSE_', 'WFS_', 'CLOUDFLARE_', 'POSTGRES_',
                                         'HEARTH_', 'GEMINI_', 'ELEVATED_', 'DEMO_'))}

    def configure(self, overlay, alias=None, token=None):
        values = {'POSTGRES_PASSWORD': 'test-password', 'HEARTH_SECRET': 'test-secret',
                  'GEMINI_API_KEY': 'test-key', 'ELEVATED_ACTIONS_PIN': '123456',
                  'COMPOSE_FILE': f'compose.yaml:{overlay}'}
        if alias:
            values['WFS_PROXY_ALIAS'] = alias
        if token:
            values['CLOUDFLARE_TUNNEL_TOKEN'] = token
        lines = (self.project / '.env.example').read_text().splitlines()
        for key, value in values.items():
            lines = [line for line in lines if not line.startswith(key + '=')]
            lines.append(f'{key}={value}')
        (self.project / '.env').write_text('\n'.join(lines) + '\n')

    def config(self, success=True):
        result = subprocess.run(['docker', 'compose', '-p', 'original-project',
                                 'config', '--format', 'json'], cwd=self.project,
                                env=self.env, text=True, capture_output=True)
        if not success:
            self.assertNotEqual(result.returncode, 0)
            return result
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_bundled_selection_uses_namespace_and_preserves_storage(self):
        self.configure('compose.tunnel.yaml', token='test-token')
        config = self.config()
        self.assertEqual(config['name'], 'original-project')
        self.assertEqual(config['services']['cloudflared']['network_mode'], 'service:traefik')
        self.assertNotIn('cloudflare-proxy', config['networks'])
        self.assertEqual(config['services']['api']['volumes'][0]['source'],
                         str(self.project / 'data/app'))
        self.assertEqual(config['services']['postgres']['volumes'][0]['source'],
                         str(self.project / 'data/postgres'))

    def test_shared_selection_needs_no_token_and_only_shares_proxy(self):
        for alias in ('wfs-demo-proxy', 'wfs-beta-proxy', 'wfs-prod-proxy'):
            self.configure('compose.shared-tunnel.yaml', alias=alias)
            config = self.config()
            self.assertNotIn('cloudflared', config['services'])
            shared = config['networks']['cloudflare-proxy']
            self.assertTrue(shared['external'])
            self.assertEqual(shared['name'], 'cloudflare-proxy')
            for name, service in config['services'].items():
                if name == 'traefik':
                    self.assertEqual(service['networks']['cloudflare-proxy']['aliases'], [alias])
                    self.assertIn('edge', service['networks'])
                else:
                    self.assertNotIn('cloudflare-proxy', service['networks'])
            self.assertEqual(config['services']['postgres']['volumes'][0]['source'],
                             str(self.project / 'data/postgres'))

    def test_shared_selection_requires_explicit_alias(self):
        self.configure('compose.shared-tunnel.yaml')
        result = self.config(success=False)
        self.assertIn('WFS_PROXY_ALIAS', result.stderr)

    def run_interactive(self, script, answers, args=(), pull_fails=False):
        tools = self.directory / 'bin'
        tools.mkdir(exist_ok=True)
        docker = tools / 'docker'
        docker.write_text('#!/bin/sh\n'
                          'echo "$*" >> "$CALL_LOG"\n'
                          'case "$*" in\n'
                          '  info*) exit 1;;\n'
                          '  *pull*) exit "${PULL_EXIT:-0}";;\n'
                          'esac\nexit 0\n')
        docker.chmod(0o755)
        log = self.directory / 'calls'
        env = dict(self.env, PATH=str(tools) + ':' + self.env['PATH'],
                   CALL_LOG=str(log), PULL_EXIT='1' if pull_fails else '0')
        # Feed one answer after its prompt. Hidden read prompts can discard
        # pre-fed terminal input on macOS; a pipe does not exercise -t 0.
        prompts = ['Type UPDATE to proceed:']
        if script == 'setup.sh':
            prompts = ['Tunnel setup', 'Gemini API key:']
            if answers.startswith('1\n'):
                prompts.append('Cloudflare Tunnel token:')
            prompts.append('Choose an administrator PIN')
            if answers.startswith('2\n'):
                prompts.extend(['Existing Docker network', 'Unique proxy alias'])
        replies = answers.splitlines()
        master, slave = pty.openpty()
        output = b''
        try:
            process = subprocess.Popen(['bash', script, *args], cwd=self.project,
                                       env=env, stdin=slave, stdout=slave, stderr=slave)
            os.close(slave)
            slave = None
            pending = 0
            deadline = time.monotonic() + 15
            while process.poll() is None and time.monotonic() < deadline:
                if select.select([master], [], [], 0.1)[0]:
                    try:
                        output += os.read(master, 65536)
                    except OSError:
                        break
                if pending < len(prompts) and prompts[pending].encode() in output:
                    os.write(master, (replies[pending] + '\n').encode())
                    pending += 1
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                self.fail('Interactive helper did not finish: ' + output.decode())
            while select.select([master], [], [], 0)[0]:
                try:
                    chunk = os.read(master, 65536)
                except OSError:
                    break
                if not chunk:
                    break
                output += chunk
        finally:
            if slave is not None:
                os.close(slave)
            os.close(master)
        return process.returncode, output.decode(), log.read_text() if log.exists() else ''

    def test_setup_persists_selected_overlay_without_shared_token(self):
        for scenario, answers, overlay in [
            ('shared', '2\ntest-key\n123456\ncloudflare-proxy\nwfs-demo-proxy\n',
             'compose.shared-tunnel.yaml'),
            ('bundled', '1\ntest-key\ntest-token\n123456\n', 'compose.tunnel.yaml'),
        ]:
            with self.subTest(scenario=scenario):
                env_file = self.project / '.env'
                env_file.unlink(missing_ok=True)
                code, output, _ = self.run_interactive('setup.sh', answers)
                self.assertEqual(code, 0, output)
                config = env_file.read_text()
                self.assertIn('COMPOSE_FILE=compose.yaml:' + overlay, config)
                if scenario == 'shared':
                    self.assertIn('WFS_PROXY_ALIAS=wfs-demo-proxy', config)
                    self.assertNotIn('CLOUDFLARE_TUNNEL_TOKEN=test-token', config)
                self.assertEqual(env_file.stat().st_mode & 0o777, 0o600)

    def test_update_validates_selected_overlay_before_changing_version(self):
        self.configure('compose.shared-tunnel.yaml', alias='wfs-prod-proxy')
        env_file = self.project / '.env'
        env_file.write_text(env_file.read_text().replace('WFS_VERSION=1.2.3', 'WFS_VERSION=1.2.2'))
        original = env_file.read_bytes()
        overlay = self.project / 'compose.shared-tunnel.yaml'
        overlay.write_text(overlay.read_text() + '\n# private customization\n')
        evidence = self.directory / 'backup.txt'
        evidence.write_text('synthetic backup evidence')
        code, output, calls = self.run_interactive(
            'update.sh', 'UPDATE\n', (str(self.directory / 'install.zip'), str(evidence)))
        self.assertNotEqual(code, 0)
        self.assertIn('overlay', output.lower())
        self.assertEqual(env_file.read_bytes(), original)
        self.assertNotIn('pull', calls)
        self.assertNotIn('up -d', calls)

    def test_update_pull_failure_restores_env_and_keeps_shared_selection(self):
        self.configure('compose.shared-tunnel.yaml', alias='wfs-prod-proxy')
        env_file = self.project / '.env'
        env_file.write_text(env_file.read_text().replace('WFS_VERSION=1.2.3', 'WFS_VERSION=1.2.2'))
        original = env_file.read_bytes()
        evidence = self.directory / 'backup.txt'
        evidence.write_text('synthetic backup evidence')
        code, output, calls = self.run_interactive(
            'update.sh', 'UPDATE\n', (str(self.directory / 'install.zip'), str(evidence)),
            pull_fails=True)
        self.assertNotEqual(code, 0)
        self.assertIn('Image pull failed', output)
        self.assertEqual(env_file.read_bytes(), original)
        self.assertIn('-f compose.yaml -f compose.shared-tunnel.yaml', calls)
        self.assertNotIn('up -d', calls)

    def test_bundle_contains_independent_connector_and_agent_guide(self):
        connector = self.project / 'cloudflared'
        self.assertTrue((self.project / 'docs/install/agent-install.md').is_file())
        self.assertIn('(docs/install/cloudflare.md)', (self.project / 'README.md').read_text())
        shutil.copy(connector / '.env.example', connector / '.env')
        with (connector / '.env').open('a') as file:
            file.write('\nCLOUDFLARE_TUNNEL_TOKEN=test-token\n')
        result = subprocess.run(['docker', 'compose', 'config', '--format', 'json'],
                                cwd=connector, env=self.env, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        config = json.loads(result.stdout)
        self.assertEqual(list(config['services']), ['cloudflared'])
        self.assertEqual(config['networks']['cloudflare-proxy']['name'], 'cloudflare-proxy')
        service = config['services']['cloudflared']
        self.assertNotIn('network_mode', service)
        self.assertFalse(service.get('ports'))
        self.assertFalse(service.get('volumes'))


if __name__ == '__main__':
    unittest.main()
