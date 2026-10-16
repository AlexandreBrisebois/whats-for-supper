"""Runtime inputs for the audited documentation/test:agent/spec:check lane.

No persistent cache: every call re-reads bytes. OS libraries remain host inputs,
as in the full fingerprint. Extend this inventory when harness checks add tools.
"""
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import sys
import sysconfig

import test_ops


def package_root(executable, expected_name):
    for parent in executable.resolve().parents:
        manifest = parent / 'package.json'
        if manifest.is_file():
            if json.loads(manifest.read_text()).get('name') == expected_name:
                return parent
    raise ValueError(f'Cannot resolve installed {expected_name} package')


def runtime_inputs(checks):
    files = [Path(sys.executable), Path(sys.prefix) / 'pyvenv.cfg']
    tools = {}
    for name in ('python3', 'node', 'npm', 'task', 'git', 'sh', 'cat'):
        tool = shutil.which(name)
        if not tool:
            raise ValueError(f'Missing harness tool: {name}')
        tools[name] = Path(tool)
        files.append(Path(tool))
    # npm's audit fixture launches python3. Unknown interpreter environments
    # must not silently inherit this process's Python dependency inventory.
    if tools['python3'].resolve() != Path(sys.executable).resolve():
        raise ValueError('python3 and verifier use different interpreter installations')
    trees = [(package_root(tools['npm'], 'npm'), ())]
    if 'spec:check' in checks:
        tool = shutil.which('openspec')
        if not tool:
            raise ValueError('Missing harness tool: openspec')
        files.append(Path(tool))
        trees.append((package_root(Path(tool), '@fission-ai/openspec'), ()))
    # Include installed Python packages, not just requirements.txt or versions.
    # Bytecode is generated output; source/native extension changes remain covered.
    for key in ('stdlib', 'platstdlib', 'purelib', 'platlib'):
        root = Path(sysconfig.get_path(key)).resolve()
        if not root.is_dir():
            raise ValueError(f'Missing Python runtime directory: {key}')
        excludes = ('site-packages',) if key in ('stdlib', 'platstdlib') else ()
        if (root, excludes) not in trees:
            trees.append((root, excludes))
    library = sysconfig.get_config_var('LDLIBRARY')
    library_dir = sysconfig.get_config_var('LIBDIR')
    if library and library_dir:
        files.append(Path(library_dir) / library)
    return files, trees


def runtime_identity(checks):
    files, trees = runtime_inputs(checks)
    digest = hashlib.sha256(b'harness-runtime-v1\0')
    digest.update(json.dumps(dict(os.environ), sort_keys=True).encode())
    digest.update((sys.version + platform.platform()).encode())
    for path in sorted(set(files)):
        test_ops.add_file_to_digest(digest, Path('/'), str(path.absolute()))
    for root, excludes in sorted(trees):
        if not root.is_dir():
            raise ValueError('Runtime package directory disappeared')
        digest.update(str(root).encode())
        def fail_walk(error):
            raise error
        for directory, dirs, names in os.walk(root, onerror=fail_walk):
            dirs[:] = sorted(name for name in dirs if name not in ('__pycache__', *excludes))
            # Do not silently omit linked installed dependencies.
            if any((Path(directory) / name).is_symlink() for name in dirs):
                raise ValueError('Linked runtime package directories require full verification')
            for name in sorted(names):
                if not name.endswith(('.pyc', '.pyo')):
                    path = Path(directory) / name
                    test_ops.add_file_to_digest(digest, root, str(path.relative_to(root)))
    for directory in (test_ops.ROOT, test_ops.ROOT / 'pwa', test_ops.ROOT / 'api'):
        for path in sorted(directory.glob('.env*')):
            if path.is_file():
                test_ops.add_file_to_digest(digest, directory, path.name)
    return digest.hexdigest()
