"""Schema discovery supports the DTO declarations used at the API boundary."""
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('drift_properties', ROOT / 'scripts/agent/drift.py')
drift = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drift)


class PropertyDiscoveryTests(unittest.TestCase):
    def check(self, declaration, prop, *, required=False):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / 'Choice.cs').write_text(declaration)
            contract = {'components': {'schemas': {'Choice': {
                'properties': {'value': prop},
                'required': ['value'] if required else [],
            }}}}
            with mock.patch.object(drift, 'DTO_DIR', folder), mock.patch.object(drift, 'load_spec', return_value=contract), contextlib.redirect_stdout(io.StringIO()):
                return drift.run_schema_drift(verbose=False)

    def test_combined_attributes_and_qualified_type(self):
        self.assertEqual(0, self.check('''public class Choice {
            [JsonPropertyName("value"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public System.Text.Json.JsonElement Value {
                get => value;
                set { this.value = value; }
            }
        }''', {'type': 'object'}))

    def test_expression_bodied_serialized_property(self):
        self.assertEqual(0, self.check('''public record Choice {
            [JsonPropertyName("value")] public string Value => "recipe";
        }''', {'type': 'string'}, required=True))

    def test_required_nullable_record_property(self):
        self.assertEqual(0, self.check('''public record Choice(
            [property: JsonPropertyName("value")] string? Value = null);
        ''', {'type': ['string', 'null']}, required=True))

    def test_nullable_property_still_fails_nonnullable_required_contract(self):
        self.assertEqual(1, self.check('''public record Choice(
            [property: JsonPropertyName("value")] string? Value = null);
        ''', {'type': 'string'}, required=True))

    def test_missing_required_nullable_property_is_still_reported(self):
        self.assertEqual(1, self.check('public class Choice {}',
                                     {'type': ['string', 'null']}, required=True))
