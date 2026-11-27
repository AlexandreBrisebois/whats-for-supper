"""Verify deterministic codebase route-map generation and drift detection."""

from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import route_map  # noqa: E402


def seed_minimal_repo(root: Path) -> None:
    (root / "pwa/src/app/(app)/home").mkdir(parents=True)
    (root / "pwa/src/app/(app)/home/page.tsx").write_text(
        "import { useTodayStore } from '@/store/todayStore';\n"
        "import { normalizeScheduleRecipe } from '@/lib/api/planner';\n"
        "export default function HomePage() { return null; }\n",
        encoding="utf-8",
    )
    (root / "pwa/src/store").mkdir(parents=True)
    (root / "pwa/src/store/todayStore.ts").write_text(
        "import { fetchWeek } from '@/lib/api/planner';\n"
        "export const useTodayStore = () => fetchWeek;\n",
        encoding="utf-8",
    )
    (root / "pwa/src/lib/api").mkdir(parents=True)
    (root / "pwa/src/lib/api/planner.ts").write_text(
        "export const fetchWeek = (apiClient: any) => apiClient.api.schedule.get();\n",
        encoding="utf-8",
    )
    (root / "api/src/RecipeApi/Controllers").mkdir(parents=True)
    (root / "api/src/RecipeApi/Controllers/ScheduleController.cs").write_text(
        '[Route("api/schedule")]\n'
        "public class ScheduleController(ScheduleService scheduleService) : ControllerBase\n"
        "{\n"
        '    [HttpGet]\n'
        "    public IActionResult Get() => Ok();\n"
        "}\n",
        encoding="utf-8",
    )
    (root / "api/src/RecipeApi/Services").mkdir(parents=True)
    (root / "api/src/RecipeApi/Services/ScheduleService.cs").write_text(
        "public partial class ScheduleService {}\n",
        encoding="utf-8",
    )
    (root / "api/src/RecipeApi/Services/ScheduleService.Defer.cs").write_text(
        "public partial class ScheduleService {}\n",
        encoding="utf-8",
    )
    (root / "api/src/RecipeApi/Workflows").mkdir(parents=True)
    (root / "api/src/RecipeApi/Workflows/recipe-import.yaml").write_text(
        "name: recipe-import\n"
        "parameters:\n"
        "  - recipeId\n"
        "tasks:\n"
        "  - name: convert\n"
        "    processor: ConvertPdf\n",
        encoding="utf-8",
    )
    (root / "api/database").mkdir(parents=True)
    (root / "api/database/schema.sql").write_text(
        "CREATE TABLE recipes (\n"
        "    id uuid PRIMARY KEY\n"
        ");\n\n"
        "CREATE TABLE calendar_events (\n"
        "    id uuid PRIMARY KEY,\n"
        "    recipe_id uuid REFERENCES recipes(id)\n"
        ");\n",
        encoding="utf-8",
    )


class RouteMapTests(unittest.TestCase):
    def test_repository_route_map_is_current_and_compact(self):
        self.assertEqual(route_map.sync(route_map.ROOT, check=True), [])
        rendered = (route_map.ROOT / route_map.OUTPUT_REL).read_text(encoding="utf-8")
        line_count = len(rendered.splitlines())
        self.assertGreaterEqual(line_count, 110)
        self.assertLessEqual(line_count, 200)
        for expected in (
            "| `/home`",
            "`weekStore.ts`",
            "`pwa/src/lib/api/recipes.ts`",
            "`RecipeController`",
            "`recipe-import`",
            "`recipes`",
        ):
            self.assertIn(expected, rendered)

    def test_check_detects_missing_and_stale_files_without_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            seed_minimal_repo(root)

            missing = route_map.sync(root, check=True)
            self.assertEqual(missing, ["docs/generated/route-map.md is missing"])
            self.assertFalse((root / route_map.OUTPUT_REL).exists())

            self.assertEqual(len(route_map.sync(root, check=False)), 1)
            self.assertEqual(route_map.sync(root, check=True), [])
            first = (root / route_map.OUTPUT_REL).read_text(encoding="utf-8")
            self.assertEqual(first, route_map.render_route_map(root))
            self.assertIn("`/home`", first)
            self.assertIn("`ScheduleController`", first)
            self.assertIn("`calendar_events`", first)

            # Partial classes collapse into a single logical unit in the service summary.
            self.assertRegex(
                first,
                r"\|\s*`api/src/RecipeApi/Services`\s*\|\s*1\s*\|\s*`ScheduleService`\s*\|",
            )

            # Mutating source marks the map stale without overwriting in --check mode.
            (root / "api/src/RecipeApi/Controllers/HealthController.cs").write_text(
                '[Route("api/health")]\npublic class HealthController : ControllerBase {}\n',
                encoding="utf-8",
            )
            stale = route_map.sync(root, check=True)
            self.assertEqual(stale, ["docs/generated/route-map.md is stale"])
            self.assertEqual((root / route_map.OUTPUT_REL).read_text(encoding="utf-8"), first)

    def test_cli_exit_codes_match_check_and_write_modes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            seed_minimal_repo(root)
            original_root = route_map.ROOT
            try:
                route_map.ROOT = root
                self.assertEqual(route_map.main(["--check"]), 1)
                self.assertEqual(route_map.main([]), 0)
                self.assertEqual(route_map.main(["--check"]), 0)
            finally:
                route_map.ROOT = original_root


if __name__ == "__main__":
    unittest.main()
