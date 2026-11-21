"""Qualify actual deployment and raw-SQL guards using disposable PostgreSQL only."""
import os
import re
from pathlib import Path
import subprocess
import time
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[3]


@unittest.skipUnless(os.environ.get('WFS_TEST_SQLDEF') == '1',
                     'Set WFS_TEST_SQLDEF=1 for isolated Docker migration qualification.')
class CanonicalMigrationTests(unittest.TestCase):
    def test_fresh_and_populated_deployment_preserves_canonical_guard(self):
        name = 'wfs-canonical-migration-' + uuid.uuid4().hex
        image = name + ':test'

        def run(*args, check=True):
            result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, timeout=180)
            if check:
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            return result

        def sql(statement, check=True):
            return run('docker', 'exec', name, 'psql', '-U', 'postgres', '-d', 'checkpoint',
                       '-v', 'ON_ERROR_STOP=1', '-Atc', statement, check=check)

        def migrate():
            run('docker', 'run', '--rm', '--network', name, '-e', 'POSTGRES_HOST=' + name, '-e', 'POSTGRES_USER=postgres',
                '-e', 'POSTGRES_DB=checkpoint', '-e', 'PGPASSWORD=synthetic-test-only', image,
                '-h', name, '-U', 'postgres', 'checkpoint',
                '--enable-drop', '-f', '/schema.sql')

        run('docker', 'build', '-t', image, 'api/database')
        self.addCleanup(lambda: run('docker', 'image', 'rm', image, check=False))
        run('docker', 'network', 'create', '--internal', name)
        self.addCleanup(lambda: run('docker', 'network', 'rm', name, check=False))
        database_image = re.search(r'image: (pgvector/pgvector:\S+)',
                                   (ROOT / 'docker/compose/infrastructure.yml').read_text()).group(1)
        # An internal network and no published ports isolate this test stack.
        # tmpfs prevents persistence into anonymous or household data volumes.
        self.addCleanup(lambda: run('docker', 'rm', '-f', '-v', name, check=False))
        run('docker', 'run', '-d', '--name', name, '--network', name,
            '--tmpfs', '/var/lib/postgresql', '-e', 'POSTGRES_PASSWORD=synthetic-test-only',
            '-e', 'POSTGRES_DB=checkpoint', database_image)
        for attempt in range(60):
            if sql('SELECT 1', check=False).returncode == 0:
                break
            time.sleep(0.5)
        else:
            self.fail('Disposable PostgreSQL did not become ready')

        migrate()
        recipe_id = '00000000-0000-4000-8000-000000000001'
        sql(f"""INSERT INTO recipes (id, rating, is_discoverable, canonical_content,
            source_url, ingredients, raw_metadata, servings) VALUES
            ('{recipe_id}', 0, false, '{{"contentRevision":"revision-1"}}',
            'https://example.test/original', '[]', '{{}}', 2)""")

        def assert_guard():
            before = sql(f"SELECT row_to_json(r) FROM recipes r WHERE id = '{recipe_id}'").stdout
            for assignment in [
                'canonical_content = NULL', "source_url = 'https://example.test/changed'",
                "raw_metadata = '{\"changed\":true}'", "ingredients = '[\"changed\"]'",
                'servings = 4',
                "canonical_content = '{\"contentRevision\":\"revision-1\",\"changed\":true}'",
            ]:
                result = sql(f"UPDATE recipes SET {assignment} WHERE id = '{recipe_id}'", check=False)
                self.assertNotEqual(result.returncode, 0, assignment)
                self.assertIn('Canonical recipe content requires guarded publication', result.stderr)
            self.assertEqual(sql(f"SELECT row_to_json(r) FROM recipes r WHERE id = '{recipe_id}'").stdout, before)

        assert_guard()
        before = sql('SELECT row_to_json(r) FROM recipes r').stdout
        # Existing populated installation missing the trigger (older schema).
        sql('DROP TRIGGER canonical_recipe_content_guard ON recipes')
        migrate()
        self.assertEqual(sql('SELECT row_to_json(r) FROM recipes r').stdout, before)
        assert_guard()
        # Repeated deployment must also accept the already-installed trigger.
        migrate()
        assert_guard()
        sql(f"UPDATE recipes SET rating = 3 WHERE id = '{recipe_id}'")
        sql(f"""UPDATE recipes SET servings = 4,
            canonical_content = '{{"contentRevision":"revision-2"}}' WHERE id = '{recipe_id}'""")
        self.assertEqual(sql('SELECT rating, servings FROM recipes').stdout.strip(), '3|4')
