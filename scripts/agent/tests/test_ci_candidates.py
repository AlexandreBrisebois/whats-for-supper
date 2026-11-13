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

    def test_fixed_producer_hosted_gate_rejects_missing_skipped_and_retried_evidence(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((s for s in steps if s.get('name') == 'Run required fixed-use canonical journey'), None)
        self.assertIsNotNone(run, 'Fixed producer needs actual hosted workflow/browser acceptance')
        self.assertIn('LiveBrowser_FreshFixedCanonicalGroceries', run['run'])
        guard = next(s for s in steps if s.get('name') == 'Require fixed-use canonical journey results')
        titles = ['fresh URL explicit fixed use survives correction and coherent Cook refresh',
                  'fresh photo explicit fixed use survives correction and coherent Cook refresh',
                  'retained URL material becomes Ready after browser correction and reviewed import']
        def execute(native='Passed', browser='passed', absent=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/fixed'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshFixedCanonicalGroceries', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                if not absent:
                    (root / 'fresh-fixed').mkdir()
                    specs = [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': browser, 'retry': int(browser == 'retry')}]}]} for title in titles]
                    (root / 'fresh-fixed/browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        self.assertNotEqual(execute(absent=True), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed', 'retry']:
            self.assertNotEqual(execute(browser=browser), 0)

    def test_per_item_producer_hosted_gate_rejects_missing_skipped_and_retried_evidence(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((s for s in steps if s.get('name') == 'Run required per-item-use canonical journey'), None)
        self.assertIsNotNone(run, 'Per-item producer needs actual hosted workflow/browser acceptance')
        self.assertIn('LiveBrowser_FreshPerItemCanonicalGroceries', run['run'])
        guard = next(s for s in steps if s.get('name') == 'Require per-item-use canonical journey results')
        titles = ['fresh URL per-item use scales the count and retains a fixed dose through correction',
                  'fresh photo per-item use scales the count and retains a fixed dose through correction',
                  'retained URL material becomes Ready after browser correction and reviewed import']
        def execute(native='Passed', browser='passed', absent=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/per-item'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshPerItemCanonicalGroceries', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                if not absent:
                    (root / 'fresh-per-item').mkdir()
                    specs = [{'title': title, 'tests': [{'status': 'expected', 'results': [{'status': browser, 'retry': int(browser == 'retry')}]}]} for title in titles]
                    (root / 'fresh-per-item/browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        self.assertNotEqual(execute(absent=True), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed', 'retry']:
            self.assertNotEqual(execute(browser=browser), 0)


    def test_declared_package_hosted_gate_requires_both_locales_without_skips_or_retries(self):
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        run = next((step for step in steps if step.get('name') == 'Run required declared-package canonical journey'), None)
        self.assertIsNotNone(run, 'Ordinary package input needs its real native owner in hosted qualification')
        self.assertIn('LiveBrowser_CanonicalDeclaredPackages', run['run'])
        guard = next(step for step in steps if step.get('name') == 'Require declared-package canonical journey results')
        def execute(native='Passed', browser='passed', retry=0, missing=None, extra=False, wrong_title=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/package-input'; root.mkdir(parents=True)
                tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                ET.SubElement(results, 'UnitTestResult', testName='RecipeApi.Tests.Integration.CanonicalIngredientEditPostgresTests.LiveBrowser_CanonicalDeclaredPackages', outcome=native)
                ET.ElementTree(tree).write(root / 'native.trx')
                for locale in ['en', 'fr']:
                    path = root / 'packages' / locale; path.mkdir(parents=True)
                    if missing != locale:
                        title = f'declared package {locale} uses ordinary Save and fixed capacity across portions'
                        specs = [{'title': 'wrong journey' if wrong_title else title, 'tests': [{
                            'status': 'expected' if browser == 'passed' else browser,
                            'results': [{'status': browser, 'retry': retry}]}]}]
                        if extra: specs.append(specs[0])
                        (path / 'browser-results.json').write_text(json.dumps({'suites': [{'specs': specs}]}))
                    if missing != 'persisted':
                        (path / 'persisted-result.json').write_text(json.dumps({'content': {}, 'rows': [], 'checks': {}, 'operations': 1}))
                return subprocess.run(['bash', '-c', guard['run']], cwd=directory, capture_output=True).returncode
        self.assertEqual(execute(), 0)
        for native in ['Failed', 'NotExecuted']:
            self.assertNotEqual(execute(native=native), 0)
        for browser in ['skipped', 'failed']:
            self.assertNotEqual(execute(browser=browser), 0)
        self.assertNotEqual(execute(retry=1), 0)
        for missing in ['en', 'fr', 'persisted']:
            self.assertNotEqual(execute(missing=missing), 0)
        self.assertNotEqual(execute(extra=True), 0)
        self.assertNotEqual(execute(wrong_title=True), 0)

    def test_exact_display_hosted_gate_runs_one_dedicated_native_owner(self):
        job = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']
        steps = job['steps']
        runs = [step for step in steps if step.get('name') == 'Run required exact-display canonical journey']
        self.assertEqual(len(runs), 1, 'Exact public display needs its dedicated actual native CI owner')
        run = runs[0]
        owner = 'RecipeApi.Tests.Integration.CanonicalIngredientEditPostgresTests.LiveBrowser_CanonicalExactDisplay'
        self.assertIn('FullyQualifiedName=' + owner, run['run'])
        self.assertNotIn('FullyQualifiedName~', run['run'])
        self.assertIn('trx;LogFileName=native.trx', run['run'])
        self.assertIn('--results-directory .task/grocery-live/exact-display-input', run['run'])
        self.assertEqual(run['env']['WFS_CANONICAL_BROWSER_ROOT'], '${{ github.workspace }}')
        self.assertEqual(run['env']['WFS_CANONICAL_EVIDENCE'], '${{ github.workspace }}/.task/grocery-live/exact-display-input')
        self.assertNotIn('continue-on-error', run)
        self.assertNotIn('continue-on-error', job)
        guards = [step for step in steps if step.get('name') == 'Require exact-display canonical journey results']
        self.assertEqual(len(guards), 1, 'Exact display native and both locale receipts need an explicit never-skip guard')
        self.assertNotIn('continue-on-error', guards[0])
        upload = next(step for step in steps if step.get('name') == 'Upload cooking live results')
        self.assertEqual(upload['if'], 'always()')
        self.assertIn('.task/grocery-live/', upload['with']['path'])
        self.assertLess(steps.index(run), steps.index(guards[0]))
        self.assertLess(steps.index(guards[0]), steps.index(upload))

    def test_exact_display_hosted_guard_rejects_incomplete_or_nonpassing_actual_receipts(self):
        import copy
        import json
        import subprocess
        import tempfile
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        guards = [step for step in steps if step.get('name') == 'Require exact-display canonical journey results']
        self.assertEqual(len(guards), 1, 'Missing actual exact-display guard is the intended preimplementation red')
        guard = guards[0]['run']
        owner = 'RecipeApi.Tests.Integration.CanonicalIngredientEditPostgresTests.LiveBrowser_CanonicalExactDisplay'
        good_native = [(owner, 'Passed')]
        good_reports = {locale: {'suites': [{'specs': [{
            'title': f'exact display {locale} preserves original fractions and coherent dated refresh',
            'tests': [{'status': 'expected', 'results': [{'status': 'passed', 'retry': 0}]}]
        }]}]} for locale in ['en', 'fr']}
        good_receipts = {locale: {'content': {}, 'rows': [], 'checks': {}, 'operations': 1} for locale in ['en', 'fr']}

        def execute(native=None, reports=None, receipts=None, missing=None, malformed=None):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/exact-display-input'
                root.mkdir(parents=True)
                if missing != 'native':
                    tree = ET.Element('TestRun')
                    results = ET.SubElement(tree, 'Results')
                    for name, outcome in good_native if native is None else native:
                        ET.SubElement(results, 'UnitTestResult', testName=name, outcome=outcome)
                    ET.ElementTree(tree).write(root / 'native.trx')
                for locale in ['en', 'fr']:
                    path = root / 'exact-display' / locale
                    path.mkdir(parents=True)
                    if missing != locale + '-browser':
                        report = (good_reports if reports is None else reports)[locale]
                        (path / 'browser-results.json').write_text('{' if malformed == locale + '-browser' else json.dumps(report))
                    if missing != locale + '-persisted':
                        receipt = (good_receipts if receipts is None else receipts)[locale]
                        (path / 'persisted-result.json').write_text('{' if malformed == locale + '-persisted' else json.dumps(receipt))
                return subprocess.run(['bash', '-c', guard], cwd=directory, capture_output=True).returncode

        self.assertEqual(execute(), 0, 'One passed native owner and both exact locale receipts must be admissible')
        nested = copy.deepcopy(good_reports)
        nested['fr']['suites'] = [{'suites': nested['fr']['suites']}]
        self.assertEqual(execute(reports=nested), 0, 'Guard must inspect nested actual Playwright suites')
        for label, native in [
            ('missing-native', []), ('wrong-owner', [(owner + 'Other', 'Passed')]),
            ('native-not-executed', [(owner, 'NotExecuted')]), ('native-failed', [(owner, 'Failed')]),
            ('duplicate-native', good_native + good_native), ('extra-native-owner', good_native + [(owner + 'Other', 'Passed')]),
        ]:
            with self.subTest(fault=label):
                self.assertNotEqual(execute(native=native), 0)
        self.assertNotEqual(execute(missing='native'), 0)
        for locale in ['en', 'fr']:
            for kind in ['browser', 'persisted']:
                with self.subTest(missing=locale + '-' + kind):
                    self.assertNotEqual(execute(missing=locale + '-' + kind), 0)
                with self.subTest(malformed=locale + '-' + kind):
                    self.assertNotEqual(execute(malformed=locale + '-' + kind), 0)
            for label in ['empty', 'wrong-title', 'extra', 'duplicate', 'not-executed', 'skipped', 'failed', 'retried', 'multiple-attempts', 'unexpected-status']:
                reports = copy.deepcopy(good_reports)
                specs = reports[locale]['suites'][0]['specs']
                test = specs[0]['tests'][0]
                if label == 'empty':
                    specs.clear()
                elif label == 'wrong-title':
                    specs[0]['title'] = 'a different ingredient journey'
                elif label in ['extra', 'duplicate']:
                    specs.append(copy.deepcopy(specs[0]))
                    if label == 'extra':
                        specs[-1]['title'] = 'extra unrelated journey'
                elif label == 'not-executed':
                    test['results'] = []
                elif label == 'skipped':
                    test['status'] = 'skipped'
                    test['results'][0]['status'] = 'skipped'
                elif label == 'failed':
                    test['status'] = 'unexpected'
                    test['results'][0]['status'] = 'failed'
                elif label == 'retried':
                    test['results'][0]['retry'] = 1
                elif label == 'multiple-attempts':
                    test['results'] = [{'status': 'failed', 'retry': 0}, {'status': 'passed', 'retry': 1}]
                else:
                    test['status'] = 'unexpected'
                with self.subTest(locale=locale, fault=label):
                    self.assertNotEqual(execute(reports=reports), 0)
            for key in ['content', 'rows', 'checks', 'operations']:
                receipts = copy.deepcopy(good_receipts)
                del receipts[locale][key]
                with self.subTest(locale=locale, missing_persisted_key=key):
                    self.assertNotEqual(execute(receipts=receipts), 0)
            receipts = copy.deepcopy(good_receipts)
            receipts[locale] = {}
            with self.subTest(locale=locale, empty_persisted=True):
                self.assertNotEqual(execute(receipts=receipts), 0)

    def test_fresh_pdf_hosted_gate_runs_one_dedicated_native_owner(self):
        job = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']
        steps = job['steps']
        runs = [step for step in steps if step.get('name') == 'Run required fresh PDF canonical journey']
        self.assertEqual(len(runs), 1, 'Fresh PDF needs its actual dedicated native CI invocation')
        run = runs[0]
        owner = 'RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshPdfCanonicalGroceries'
        self.assertIn('FullyQualifiedName=' + owner, run['run'])
        self.assertNotIn('FullyQualifiedName~', run['run'])
        self.assertIn('trx;LogFileName=native.trx', run['run'])
        self.assertIn('--results-directory .task/grocery-live/fresh-pdf-input', run['run'])
        self.assertEqual(run['env']['WFS_CANONICAL_BROWSER_ROOT'], '${{ github.workspace }}')
        self.assertEqual(run['env']['WFS_CANONICAL_EVIDENCE'], '${{ github.workspace }}/.task/grocery-live/fresh-pdf-input')
        guards = [step for step in steps if step.get('name') == 'Require fresh PDF canonical journey results']
        self.assertEqual(len(guards), 1, 'Fresh PDF needs native, both browser and persisted receipt guard')
        self.assertNotIn('continue-on-error', job)
        self.assertNotIn('continue-on-error', run)
        self.assertNotIn('continue-on-error', guards[0])
        upload = next(step for step in steps if step.get('name') == 'Upload cooking live results')
        self.assertEqual(upload['if'], 'always()')
        self.assertIn('.task/grocery-live/', upload['with']['path'])
        self.assertLess(steps.index(run), steps.index(guards[0]))
        self.assertLess(steps.index(guards[0]), steps.index(upload))

    def test_fresh_pdf_hosted_guard_rejects_incomplete_or_nonpassing_actual_receipts(self):
        import copy
        import json
        import subprocess
        import tempfile
        from uuid import UUID
        import xml.etree.ElementTree as ET
        steps = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']['cooking-step-live']['steps']
        guards = [step for step in steps if step.get('name') == 'Require fresh PDF canonical journey results']
        self.assertEqual(len(guards), 1, 'Missing actual PDF workflow guard is the intended preimplementation red')
        guard = guards[0]['run']
        owner = 'RecipeApi.Tests.Integration.CanonicalIngredientPublicationPostgresTests.LiveBrowser_FreshPdfCanonicalGroceries'
        # Synthetic receipt data validates the actual inline CI guard, never a live PDF journey.
        uid = lambda value: str(UUID(int=value))
        scalar = lambda value: {'kind': 'scalar', 'value': {'n': str(value), 'd': '1'}}
        browser, persisted, reports = {}, {}, {}
        for index, locale in enumerate(['en', 'fr'], 1):
            recipe = uid(index)
            lines = [{'id': uid(10 + n), 'amount': scalar(amount) if amount else None,
                      'unit': {'text': unit, 'definitionId': None} if unit else None,
                      'provenance': {'origin': 'source', 'sourceRef': 'retained-source', 'protectedFields': []}}
                     for n, (amount, unit) in enumerate([(200, 'g'), (100, 'ml'), (None, None)])]
            initial = {'id': recipe, 'servings': 4, 'contentRevision': 'initial',
                       'ingredientLines': lines, 'instructionSections': []}
            saved = copy.deepcopy(initial); saved['contentRevision'] = 'saved'; saved['ingredientLines'][0]['amount'] = scalar(250)
            final = copy.deepcopy(saved); final['contentRevision'] = 'final'; final['ingredientLines'][0]['amount'] = None
            final['ingredientLines'][0]['provenance'] = {'origin': 'human', 'sourceRef': 'retained-source', 'protectedFields': ['amount']}
            def row(key, amount):
                return {'normalizedKey': key, 'recipeIds': [recipe], 'rowId': key + '-row',
                        'rowVersion': '2', 'demandIdentity': key + '-identity', 'quantity': scalar(amount) if amount else None}
            sauce = row('sauce', 200)
            def schedule(amount):
                return {'weekStartDate': '2026-10-12', 'groceryItems': [row('pasta', amount), sauce, row('salt to taste', None)],
                        'groceryState': {'sauce-row': True}}
            browser[locale] = {'locale': locale, 'id': recipe, 'accepted': {'data': {'id': recipe}}, 'captureRequests': 1,
                               'initial': initial, 'saved': saved, 'final': final, 'checked': schedule(400),
                               'afterSave': schedule(500), 'afterClear': schedule(None),
                               'dated': {'lines': [{'displayText': '500 g pasta'}]}}
            workflows, attempts = [], []
            names = [('recipe-import', ['ConvertPdf', 'ExtractRecipe', 'GenerateHero', 'SyncRecipe', 'CategorizeIngredients',
                                       'CategorizeRecipe', 'RecipeReady', 'CompleteRecipeImportReport', 'QueueRecipeSearchIndex']),
                     ('index-recipe-search', ['IndexRecipeSearch']), ('supper-grocery-refresh', ['RefreshSupperGroceries'])]
            for number, (kind, processors) in enumerate(names, 1):
                instance = uid(100 + number)
                tasks = []
                for task_number, processor in enumerate(processors, 1):
                    task = uid(number * 1000 + task_number)
                    tasks.append({'taskId': task, 'processorName': processor, 'status': 'completed', 'retryCount': 0})
                    attempts.append({'id': uid(number * 10000 + task_number), 'taskId': task, 'instanceId': instance,
                                     'requestHash': 'a' * 64, 'outcomeHash': 'b' * 64, 'observedAt': '2026-11-12T00:00:00Z'})
                workflows.append({'id': instance, 'workflowId': kind, 'status': 'completed', 'tasks': tasks})
            proof = {'content': {'sourceRevision': 'retained-source', **{key: final[key] for key in ['contentRevision', 'servings', 'ingredientLines', 'instructionSections']}},
                     'source': {'isReady': True, 'servings': 4, 'imageCount': 2, 'rawMetadataSha256': 'c' * 64,
                                'addedBy': uid(99), 'rating': 'like', 'notes': 'Keep this public PDF source.'},
                     'sourceFiles': {name: {'sha256': str(number) * 64, 'bytes': 100}
                                     for number, name in enumerate(['original/0.png', 'original/1.png', 'hero.webp'], 1)},
                     'workflow': workflows, 'attempts': attempts,
                     'publications': [{'operationId': value, 'inputHash': 'a' * 64, 'resultHash': 'b' * 64, 'delivered': True}
                                      for value in [workflows[0]['id'], workflows[0]['tasks'][0]['taskId']]],
                     'categories': [{'normalizedKey': key, 'grocerySection': 'Pantry'} for key in ['pasta', 'salt to taste', 'sauce']],
                     'reports': [], 'rows': [{'weekStartDate': '2026-10-12', 'items': schedule(None)['groceryItems']}],
                     'checks': [{'weekStartDate': '2026-10-12', 'state': {'sauce-row': True}, 'baseline': {'sauce-row': {'quantity': scalar(200)}}}],
                     'operations': [{'operationId': uid(700 + number), 'inputHash': 'a' * 64} for number in [1, 2]]}
            proof['sourceFiles']['original/source.pdf'] = {'sha256': '20808885823da6870ff6dfd8b7408e35d0fc0de766491bdc0344b204df48916d', 'bytes': 1330}
            browser[locale]['originalPages'] = [{'index': number, **proof['sourceFiles'][f'original/{number}.png']} for number in [0, 1]]
            control = {'sauce': sauce, 'check': True, 'baseline': proof['checks'][0]['baseline']['sauce-row']}
            for key in ['sauceControlBefore', 'sauceControlAfterSave', 'sauceControlAfterClear']:
                browser[locale][key] = copy.deepcopy(control)
            persisted[locale] = {'locale': locale, 'id': recipe, 'proof': proof,
                                 'runtime': {'runtime': '.NET 10', 'os': 'Linux', 'architecture': 'X64', 'profile': {'dpi': 200},
                                             'dotnetSha256': 'd' * 64, 'inputs': {name: 'e' * 64 for name in ['RecipeApi.dll', 'RecipeApi.runtimeconfig.json', 'RecipeApi.deps.json']},
                                             'nativeAssets': {'libpdfium.so': 'f' * 64, 'libSkiaSharp.so': 'f' * 64}},
                                 'externalCalls': {name: 1 for name in ['extract', 'description', 'ingredient-category', 'recipe-category', 'hero', 'embedding']}}
            reports[locale] = {'errors': [], 'stats': {'expected': 1, 'unexpected': 0, 'skipped': 0, 'flaky': 0},
                               'suites': [{'specs': [{'title': f'fresh PDF {locale} uses native conversion, guarded editing and grocery refresh',
                                                      'tests': [{'status': 'expected', 'results': [{'status': 'passed', 'retry': 0}]}]}]}]}

        def execute(native=None, changed_reports=None, changed_browser=None, changed_persisted=None, missing=None, malformed=None, extra_locale=False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / '.task/grocery-live/fresh-pdf-input'
                root.mkdir(parents=True)
                if missing != 'native':
                    tree = ET.Element('TestRun'); results = ET.SubElement(tree, 'Results')
                    for name, outcome in [(owner, 'Passed')] if native is None else native:
                        ET.SubElement(results, 'UnitTestResult', testName=name, outcome=outcome)
                    ET.ElementTree(tree).write(root / 'native.trx')
                for locale in ['en', 'fr']:
                    path = root / 'fresh-pdf' / locale
                    path.mkdir(parents=True)
                    for suffix, values in [('browser-results', changed_reports or reports), ('browser-receipt', changed_browser or browser), ('persisted-result', changed_persisted or persisted)]:
                        key = locale + '-' + suffix
                        if missing != key:
                            (path / (suffix + '.json')).write_text('{' if malformed == key else json.dumps(values[locale]))
                if extra_locale:
                    (root / 'fresh-pdf' / 'de').mkdir()
                return subprocess.run(['bash', '-c', guard], cwd=directory, capture_output=True).returncode

        self.assertEqual(execute(), 0, 'Actual guard must admit a complete one-native/two-locale receipt set')
        nested = copy.deepcopy(reports); nested['fr']['suites'] = [{'suites': nested['fr']['suites']}]
        self.assertEqual(execute(changed_reports=nested), 0, 'Nested actual Playwright suite layout remains supported')
        self.assertNotEqual(execute(extra_locale=True), 0)
        shared_browser, shared_persisted = copy.deepcopy(browser), copy.deepcopy(persisted)
        shared_browser['fr'] = copy.deepcopy(shared_browser['en']); shared_browser['fr']['locale'] = 'fr'
        shared_persisted['fr'] = copy.deepcopy(shared_persisted['en']); shared_persisted['fr']['locale'] = 'fr'
        self.assertNotEqual(execute(changed_browser=shared_browser, changed_persisted=shared_persisted), 0, 'EN/FR must have fresh independent recipe identities')
        for native in [[], [(owner + 'Other', 'Passed')], [(owner, 'NotExecuted')], [(owner, 'Failed')],
                       [(owner, 'Passed'), (owner, 'Passed')], [(owner, 'Passed'), (owner + 'Other', 'Passed')]]:
            with self.subTest(native=native): self.assertNotEqual(execute(native=native), 0)
        self.assertNotEqual(execute(missing='native'), 0)
        for locale in ['en', 'fr']:
            for suffix in ['browser-results', 'browser-receipt', 'persisted-result']:
                with self.subTest(missing=locale + '-' + suffix): self.assertNotEqual(execute(missing=locale + '-' + suffix), 0)
                with self.subTest(malformed=locale + '-' + suffix): self.assertNotEqual(execute(malformed=locale + '-' + suffix), 0)
            for fault in ['wrong-title', 'extra', 'duplicate', 'empty', 'not-executed', 'skip', 'fail', 'flaky', 'retry', 'multiple-attempts']:
                values = copy.deepcopy(reports); specs = values[locale]['suites'][0]['specs']; test = specs[0]['tests'][0]
                if fault == 'wrong-title': specs[0]['title'] = 'Another journey'
                elif fault in ['extra', 'duplicate']: specs.append(copy.deepcopy(specs[0]))
                elif fault == 'empty': specs.clear()
                elif fault == 'not-executed': test['results'] = []
                elif fault == 'retry': test['results'][0]['retry'] = 1
                elif fault == 'multiple-attempts': test['results'] = [{'status': 'failed', 'retry': 0}, {'status': 'passed', 'retry': 1}]
                elif fault == 'flaky': test['status'] = 'flaky'; values[locale]['stats']['flaky'] = 1
                else: test['status'] = 'skipped' if fault == 'skip' else 'unexpected'; test['results'][0]['status'] = 'skipped' if fault == 'skip' else 'failed'
                with self.subTest(locale=locale, browser_fault=fault): self.assertNotEqual(execute(changed_reports=values), 0)
            for key in browser[locale]:
                values = copy.deepcopy(browser); del values[locale][key]
                with self.subTest(locale=locale, missing_browser_key=key): self.assertNotEqual(execute(changed_browser=values), 0)
            for key in persisted[locale]['proof']:
                values = copy.deepcopy(persisted); del values[locale]['proof'][key]
                with self.subTest(locale=locale, missing_proof_key=key): self.assertNotEqual(execute(changed_persisted=values), 0)
            for browser_fault in ['page-hash', 'source-ref', 'sauce-baseline', 'same-recipe']:
                values = copy.deepcopy(browser)
                if browser_fault == 'page-hash': values[locale]['originalPages'][0]['sha256'] = '0' * 64
                elif browser_fault == 'source-ref': values[locale]['saved']['ingredientLines'][0]['provenance']['sourceRef'] = 'changed-source'
                elif browser_fault == 'sauce-baseline': values[locale]['sauceControlAfterClear']['baseline'] = {}
                else: values[locale]['id'] = uid(1 if locale == 'fr' else 2)
                with self.subTest(locale=locale, receipt_fault=browser_fault): self.assertNotEqual(execute(changed_browser=values), 0)
            for fault in ['foreign-id', 'same-locale', 'pdf-sha', 'missing-page', 'same-page', 'missing-root', 'extra-root', 'missing-child', 'root-task', 'failed-task', 'retried-task', 'missing-attempt', 'duplicate-attempt', 'foreign-attempt', 'undelivered', 'category', 'source', 'rows', 'check', 'baseline', 'operation', 'report', 'runtime', 'external-count', 'content']:
                values = copy.deepcopy(persisted); value = values[locale]; proof = value['proof']
                if fault == 'foreign-id': value['id'] = uid(999)
                elif fault == 'same-locale': value['locale'] = 'fr' if locale == 'en' else 'en'
                elif fault == 'pdf-sha': proof['sourceFiles']['original/source.pdf']['sha256'] = '0' * 64
                elif fault == 'missing-page': del proof['sourceFiles']['original/1.png']
                elif fault == 'same-page': proof['sourceFiles']['original/1.png'] = proof['sourceFiles']['original/0.png']
                elif fault == 'missing-root': proof['workflow'].pop(0)
                elif fault == 'extra-root': proof['workflow'].append(copy.deepcopy(proof['workflow'][0]))
                elif fault == 'missing-child': proof['workflow'].pop(1)
                elif fault == 'root-task': proof['workflow'][0]['tasks'].pop()
                elif fault == 'failed-task': proof['workflow'][0]['tasks'][0]['status'] = 'failed'
                elif fault == 'retried-task': proof['workflow'][0]['tasks'][0]['retryCount'] = 1
                elif fault == 'missing-attempt': proof['attempts'].pop()
                elif fault == 'duplicate-attempt': proof['attempts'].append(copy.deepcopy(proof['attempts'][0]))
                elif fault == 'foreign-attempt': proof['attempts'][0]['instanceId'] = uid(999)
                elif fault == 'undelivered': proof['publications'][0]['delivered'] = False
                elif fault == 'category': proof['categories'].pop()
                elif fault == 'source': proof['source']['isReady'] = False
                elif fault == 'rows': proof['rows'][0]['items'][0]['quantity'] = scalar(500)
                elif fault == 'check': proof['checks'][0]['state']['sauce-row'] = False
                elif fault == 'baseline': proof['checks'][0]['baseline'] = {}
                elif fault == 'operation': proof['operations'].pop()
                elif fault == 'report': proof['reports'] = [{'status': 'reimportFailed'}]
                elif fault == 'runtime': value['runtime']['nativeAssets'] = {}
                elif fault == 'external-count': value['externalCalls']['extract'] = 2
                elif fault == 'content': proof['content']['contentRevision'] = 'stale'
                with self.subTest(locale=locale, persisted_fault=fault): self.assertNotEqual(execute(changed_persisted=values), 0)

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
