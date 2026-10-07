"""Read-only Compose qualification and disposable, unpublished image/runtime matrix."""
import argparse
import html
from html.parser import HTMLParser
import json
import os
import platform
import re
from pathlib import Path
import subprocess
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / 'docker/compose/smoke.env'

def command(args, env=None):
    return subprocess.check_output(args, cwd=ROOT, env=env, text=True).strip()

def evidence_directory():
    directory = ROOT / '.task/identity-T3'
    directory.mkdir(parents=True, exist_ok=True)
    return directory

def compose():
    env = {k: v for k, v in os.environ.items() if not k.startswith('COMPOSE_')}
    for line in ENV_FILE.read_text().splitlines():
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            env[key] = value
    env.update(COMPOSE_DISABLE_ENV_FILE='1', WFS_VERSION='1.2.3-beta.1', TAG='1.2.3-beta.1',
               WFS_REGISTRY='brisebois', GEMINI_MODEL_ID_HERO='synthetic-model', DATA_ROOT='/tmp/wfs-identity-synthetic',
               CLOUDFLARE_TUNNEL_TOKEN='synthetic-test-only', ELEVATED_ACTIONS_PIN='1234')
    base = ['docker/compose/infrastructure.yml', 'docker/compose/apps.yml']
    combinations = [base, *[base + ['docker/compose/' + override + '.yml'] for override in
                           ['dev-overrides', 'ci-overrides', 'production', 'production-overrides']],
                    ['release-template/synology/compose.yaml']]
    results = []
    for value in [None, 'false', 'true', ' TRUE ', 'invalid']:
        for files in combinations:
            case = dict(env)
            if value is None:
                case.pop('DEMO_MODE', None)
            else:
                case['DEMO_MODE'] = value
            args = ['docker', 'compose', '-p', 'wfs-identity-check', '--env-file', str(ENV_FILE)]
            # No user dotenv inputs; missing case must override fixture's false equivalently.
            for file in files:
                args += ['-f', file]
            config = json.loads(command(args + ['config', '--format', 'json'], case))
            api = config['services']['api']['environment']['DEMO_MODE']
            pwa = config['services']['pwa']['environment']['DEMO_MODE']
            assert api == pwa == ('false' if value is None else value), (files, value, api, pwa)
            results.append({'files': files, 'value': value, 'status': 'passed'})
    (evidence_directory() / 'compose-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(f'passed: {len(results)} rendered Compose parity cases', flush=True)

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = None
        self.apple = None
        self.touch = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name') == 'apple-mobile-web-app-title':
            self.apple = attrs.get('content')
        if tag == 'link' and attrs.get('rel') == 'apple-touch-icon':
            self.touch = attrs.get('href')

def validate_architecture(architecture):
    if architecture == 'amd64' and os.environ.get('GITHUB_ACTIONS') != 'true':
        raise ValueError('amd64 image builds are permitted only in GitHub Actions')
    native = {'arm64': 'arm64', 'aarch64': 'arm64', 'x86_64': 'amd64', 'AMD64': 'amd64'}.get(platform.machine())
    if architecture != native:
        raise ValueError(f'Image qualification requires a native {architecture} runner; found {native}')

def images(architecture='arm64', channel=None):
    validate_architecture(architecture)
    command(['docker', 'info', '--format', '{{.ServerVersion}}'])
    source_revision = command(['git', 'rev-parse', 'HEAD'])
    results = []
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for channel in ([channel] if channel else ['stable', 'beta']):
        tag = f'wfs-identity-t3:{channel}-{architecture}'
        command(['docker', 'buildx', 'build', '--load', '--platform', 'linux/' + architecture,
                 '--target', 'production', '--build-arg', 'WFS_RELEASE_CHANNEL=' + channel,
                 '-t', tag, './pwa'])
        image = command(['docker', 'image', 'inspect', '--format', '{{.Id}}', tag])
        assert command(['docker', 'image', 'inspect', '--format', '{{.Architecture}}', tag]) == architecture
        baked = json.loads(command(['docker', 'run', '--rm', '--platform', 'linux/' + architecture,
                                    '--entrypoint', 'cat', image, '/app/release-channel.json']))
        assert baked == {'channel': channel}
        for demo in ['false', 'true']:
            name = 'wfs-id-t3-' + uuid.uuid4().hex[:10]
            try:
                command(['docker', 'run', '-d', '--name', name, '--platform', 'linux/' + architecture,
                         '-p', '127.0.0.1::3000', '-e', 'DEMO_MODE=' + demo,
                         '-e', 'WFS_RELEASE_CHANNEL=' + ('beta' if channel == 'stable' else 'stable'),
                         '-e', 'WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off', image])
                assert command(['docker', 'inspect', '--format', '{{.Image}}', name]) == image
                bindings = json.loads(command(['docker', 'inspect', '--format', '{{json .NetworkSettings.Ports}}', name]))
                origin = 'http://127.0.0.1:' + bindings['3000/tcp'][0]['HostPort']
                for attempt in range(60):
                    try:
                        with opener.open(origin + '/manifest.json', timeout=3) as response:
                            manifest = json.load(response)
                            assert 'no-store' in response.headers['Cache-Control']
                        break
                    except OSError:
                        if attempt == 59:
                            raise
                        time.sleep(1)
                expected = "What's for Supper?"
                variant = 'beta-demo' if channel == 'beta' and demo == 'true' else 'beta' if channel == 'beta' else 'demo' if demo == 'true' else 'production'
                prefix = '' if variant == 'production' else '/icons/install-v1/' + variant
                assert manifest['name'] == manifest['short_name'] == expected
                assert manifest['id'] == '/' and manifest['start_url'] == '/'
                for icon in manifest['icons']:
                    assert icon['src'].startswith(prefix + '/')
                    with opener.open(origin + icon['src'], timeout=5) as response:
                        assert response.status == 200
                with opener.open(urllib.request.Request(origin + '/welcome', headers={'User-Agent': 'Googlebot'}), timeout=20) as response:
                    page = response.read().decode()
                assert expected in [html.unescape(title) for title in re.findall(r'<title>(.*?)</title>', page)]
                assert manifest['share_target']['method'] == 'GET'
                metadata = Metadata()
                metadata.feed(page)
                assert metadata.apple == expected, (metadata.apple, expected)
                assert metadata.touch == prefix + '/apple-touch-icon.png'
                results.append({'architecture': architecture, 'channel': channel, 'demo': demo,
                                'image_id': image, 'source_revision': source_revision, 'status': 'passed'})
                print('passed:', results[-1], flush=True)
            finally:
                subprocess.run(['docker', 'rm', '-f', name], cwd=ROOT, check=False, stdout=subprocess.DEVNULL)
    (evidence_directory() / 'image-results.json').write_text(json.dumps(results, indent=2) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--images', action='store_true')
    parser.add_argument('--architecture', choices=['arm64', 'amd64'], default='arm64')
    parser.add_argument('--channel', choices=['stable', 'beta'])
    args = parser.parse_args()
    if args.images:
        validate_architecture(args.architecture)
    compose()
    if args.images:
        images(args.architecture, args.channel)
