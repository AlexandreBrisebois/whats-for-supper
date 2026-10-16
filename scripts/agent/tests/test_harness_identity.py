"""Harness runtime coverage must stay distinct from application qualification."""
import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import finish
import harness_identity
import test_ops


@contextlib.contextmanager
def installed_runtime():
    """Exercise real discovery and hashing against a disposable installation."""
    with tempfile.TemporaryDirectory() as tmp, contextlib.ExitStack() as stack:
        root = Path(tmp).resolve()
        def write(relative, content='original'):
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            return path
        tools = {name: write(f'bin/{name}')
                 for name in ('python3', 'node', 'task', 'git', 'sh', 'cat')}
        for command, package in [('npm', 'npm'), ('openspec', '@fission-ai/openspec')]:
            write(f'packages/{command}/package.json', '{"name":"' + package + '"}')
            entry = write(f'packages/{command}/bin/cli.js')
            tools[command] = root / 'bin' / command
            tools[command].symlink_to(entry)
            write(f'packages/{command}/node_modules/dependency/index.js')
        paths = {key: root / key for key in ('stdlib', 'platstdlib', 'purelib', 'platlib')}
        for key in paths:
            write(f'{key}/module.py')
        write('purelib/yaml/__init__.py')
        write('platlib/extension.so')
        write('venv/pyvenv.cfg')
        write('lib/libpython.so')
        stack.enter_context(mock.patch.object(harness_identity.shutil, 'which',
                                              side_effect=lambda name: str(tools[name]) if name in tools else None))
        stack.enter_context(mock.patch.object(harness_identity.sys, 'executable', str(tools['python3'])))
        stack.enter_context(mock.patch.object(harness_identity.sys, 'prefix', str(root / 'venv')))
        stack.enter_context(mock.patch.object(harness_identity.sysconfig, 'get_path', side_effect=paths.get))
        stack.enter_context(mock.patch.object(harness_identity.sysconfig, 'get_config_var',
                                              side_effect={'LDLIBRARY': 'libpython.so', 'LIBDIR': str(root / 'lib')}.get))
        stack.enter_context(mock.patch.object(test_ops, 'ROOT', root / 'repo'))
        yield root, tools


class HarnessIdentityTests(unittest.TestCase):
    def test_discovered_runtime_dependency_bytes_change_identity(self):
        with installed_runtime() as (root, tools):
            baseline = harness_identity.runtime_identity(['test:agent', 'spec:check'])
            dependencies = list(tools.values()) + [
                root / path for path in (
                    'venv/pyvenv.cfg', 'lib/libpython.so',
                    'stdlib/module.py', 'platstdlib/module.py',
                    'purelib/yaml/__init__.py', 'platlib/extension.so',
                    'packages/npm/node_modules/dependency/index.js',
                    'packages/openspec/node_modules/dependency/index.js')]
            for path in dependencies:
                with self.subTest(dependency=path.relative_to(root)):
                    original = path.read_bytes()
                    path.write_bytes(b'changed')
                    try:
                        self.assertNotEqual(baseline, harness_identity.runtime_identity(['test:agent', 'spec:check']))
                    finally:
                        path.write_bytes(original)
            self.assertEqual(baseline, harness_identity.runtime_identity(['test:agent', 'spec:check']))

    def test_openspec_dependency_is_selected_only_for_spec_checks(self):
        with installed_runtime() as (root, tools):
            before = harness_identity.runtime_identity(['test:agent'])
            (root / 'packages/openspec/node_modules/dependency/index.js').write_text('changed')
            self.assertEqual(before, harness_identity.runtime_identity(['test:agent']))
            del tools['openspec']
            self.assertEqual(before, harness_identity.runtime_identity(['test:agent']))
            with self.assertRaisesRegex(ValueError, 'Missing harness tool: openspec'):
                harness_identity.runtime_identity(['spec:check'])

    def test_unsupported_installations_are_rejected_by_real_discovery(self):
        for fault, message in [
            ('missing-tool', 'Missing harness tool: node'),
            ('different-python', 'different interpreter installations'),
            ('unknown-package', 'Cannot resolve installed npm package'),
            ('missing-python-library', 'Missing Python runtime directory: purelib'),
            ('linked-dependency', 'Linked runtime package directories'),
        ]:
            with self.subTest(fault=fault), installed_runtime() as (root, tools):
                if fault == 'missing-tool':
                    del tools['node']
                elif fault == 'different-python':
                    tools['python3'] = tools['node']
                elif fault == 'unknown-package':
                    (root / 'packages/npm/package.json').write_text('{"name":"unknown"}')
                elif fault == 'missing-python-library':
                    (root / 'purelib').rename(root / 'removed-purelib')
                else:
                    (root / 'packages/npm/node_modules/linked').symlink_to(root / 'purelib', target_is_directory=True)
                with self.assertRaisesRegex(ValueError, message):
                    harness_identity.runtime_identity(['test:agent'])

    def test_only_known_harness_checks_select_narrow_runtime(self):
        for paths, checks, expected in [
            (['scripts/agent/finish.py'], ['documentation', 'test:agent'], True),
            (['Taskfile.yml', 'docs/help.md'], ['documentation', 'test:agent'], True),
            (['openspec/config.yaml'], ['documentation', 'spec:check', 'test:agent'], True),
            (['pwa/source.ts', 'Taskfile.yml'], ['test:agent'], False),
            (['unknown.bin'], ['test:agent'], False),
            (['specs/openapi.yaml'], ['test:agent'], False),
            (['docs/help.md'], ['documentation'], False),
            (['Taskfile.yml'], ['test:agent', 'new-check'], False),
        ]:
            with self.subTest(paths=paths, checks=checks), mock.patch.dict('os.environ', {'WFS_TEST_SQLDEF': '0'}):
                self.assertEqual(finish.can_scope_harness(paths, checks), expected)
        with mock.patch.dict('os.environ', {'WFS_TEST_SQLDEF': '1'}):
            self.assertFalse(finish.can_scope_harness(['Taskfile.yml'], ['test:agent']))

    def test_harness_identity_covers_repository_and_runtime_but_not_app_installs(self):
        import harness_identity
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            runtime = root / 'runtime'
            runtime.mkdir()
            module = runtime / 'dependency.py'
            module.write_text('one')
            repo = root / 'repo'
            repo.mkdir()
            source = repo / 'source.py'
            source.write_text('one')
            app = root / 'node_modules'
            app.mkdir()
            installed = app / 'unrelated.js'
            installed.write_text('one')
            with mock.patch.object(harness_identity, 'runtime_inputs', return_value=([], [(runtime, ())])), \
                 mock.patch.object(finish, 'ROOT', repo), \
                 mock.patch.object(test_ops, 'get_changed_files', return_value=['source.py']), \
                 mock.patch.object(test_ops, 'runtime_identity', side_effect=AssertionError('full runtime used')):
                before = finish.harness_identity([])
                installed.write_text('two')
                self.assertEqual(before, finish.harness_identity([]))
                module.write_text('two')
                self.assertNotEqual(before, finish.harness_identity([]))
                module.write_text('one')
                source.write_text('two')
                self.assertNotEqual(before, finish.harness_identity([]))
                source.write_text('one')
                extra = runtime / 'new_dependency.py'
                extra.write_text('new')
                self.assertNotEqual(before, finish.harness_identity([]))
                extra.unlink()
                self.assertEqual(before, finish.harness_identity([]))
                module.unlink()
                self.assertNotEqual(before, finish.harness_identity([]))

    def test_harness_mutation_stops_later_checks(self):
        with mock.patch.object(finish, 'harness_identity', side_effect=['before', 'after']), \
             mock.patch.object(finish, 'identity', side_effect=AssertionError('unexpected full fingerprint')), \
             mock.patch.object(finish, 'run_check', return_value=('passed', 'ok')):
            results = finish.verify(['documentation', 'test:agent'], ['Taskfile.yml'])
        self.assertEqual(results['content']['runtime_scope'], 'harness')
        self.assertEqual(results['content']['status'], 'failed')
        self.assertEqual(results['test:agent']['status'], 'not-run')

    def test_runtime_disappearing_during_check_fails_without_fallback(self):
        with mock.patch.object(finish, 'harness_identity', side_effect=['before', ValueError('missing runtime')]), \
             mock.patch.object(finish, 'identity', side_effect=AssertionError('must not change identity scope')), \
             mock.patch.object(finish, 'run_check', return_value=('passed', 'ok')):
            results = finish.verify(['documentation', 'test:agent'], ['Taskfile.yml'])
        self.assertEqual(results['content']['status'], 'failed')
        self.assertEqual(results['test:agent']['status'], 'not-run')

    def test_application_and_unknown_verification_keep_full_identity(self):
        for path in ['pwa/source.ts', 'specs/openapi.yaml', 'unknown.bin']:
            with self.subTest(path=path), \
                 mock.patch.object(finish, 'identity', return_value='full') as full, \
                 mock.patch.object(finish, 'harness_identity', side_effect=AssertionError('must use full runtime')), \
                 mock.patch.object(finish, 'run_check', return_value=('passed', 'ok')):
                result = finish.verify(['documentation', 'test:agent'], [path, 'Taskfile.yml'])
            self.assertEqual(result['content']['runtime_scope'], 'full')
            self.assertEqual(full.call_count, 3)

    def test_package_discovery_fingerprints_package_dependencies_not_only_launcher(self):
        import harness_identity
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'package.json').write_text('{"name":"npm"}')
            entry = root / 'bin/npm-cli.js'
            entry.parent.mkdir()
            entry.write_text('launcher')
            self.assertEqual(harness_identity.package_root(entry, 'npm'), root.resolve())
            with self.assertRaises(ValueError):
                harness_identity.package_root(entry, '@fission-ai/openspec')

    def test_runtime_discovery_failure_falls_back_without_claiming_narrow_scope(self):
        import harness_identity
        with mock.patch.object(harness_identity, 'runtime_inputs', side_effect=ValueError('unsupported npm layout')), \
             mock.patch.object(finish, 'identity', return_value='full') as full, \
             mock.patch.object(finish, 'run_check', return_value=('passed', 'ok')), \
             contextlib.redirect_stdout(io.StringIO()):
            results = finish.verify(['test:agent'], ['Taskfile.yml'])
        self.assertEqual(results['content']['runtime_scope'], 'full')
        self.assertIn('unsupported npm layout', results['content']['runtime_scope_reason'])
        self.assertEqual(full.call_count, 2)
