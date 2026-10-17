"""Recognize explicit, matching wire defaults without excusing required fields."""
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]


class RecordDefaultDiscoveryTests(unittest.TestCase):
    def check(self, declaration, *, required=False, api_default=False, has_default=True):
        spec = importlib.util.spec_from_file_location('drift_defaults', ROOT / 'scripts/agent/drift.py')
        drift = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(drift)
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / 'Choice.cs').write_text(
                'public record Choice([property: JsonPropertyName("requireEmpty")] '
                + declaration + ');'
            )
            prop = {'type': 'boolean'}
            if has_default:
                prop['default'] = api_default
            contract = {'components': {'schemas': {'Choice': {
                'properties': {'requireEmpty': prop},
                'required': ['requireEmpty'] if required else [],
            }}}}
            with mock.patch.object(drift, 'DTO_DIR', folder), mock.patch.object(drift, 'load_spec', return_value=contract), contextlib.redirect_stdout(io.StringIO()):
                return drift.run_schema_drift(verbose=False)

    def test_matching_false_default_allows_omission(self):
        self.assertEqual(0, self.check('bool RequireEmpty = false'))

    def test_required_field_remains_required_even_with_default(self):
        self.assertEqual(0, self.check('bool RequireEmpty = false', required=True))

    def test_no_csharp_default_does_not_excuse_optional_api_property(self):
        self.assertEqual(1, self.check('bool RequireEmpty'))

    def test_mismatched_default_is_not_excused(self):
        self.assertEqual(1, self.check('bool RequireEmpty = true'))

    def test_api_must_declare_the_matching_default(self):
        self.assertEqual(1, self.check('bool RequireEmpty = false', has_default=False))

    def test_unrecognized_csharp_expression_is_not_evidence(self):
        self.assertEqual(1, self.check('bool RequireEmpty = Defaults.Empty'))

    def test_nullable_optional_fields_remain_supported(self):
        self.assertEqual(0, self.check('bool? RequireEmpty = null', has_default=False))

    def test_boolean_and_numeric_defaults_are_distinct(self):
        self.assertEqual(1, self.check('bool RequireEmpty = false', api_default=0))
