#!/usr/bin/env python3
"""Resolve successful source checks; archive and promote smoke-tested images."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

SERVICES = ('api', 'pwa', 'migration')
REPOS = {s: f'docker.io/brisebois/whats-for-supper-{s if s != "migration" else "db-migration"}'
         for s in SERVICES}
SCHEMA = 1


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def image_ref(service, revision, channel, arch):
    return f'wfs-ci-{service}:{revision}-{channel}-{arch}'


def eligible(run_info, revision, channel, repository):
    branch = run_info.get('head_branch')
    return (run_info.get('head_sha') == revision
            and run_info.get('event') == 'push'
            and run_info.get('conclusion') == 'success'
            and run_info.get('status') == 'completed'
            and run_info.get('head_repository', {}).get('full_name') == repository
            and bool(branch)
            and ('stable' if branch == 'main' else 'beta') == channel)


def api(path):
    request = urllib.request.Request(f'https://api.github.com/repos/{os.environ["GITHUB_REPOSITORY"]}/{path}',
                                    headers={'Authorization': f'Bearer {os.environ["GH_TOKEN"]}',
                                             'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def find_validation(revision, channel):
    # Exact-SHA endpoint and push-only selection exclude PR merge successes.
    runs = api(f'actions/workflows/ci.yml/runs?head_sha={revision}&event=push&status=success&per_page=100')
    for item in runs['workflow_runs']:
        if eligible(item, revision, channel, os.environ['GITHUB_REPOSITORY']):
            return str(item['id'])
    return ''


def compose(revision, channel, arch, directory):
    directory.mkdir(parents=True, exist_ok=True)
    refs = {service: {'image': image_ref(service, revision, channel, arch), 'pull_policy': 'never'}
            for service in SERVICES}
    (directory / 'compose.json').write_text(json.dumps({'services': refs}))


def inspect(ref):
    return json.loads(run('docker', 'image', 'inspect', ref))[0]


def check_image(info, revision, channel, arch, image_id=None):
    labels = info.get('Config', {}).get('Labels', {})
    if (info.get('Architecture') != arch or info.get('Os') != 'linux'
            or labels.get('org.opencontainers.image.revision') != revision
            or labels.get('io.whats-for-supper.channel') != channel
            or (image_id is not None and info.get('Id') != image_id)):
        raise ValueError('Candidate image platform, revision, channel or ID mismatch')


def archive(revision, channel, arch, directory):
    metadata = {'schema': SCHEMA, 'revision': revision, 'channel': channel, 'arch': arch,
                'run_id': os.environ['GITHUB_RUN_ID'], 'images': {}}
    for service in SERVICES:
        ref = image_ref(service, revision, channel, arch)
        info = inspect(ref)
        check_image(info, revision, channel, arch)
        path = directory / f'{service}.tar'
        subprocess.run(['docker', 'save', '--output', str(path), ref], check=True)
        metadata['images'][service] = {'id': info['Id'], 'sha256': checksum(path)}
    (directory / 'candidate.json').write_text(json.dumps(metadata, indent=2) + '\n')


def verify_metadata(metadata, revision, channel, arch, run_id, directory):
    expected = {'schema': SCHEMA, 'revision': revision, 'channel': channel,
                'arch': arch, 'run_id': str(run_id)}
    if any(metadata.get(k) != v for k, v in expected.items()) or set(metadata.get('images', {})) != set(SERVICES):
        raise ValueError('Candidate source/run/schema/image inventory mismatch')
    for service, image in metadata['images'].items():
        if checksum(directory / f'{service}.tar') != image['sha256']:
            raise ValueError(f'Candidate archive checksum mismatch: {service}')


def publish(revision, channel, arch, directory, run_id):
    metadata = json.loads((directory / 'candidate.json').read_text())
    verify_metadata(metadata, revision, channel, arch, run_id, directory)
    refs = {}
    for service in SERVICES:
        subprocess.run(['docker', 'load', '--input', str(directory / f'{service}.tar')], check=True)
        ref = image_ref(service, revision, channel, arch)
        info = inspect(ref)
        check_image(info, revision, channel, arch, metadata['images'][service]['id'])
        target = f'{REPOS[service]}:candidate-{os.environ["GITHUB_RUN_ID"]}-{os.environ["GITHUB_RUN_ATTEMPT"]}-{arch}'
        subprocess.run(['docker', 'tag', ref, target], check=True)
        subprocess.run(['docker', 'push', target], check=True)
        info = inspect(target)
        digest = next(d for d in info['RepoDigests'] if d.split('@')[0].removeprefix('docker.io/')
                      == REPOS[service].removeprefix('docker.io/'))
        refs[service] = digest
    (directory / f'published-{arch}.json').write_text(json.dumps(refs))


def manifests(directory, version):
    # Both native smoke/publish jobs must succeed before any final tag exists.
    platforms = [json.loads((directory / f'published-{a}.json').read_text()) for a in ('amd64', 'arm64')]
    for service in SERVICES:
        refs = [p[service] for p in platforms]
        if any(not re.fullmatch(re.escape(REPOS[service].removeprefix('docker.io/')) + r'@sha256:[0-9a-f]{64}',
                                ref.removeprefix('docker.io/')) for ref in refs):
            raise ValueError('Unexpected candidate registry digest')
        subprocess.run(['docker', 'buildx', 'imagetools', 'create', '--tag',
                        f'{REPOS[service]}:{version}', *refs], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['find', 'compose', 'archive', 'publish', 'manifests'])
    parser.add_argument('--revision', default=os.environ.get('REVISION', ''))
    parser.add_argument('--channel', choices=['stable', 'beta'], default=os.environ.get('CHANNEL', 'beta'))
    parser.add_argument('--arch', choices=['amd64', 'arm64'], default=os.environ.get('ARCH', 'amd64'))
    parser.add_argument('--directory', type=Path, default=Path('.task/container-candidate'))
    parser.add_argument('--run-id', default=os.environ.get('CANDIDATE_RUN_ID', ''))
    parser.add_argument('--version', default=os.environ.get('VERSION', ''))
    args = parser.parse_args()
    if args.command != 'manifests' and not re.fullmatch('[0-9a-f]{40}', args.revision):
        parser.error('A full commit SHA is required')
    if args.command == 'find':
        found = find_validation(args.revision, args.channel)
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write(f'run-id={found}\n')
    elif args.command == 'manifests':
        if not re.fullmatch(r'\d+\.\d+\.\d+(?:-beta\.[1-9]\d*)?', args.version):
            parser.error('Invalid release version')
        manifests(args.directory, args.version)
    elif args.command == 'publish':
        publish(args.revision, args.channel, args.arch, args.directory, args.run_id)
    else:
        globals()[args.command](args.revision, args.channel, args.arch, args.directory)


if __name__ == '__main__':
    main()
