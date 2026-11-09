"""Static discovery must recognize the calendar contract's existing C#/mock forms."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts/agent' / f'{name}.py')
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class CalendarContractDiscoveryTests(unittest.TestCase):
    def test_record_with_body_retains_required_json_parameters(self):
        drift = module('drift')
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'Calendar.cs'
            source.write_text('''public sealed record Calendar(
                [property: JsonPropertyName("today")] DateOnly Today,
                [property: JsonPropertyName("label")] string? Label)
                { public DateOnly WeekStart(int offset) => Today.AddDays(offset * 7); }''')
            self.assertEqual(drift.parse_cs_dto(source), {
                'today': {'required': True}, 'label': {'required': False},
            })

    def test_mock_discovery_preserves_segment_wildcards_and_ignores_query_glob(self):
        api = module('api_tools')
        with tempfile.TemporaryDirectory() as folder:
            mocks = Path(folder) / 'pwa/e2e'
            mocks.mkdir(parents=True)
            (mocks / 'mock-api.ts').write_text('''
                page.route('**/api/schedule/assign**', handler);
                page.route('**/api/family/*', handler);
                page.route('**/api/schedule/*/smart-defaults**', handler);
            ''')
            spec = {'paths': {
                '/api/schedule/assign': {'post': {}},
                '/api/schedule/{weekOffset}/smart-defaults': {'get': {}},
                '/api/schedule/move': {'post': {}},
                '/api/family/{id}': {'get': {}},
            }}
            with mock.patch.object(api, 'ROOT', folder):
                endpoints = api.get_mock_endpoints(spec)
            self.assertEqual({(e['method'], e['path']) for e in endpoints}, {
                ('POST', '/api/schedule/assign'), ('GET', '/api/schedule/{weekOffset}/smart-defaults'),
                ('GET', '/api/family/{id}'),
            })

    def test_finite_literal_grocery_routes_are_discovered_without_inventing_coverage(self):
        api = module('api_tools')
        with tempfile.TemporaryDirectory() as folder:
            mocks = Path(folder) / 'pwa/e2e'
            mocks.mkdir(parents=True)
            source = mocks / 'mock-api.ts'
            source.write_text("""
                for (const suffix of ['grocery/item', 'grocery']) {
                  await page.route(
                    (url) => new RegExp(`^/api/schedule/[^/]+/${suffix}$`).test(url.pathname),
                    async (route) => {
                      if (route.request().method() !== 'PATCH') return route.fallback();
                      return route.fulfill({ status: 200 });
                    });
                }
            """)
            spec = {'paths': {
                '/api/schedule/{weekOffset}/grocery/item': {'patch': {}},
                '/api/schedule/{weekOffset}/grocery': {'patch': {}, 'delete': {}},
                '/api/schedule/{weekOffset}/other': {'patch': {}},
            }}
            with mock.patch.object(api, 'ROOT', folder):
                self.assertEqual({(e['method'], e['path']) for e in api.get_mock_endpoints(spec)}, {
                    ('PATCH', '/api/schedule/{weekOffset}/grocery/item'),
                    ('PATCH', '/api/schedule/{weekOffset}/grocery'),
                })
                original = source.read_text()
                for changed in [
                    original.replace("'grocery/item', 'grocery'", "'grocery/item', unknown"),
                    original.replace('${suffix}', '${unknown}'),
                    original.replace("method() !== 'PATCH'", "method() === 'PATCH'"),
                ]:
                    source.write_text(changed)
                    self.assertEqual(api.get_mock_endpoints(spec), [])
