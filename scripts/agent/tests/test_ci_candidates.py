"""Release reuse must bind success, source identity and both architecture artifacts."""
import importlib.util
import unittest
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[3]


class PipelineTests(unittest.TestCase):
    def test_public_demo_welcome_is_household_only_and_keeps_private_artifacts(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        job = jobs['pwa-e2e']
        steps = job['steps']
        matches = [step for step in steps if step.get('name') == 'Public Demo Welcome regression']
        self.assertEqual(len(matches), 1, 'The core public Demo journey needs a durable CI invocation')
        public = matches[0]
        self.assertEqual(public['if'], "matrix.suite == 'household'")
        self.assertEqual(public['env'], {'WFS_WELCOME_DEMO': 'true', 'WFS_WELCOME_SECRET': 'Swipe-Match-Cook'})
        self.assertEqual(public['working-directory'], 'pwa')
        self.assertEqual(public['run'], 'npm run test:e2e -- --config=e2e/welcome-demo.playwright.config.ts --output=test-results/welcome-demo')
        private = next(step for step in steps if step.get('name') == 'Run capability suite')
        self.assertEqual(private['run'], 'node ../scripts/ci/production-browser.cjs run --suites "$WFS_E2E_SUITE"')
        self.assertLess(steps.index(private), steps.index(public))
        self.assertEqual(job['env']['HEARTH_SECRET'], 'Paris-Montreal')
        self.assertNotIn('WFS_WELCOME_DEMO', job['env'])
        self.assertNotIn('WFS_WELCOME_SECRET', job['env'])
        self.assertEqual(sum('actions/download-artifact@' in step.get('uses', '') for step in steps), 1)

    def test_live_job_provisions_endpoint_drift_dependencies_before_browser_checks(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        steps = jobs['cooking-step-live']['steps']
        python = next((i for i, step in enumerate(steps) if 'actions/setup-python@' in step.get('uses', '')), None)
        task = next((i for i, step in enumerate(steps) if step.get('run') == 'npm install --global @go-task/cli@3.54.0'), None)
        tooling = next((i for i, step in enumerate(steps) if step.get('run') == 'task init:python'), None)
        live = next(i for i, step in enumerate(steps) if step.get('name') == 'Run required cooking live scenarios')
        self.assertIsNotNone(python, 'Live endpoint parity needs an explicit Python runtime')
        self.assertIsNotNone(task, 'The live grocery owner invokes the pinned Task CLI')
        self.assertIsNotNone(tooling, 'Task endpoint drift requires the repository .venv and pinned PyYAML')
        self.assertLess(python, tooling)
        self.assertLess(task, tooling)
        self.assertLess(tooling, live)

    def test_cooking_live_job_executes_all_required_cases_without_skips(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        self.assertIn('cooking-step-live', jobs, 'Opt-in cooking API/PostgreSQL browsers must execute in CI')
        job = jobs['cooking-step-live']
        self.assertEqual(job['runs-on'], 'ubuntu-latest')
        self.assertEqual(job['needs'], 'changes')
        self.assertIn("outputs.api == 'true'", job['if'])
        self.assertIn("outputs.pwa == 'true'", job['if'])
        self.assertIn('postgres', job['services'])
        env = job['env']
        self.assertEqual(env['WFS_CALENDAR_LIVE'], '1')
        self.assertEqual(env['NEXT_PUBLIC_API_BASE_URL'], '')
        self.assertIn('127.0.0.1', env['WFS_TEST_POSTGRES_CONNECTION'])
        steps = job['steps']
        sdk = next(step for step in steps if 'setup-dotnet' in step.get('uses', ''))
        self.assertIn('10.0.x', sdk['with']['dotnet-version'])
        self.assertTrue(any(step.get('run') == 'dotnet tool restore' for step in steps))
        self.assertTrue(any(step.get('run') == 'python3 -B scripts/agent/kiota_client.py check' for step in steps))
        build = next(step for step in steps if step.get('name') == 'Build isolated live PWA')
        self.assertEqual(build['run'], 'npm run build -- --webpack')
        self.assertEqual(build['working-directory'], 'pwa')
        run = next(step for step in steps if step.get('name') == 'Run required cooking live scenarios')
        self.assertIn('FullyQualifiedName~LiveBrowser_CookingStep', run['run'])
        self.assertIn('WFS_CANONICAL_BROWSER_ROOT', run['env'])
        self.assertIn('WFS_CANONICAL_EVIDENCE', run['env'])
        required = next(step for step in steps if step.get('name') == 'Require all cooking live results')
        self.assertIn('LiveBrowser_CookingStepSplitOil', required['run'])
        self.assertIn('LiveBrowser_CookingStepPartial', required['run'])
        self.assertIn('LiveBrowser_CookingStepScaling', required['run'])
        self.assertIn('LiveBrowser_CookingStepExhaustiveReduction', required['run'])
        self.assertIn('LiveBrowser_CookingReportRefresh', required['run'])
        self.assertIn('LiveBrowser_CookingStepInstructionGuard', required['run'])
        self.assertIn('LiveBrowser_CookingStepFraction', required['run'])
        self.assertIn('LiveBrowser_CookingStepRemainder', required['run'])
        self.assertIn('LiveBrowser_CookingStepPerItem', required['run'])
        self.assertIn('LiveBrowser_CookingStepFixed', required['run'])
        self.assertIn('LiveBrowser_CookingStepPreparedSix', required['run'])
        self.assertIn('LiveBrowser_CookingStepPreparedOriginal', required['run'])
        self.assertIn("== 'Passed'", required['run'])
        self.assertNotIn('continue-on-error', job)
        self.assertTrue(any(step.get('if') == 'always()' and 'upload-artifact' in step.get('uses', '') for step in steps))

    def test_cooking_context_live_owners_are_sequential_and_guarded(self):
        job = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']
        steps = job['steps']
        names = [step.get('name') for step in steps]
        prepared = next(step for step in steps if step.get('name') == 'Run required prepared context live')
        servings = next(step for step in steps if step.get('name') == 'Run required servings context live')
        guard = next(step for step in steps if step.get('name') == 'Require all cooking context live results')
        for step, owner, directory in [
            (prepared, 'PreparedSupperPostgresTests.LiveBrowser_PreparedSupperGeneratedClientAndTwoClientUpdates', 'prepared'),
            (servings, 'SupperServingsPostgresTests.LiveBrowser_SupperServingsGeneratedClientAndTwoClientUpdates', 'servings'),
        ]:
            self.assertIn('FullyQualifiedName=RecipeApi.Tests.Integration.' + owner, step['run'])
            self.assertNotIn('FullyQualifiedName~', step['run'])
            self.assertIn('native.trx', step['run'])
            self.assertIn('.task/cooking-context-live/' + directory, step['run'])
            self.assertIn('/.task/cooking-context-live/' + directory, step['env']['WFS_LIVE_ARTIFACT_ROOT'])
            self.assertNotIn('continue-on-error', step)
        self.assertLess(names.index(prepared['name']), names.index(servings['name']))
        self.assertLess(names.index(servings['name']), names.index(guard['name']))
        self.assertEqual(job['env']['WFS_CALENDAR_LIVE'], '1')
        self.assertIn('WFS_TEST_POSTGRES_CONNECTION', job['env'])
        for path in ['PreparedSupperPostgresTests.Live.cs', 'SupperServingsPostgresTests.Live.cs', 'SupperServingsPostgresTests.LiveRecovery.cs']:
            text = (ROOT / 'api/src/RecipeApi.Tests/Integration' / path).read_text()
            self.assertIn('--retries=0', text)
            self.assertIn('PLAYWRIGHT_JSON_OUTPUT_NAME', text)
        self.assertIn('await LiveSupperRecoveryJourney();', (ROOT / 'api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Live.cs').read_text())
        artifacts = next(step for step in steps if step.get('name') == 'Upload cooking live results')
        self.assertEqual(artifacts['if'], 'always()')
        self.assertIn('.task/cooking-live/', artifacts['with']['path'])
        self.assertIn('.task/cooking-context-live/', artifacts['with']['path'])
        self.assertIn('pwa/test-results/', artifacts['with']['path'], 'Retain the last failed browser attachments even before native success preservation')

    def test_cooking_context_guard_rejects_missing_skipped_failed_and_retried_results(self):
        import copy
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        guard = next(step['run'] for step in steps if step.get('name') == 'Require all cooking context live results')
        prepared = ['generated prepare persists Friday receipt, actual Tuesday history, raw SSE and mounted independent display; ordinary backup retains browser receipt'] + [
            f'real {fault} preparation boundary preserves authoritative outcome and cooking work without blind replay'
            for fault in ['lost', 'unavailable', 'negative', 'changed', 'recreated', 'publisher']]
        optional = 'canonical prepared correction retains recorded context through coherent refresh'
        browser_names = {
            'prepared/prepared-browser.json': prepared,
            'servings/original-browser.json': ['real dated detail, cooking and groceries share inputs across two independent clients'],
            'servings/recovery-browser.json': ['real lost portions, failed worker, guarded checks, baselines and movement converge'],
        }
        def spec(title, status='passed'):
            return {'title': title, 'tests': [{'status': 'skipped' if status == 'skipped' else 'expected', 'results': [{'status': status, 'retry': 0}]}]}
        reports = {name: {'suites': [{'specs': [spec(title) for title in titles]}]} for name, titles in browser_names.items()}
        reports['prepared/prepared-browser.json']['suites'][0]['specs'].append(spec(optional, 'skipped'))
        owners = {'prepared': 'LiveBrowser_PreparedSupperGeneratedClientAndTwoClientUpdates', 'servings': 'LiveBrowser_SupperServingsGeneratedClientAndTwoClientUpdates'}
        def run(reports, native=None, absent=None):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/cooking-context-live'
                for name, report in reports.items():
                    path = root / name
                    path.parent.mkdir(parents=True, exist_ok=True)
                    if name != absent:
                        path.write_text(json.dumps(report))
                for directory_name, owner in owners.items():
                    path = root / directory_name / 'native.trx'
                    tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                    outcome = (native or {}).get(directory_name, 'Passed')
                    if outcome != 'missing':
                        ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.' + owner, outcome=outcome)
                    ET.ElementTree(tree).write(path)
                return subprocess.run(['bash', '-c', guard], cwd=directory, capture_output=True, text=True)
        self.assertEqual(run(reports).returncode, 0)
        for owner in owners:
            for outcome in ['missing', 'NotExecuted', 'Failed']:
                with self.subTest(owner=owner, outcome=outcome):
                    self.assertNotEqual(run(reports, {owner: outcome}).returncode, 0)
        for name in reports:
            with self.subTest(report=name, kind='absent'):
                self.assertNotEqual(run(reports, absent=name).returncode, 0)
            for outcome in ['missing', 'skipped', 'failed', 'retry']:
                changed = copy.deepcopy(reports)
                specs = changed[name]['suites'][0]['specs']
                if outcome == 'missing':
                    specs.pop(0)
                elif outcome == 'retry':
                    specs[0]['tests'][0]['results'].append({'status': 'passed', 'retry': 1})
                else:
                    specs[0]['tests'][0]['results'][0]['status'] = outcome
                    specs[0]['tests'][0]['status'] = 'skipped' if outcome == 'skipped' else 'unexpected'
                with self.subTest(report=name, outcome=outcome):
                    self.assertNotEqual(run(changed).returncode, 0)
        changed = copy.deepcopy(reports)
        changed['prepared/prepared-browser.json']['suites'][0]['specs'][-1] = spec(optional)
        self.assertNotEqual(run(changed).returncode, 0, 'Optional canonical branch must remain explicitly accounted for by its separate owner')

    def test_grocery_live_owner_is_selected_and_guarded(self):
        job = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']
        steps = job['steps']
        run = next(step for step in steps if step.get('name') == 'Run required grocery checks live')
        guard = next(step for step in steps if step.get('name') == 'Require grocery checks live results')
        self.assertIn('FullyQualifiedName=RecipeApi.Tests.Integration.GroceryCheckConcurrencyPostgresTests.LiveBrowser_IndependentWaterRowsConvergeAndRejectOlderSnapshot', run['run'])
        self.assertIn('--results-directory .task/grocery-live/checks', run['run'])
        self.assertIn('/.task/grocery-live/checks', run['env']['WFS_LIVE_ARTIFACT_ROOT'])
        self.assertEqual(job['env']['WFS_CALENDAR_LIVE'], '1')
        self.assertLess(steps.index(run), steps.index(guard))
        self.assertNotIn('continue-on-error', run)
        text = (ROOT / 'api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Live.cs').read_text()
        for token in ['--workers=1', '--retries=0', 'PLAYWRIGHT_JSON_OUTPUT_NAME', 'WFS_LIVE_ARTIFACT_ROOT']:
            self.assertIn(token, text)
        upload = next(step for step in steps if step.get('name') == 'Upload cooking live results')
        self.assertIn('.task/grocery-live/', upload['with']['path'])

    def test_grocery_live_guard_fails_closed(self):
        import copy
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        guard = next(step['run'] for step in steps if step.get('name') == 'Require grocery checks live results')
        owner = 'RecipeApi.Tests.Integration.GroceryCheckConcurrencyPostgresTests.LiveBrowser_IndependentWaterRowsConvergeAndRejectOlderSnapshot'
        title = 'independent water checks converge and an older snapshot cannot restore stale checks'
        good = {'suites': [{'specs': [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': 'passed', 'retry': 0}]}]}]}]}
        def execute(report=good, native='Passed', missing=None, name=owner):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/checks'
                root.mkdir(parents=True)
                if missing != 'native':
                    tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                    if native != 'empty': ET.SubElement(results, 'UnitTestResult', testName=name, outcome=native)
                    ET.ElementTree(tree).write(root / 'native.trx')
                if missing != 'browser': (root / 'browser.json').write_text(json.dumps(report))
                return subprocess.run(['bash', '-c', guard], cwd=directory, capture_output=True, text=True).returncode
        self.assertEqual(execute(), 0)
        for kind in ['native', 'browser']:
            with self.subTest(missing=kind): self.assertNotEqual(execute(missing=kind), 0)
        for outcome in ['empty', 'NotExecuted', 'Failed']:
            with self.subTest(native=outcome): self.assertNotEqual(execute(native=outcome), 0)
        self.assertNotEqual(execute(name='another.owner'), 0)
        for outcome in ['empty', 'skipped', 'failed', 'retry', 'extra']:
            changed = copy.deepcopy(good)
            specs = changed['suites'][0]['specs']
            if outcome == 'empty': specs.clear()
            elif outcome == 'extra': specs.append(copy.deepcopy(specs[0]))
            elif outcome == 'retry': specs[0]['tests'][0]['results'].append({'status': 'passed', 'retry': 1})
            else:
                specs[0]['tests'][0]['status'] = 'skipped' if outcome == 'skipped' else 'unexpected'
                specs[0]['tests'][0]['results'][0]['status'] = outcome
            with self.subTest(browser=outcome): self.assertNotEqual(execute(report=changed), 0)

    def test_grocery_canonical_dependencies_are_selected_and_fail_closed(self):
        import copy
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next(step for step in steps if step.get('name') == 'Run required grocery canonical dependencies')
        guard = next(step for step in steps if step.get('name') == 'Require grocery canonical dependency results')
        names = ['LiveBrowser_CanonicalIngredientCorrection', 'LiveBrowser_CanonicalMixedIncompleteBaseline']
        titles = [
            'original correction, refresh recovery and concurrent grocery checks use the real generated client API and database',
            'mixed incomplete baseline keeps its grocery check when unknown demand becomes known while a separate proven increase resets',
        ]
        for name in names:
            self.assertIn('FullyQualifiedName=RecipeApi.Tests.Integration.CanonicalIngredientEditPostgresTests.' + name, run['run'])
        self.assertIn('--results-directory .task/grocery-live/canonical', run['run'])
        self.assertIn('/.task/grocery-live/canonical', run['env']['WFS_CANONICAL_EVIDENCE'])
        self.assertEqual(run['env']['WFS_CANONICAL_BROWSER_ROOT'], '${{ github.workspace }}')
        self.assertLess(steps.index(run), steps.index(guard))
        self.assertNotIn('continue-on-error', run)
        def execute(native='Passed', browser='passed', absent=None):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/canonical'; root.mkdir(parents=True)
                if absent != 'native':
                    tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                    for name in names[:0 if native == 'empty' else 2]:
                        ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientEditPostgresTests.' + name, outcome=native)
                    ET.ElementTree(tree).write(root / 'native.trx')
                for folder, title in zip(['correction', 'mixed'], titles):
                    if absent == folder: continue
                    (root / folder).mkdir()
                    result = {'status': browser, 'retry': 1 if browser == 'retry' else 0}
                    tests = [{'status': 'expected' if browser in ['passed', 'retry'] else 'unexpected', 'results': [result]}]
                    report = {'suites': [{'specs': [{'title': title, 'tests': tests}]}]}
                    if browser == 'extra': report['suites'][0]['specs'].append(copy.deepcopy(report['suites'][0]['specs'][0]))
                    (root / folder / 'browser-results.json').write_text(json.dumps(report))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        for missing in ['native', 'correction', 'mixed']:
            with self.subTest(missing=missing): self.assertNotEqual(execute(absent=missing), 0)
        for outcome in ['empty', 'NotExecuted', 'Failed']:
            with self.subTest(native=outcome): self.assertNotEqual(execute(native=outcome), 0)
        for outcome in ['skipped', 'failed', 'retry', 'extra']:
            with self.subTest(browser=outcome): self.assertNotEqual(execute(browser=outcome), 0)

    def test_absolute_producer_hosted_gate_rejects_missing_skipped_and_retried_evidence(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((s for s in steps if s.get('name') == 'Run required absolute-use canonical journey'), None)
        self.assertIsNotNone(run, 'Absolute producer needs actual hosted workflow/browser acceptance')
        self.assertIn('LiveBrowser_FreshAbsoluteCanonicalGroceries', run['run'])
        guard = next(s for s in steps if s.get('name') == 'Require absolute-use canonical journey results')
        titles = ['fresh URL canonical edit reaches two shoppers and dated groceries',
                  'fresh photo canonical edit keeps original media and reaches dated groceries',
                  'retained URL material becomes Ready after browser correction and reviewed import']
        def execute(native='Passed', browser='passed', absent=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/absolute'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshAbsoluteCanonicalGroceries', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                if not absent:
                    (root / 'fresh-absolute').mkdir()
                    specs = [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': browser, 'retry': int(browser == 'retry')}]}]} for title in titles]
                    (root / 'fresh-absolute/browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        self.assertNotEqual(execute(absent=True), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed', 'retry']:
            self.assertNotEqual(execute(browser=browser), 0)

    def test_multiple_absolute_producer_hosted_gate_rejects_missing_skipped_and_retried_evidence(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((s for s in steps if s.get('name') == 'Run required multiple-absolute-use canonical journey'), None)
        self.assertIsNotNone(run, 'Absolute producer needs actual hosted workflow/browser acceptance')
        self.assertIn('LiveBrowser_FreshMultipleAbsoluteCanonicalGroceries', run['run'])
        guard = next(s for s in steps if s.get('name') == 'Require multiple-absolute-use canonical journey results')
        titles = ['fresh URL multiple absolute uses retain independent proof through Cook refresh',
                  'fresh photo multiple absolute uses retain independent proof through Cook refresh',
                  'retained URL material becomes Ready after browser correction and reviewed import']
        def execute(native='Passed', browser='passed', absent=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/multiple-absolute'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshMultipleAbsoluteCanonicalGroceries', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                if not absent:
                    (root / 'fresh-multiple-absolute').mkdir()
                    specs = [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': browser, 'retry': int(browser == 'retry')}]}]} for title in titles]
                    (root / 'fresh-multiple-absolute/browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        self.assertNotEqual(execute(absent=True), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed', 'retry']:
            self.assertNotEqual(execute(browser=browser), 0)

    def test_fraction_producer_hosted_gate_rejects_missing_skipped_and_retried_evidence(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((s for s in steps if s.get('name') == 'Run required fraction-use canonical journey'), None)
        self.assertIsNotNone(run, 'Absolute producer needs actual hosted workflow/browser acceptance')
        self.assertIn('LiveBrowser_FreshFractionCanonicalGroceries', run['run'])
        guard = next(s for s in steps if s.get('name') == 'Require fraction-use canonical journey results')
        titles = ['fresh URL explicit half retains relative proof through Cook refresh',
                  'fresh photo explicit half retains relative proof through Cook refresh',
                  'retained URL material becomes Ready after browser correction and reviewed import']
        def execute(native='Passed', browser='passed', absent=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/fraction'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshFractionCanonicalGroceries', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                if not absent:
                    (root / 'fresh-fraction').mkdir()
                    specs = [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': browser, 'retry': int(browser == 'retry')}]}]} for title in titles]
                    (root / 'fresh-fraction/browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        self.assertNotEqual(execute(absent=True), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed', 'retry']:
            self.assertNotEqual(execute(browser=browser), 0)

    def test_remainder_producer_hosted_gate_rejects_missing_skipped_and_retried_evidence(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((s for s in steps if s.get('name') == 'Run required remainder-use canonical journey'), None)
        self.assertIsNotNone(run, 'Remainder producer needs actual hosted workflow/browser acceptance')
        self.assertIn('LiveBrowser_FreshRemainderCanonicalGroceries', run['run'])
        guard = next(s for s in steps if s.get('name') == 'Require remainder-use canonical journey results')
        titles = ['fresh URL explicit final remainder retains ordered proof through Cook refresh',
                  'fresh photo explicit final remainder retains ordered proof through Cook refresh',
                  'retained URL material becomes Ready after browser correction and reviewed import']
        def execute(native='Passed', browser='passed', absent=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/remainder'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshRemainderCanonicalGroceries', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                if not absent:
                    (root / 'fresh-remainder').mkdir()
                    specs = [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': browser, 'retry': int(browser == 'retry')}]}]} for title in titles]
                    (root / 'fresh-remainder/browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        self.assertNotEqual(execute(absent=True), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed', 'retry']:
            self.assertNotEqual(execute(browser=browser), 0)

    def test_e2e_has_four_suites_and_one_build(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        self.assertIn('pwa-build', jobs)
        self.assertIn('fromJSON', jobs['pwa-e2e']['strategy']['matrix']['suite'])
        self.assertFalse(jobs['pwa-e2e']['strategy']['fail-fast'])
        self.assertFalse(any('npm run build' in s.get('run', '')
                             for s in jobs['pwa-e2e']['steps']))

    def test_database_smoke_is_single_arch_and_packaging_is_release_only(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        self.assertNotIn('strategy', jobs['docker-smoke'])
        self.assertEqual(jobs['docker-smoke']['runs-on'], 'ubuntu-latest')
        workflow = yaml.safe_load((ROOT / '.github/workflows/container-candidate.yml').read_text())
        matrix = workflow['jobs']['build-smoke']['strategy']['matrix']['include']
        self.assertEqual({(m['arch'], m['runner']) for m in matrix},
                         {('amd64', 'ubuntu-24.04'), ('arm64', 'ubuntu-24.04-arm')})
        self.assertNotIn('container-candidate', (ROOT / '.github/workflows/ci.yml').read_text())

    def test_publish_never_builds_or_unconditionally_validates(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/publish-dockerhub.yml').read_text())['jobs']
        self.assertIn('resolve-candidate', jobs)
        self.assertIn('resolve-candidate', jobs['validate']['needs'])
        self.assertIn("run-id == ''", jobs['validate']['if'])
        for job in ('publish', 'publish-platforms'):
            for step in jobs.get(job, {}).get('steps', []):
                self.assertNotIn('docker/build-push-action', step.get('uses', ''))
                self.assertNotIn('npm run', step.get('run', ''))

    def test_database_and_container_inputs_select_smoke_without_packaging_every_pwa_change(self):
        import re
        text = (ROOT / '.github/workflows/validate.yml').read_text()
        pattern = re.search(r'echo "docker=\$\(selected \'(.*?)\'\)', text).group(1)
        for path in ['api/database/schema.sql', 'api/database/compatibility.sql',
                     'api/src/RecipeApi/Data/AppDbContext.cs', 'api/src/RecipeApi/Models/Recipe.cs',
                     'api/Dockerfile', 'docker/compose/apps.yml']:
            self.assertRegex(path, pattern)
        for path in ['pwa/src/app/(app)/planner/page.tsx', 'pwa/e2e/planner.spec.ts']:
            self.assertNotRegex(path, pattern)

    def test_completed_pdf_workflow_is_retired_and_identity_trigger_is_bounded(self):
        self.assertFalse((ROOT / '.github/workflows/pdf-preview-validation.yml').exists())
        text = (ROOT / '.github/workflows/install-identity-validation.yml').read_text()
        self.assertNotIn("'pwa/**'", text)
        for path in ['pwa/Dockerfile', 'pwa/src/app/manifest.json/**',
                     'pwa/src/lib/server/release-channel*', 'pwa/src/app/layout.tsx']:
            self.assertIn(path, text)


def helper():
    spec = importlib.util.spec_from_file_location('image_candidate', ROOT / 'scripts/ci/image-candidate.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CandidateIdentityTests(unittest.TestCase):
    def setUp(self):
        self.c = helper()
        self.sha = 'a' * 40
        self.repository = 'owner/repository'
        self.run = {'head_sha': self.sha, 'event': 'push', 'conclusion': 'success',
                    'status': 'completed', 'head_branch': 'main',
                    'head_repository': {'full_name': self.repository}}

    def eligible(self):
        return self.c.eligible(self.run, self.sha, 'stable', self.repository)

    def test_exact_successful_push_is_reusable_source_validation(self):
        self.assertTrue(self.eligible())

    def test_wrong_commit_pr_failure_incomplete_branch_and_fork_are_rejected(self):
        for field, value in [('head_sha', 'b' * 40), ('event', 'pull_request'),
                             ('conclusion', 'failure'), ('status', 'in_progress'),
                             ('head_branch', 'feature'), ('head_branch', None),
                             ('head_repository', {'full_name': 'fork/repository'})]:
            with self.subTest(field=field, value=value):
                original = self.run[field]
                self.run[field] = value
                self.assertFalse(self.eligible())
                self.run[field] = original

    def test_non_main_beta_validation_is_reusable_without_image_artifacts(self):
        self.run['head_branch'] = 'feature/test'
        self.assertTrue(self.c.eligible(self.run, self.sha, 'beta', self.repository))

    def test_archive_tampering_and_mismatched_metadata_are_rejected_before_load(self):
        import tempfile
        import copy
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            images = {}
            for service in self.c.SERVICES:
                path = directory / f'{service}.tar'
                path.write_bytes(b'fixture image bytes')
                images[service] = {'id': 'sha256:fixture', 'sha256': self.c.checksum(path)}
            metadata = {'schema': self.c.SCHEMA, 'revision': self.sha, 'channel': 'stable',
                        'arch': 'amd64', 'run_id': '123', 'images': images}
            self.c.verify_metadata(metadata, self.sha, 'stable', 'amd64', '123', directory)
            for field, wrong in [('revision', 'b' * 40), ('channel', 'beta'), ('arch', 'arm64'),
                                 ('run_id', '124'), ('schema', 0), ('images', {})]:
                with self.subTest(field=field):
                    changed = copy.deepcopy(metadata)
                    changed[field] = wrong
                    with self.assertRaises(ValueError):
                        self.c.verify_metadata(changed, self.sha, 'stable', 'amd64', '123', directory)
            (directory / 'api.tar').write_bytes(b'tampered')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                self.c.verify_metadata(metadata, self.sha, 'stable', 'amd64', '123', directory)

    def test_loaded_image_must_match_architecture_labels_and_image_id(self):
        import copy
        info = {'Architecture': 'amd64', 'Os': 'linux', 'Id': 'sha256:fixture',
                'Config': {'Labels': {'org.opencontainers.image.revision': self.sha,
                                      'io.whats-for-supper.channel': 'stable'}}}
        self.c.check_image(info, self.sha, 'stable', 'amd64', 'sha256:fixture')
        for field, value in [('Architecture', 'arm64'), ('Os', 'windows'), ('Id', 'sha256:wrong')]:
            changed = copy.deepcopy(info)
            changed[field] = value
            with self.assertRaises(ValueError):
                self.c.check_image(changed, self.sha, 'stable', 'amd64', 'sha256:fixture')
        with self.assertRaises(ValueError):
            self.c.check_image(info, self.sha, 'beta', 'amd64')


if __name__ == '__main__':
    unittest.main()
