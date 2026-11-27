"""Fast static consistency checks across Node pins, AI/embedding defaults, timezones, and env templates."""

from __future__ import annotations

import json
from pathlib import Path
import re
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[3]

EXPECTED_EMBEDDING_MODEL = "gemini-embedding-2"
EXPECTED_EMBEDDING_DIMENSIONS = 1536
EXPECTED_GEMINI_MODEL = "gemini-3.8-flash"
EXPECTED_HERO_MODEL = "models/gemini-3-pro-image"
EXPECTED_GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/"
EXPECTED_TIMEZONE = "America/Toronto"


def parse_semver(version: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", version.strip())
    if not match:
        raise AssertionError(f"Expected exact semver X.Y.Z, got {version!r}")
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def parse_dotenv(path: Path) -> tuple[dict[str, str], dict[str, str]]:
    active: dict[str, str] = {}
    commented: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("#"):
            comment_match = re.match(r"^#\s*([A-Za-z_][A-Za-z0-9_]*?)=(.*)$", line)
            if comment_match:
                commented[comment_match.group(1)] = comment_match.group(2).strip()
            continue
        if "=" in line:
            key, value = line.split("=", 1)
            active[key.strip()] = value.strip()
    return active, commented


class EnvironmentConsistencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nvmrc = (ROOT / ".nvmrc").read_text(encoding="utf-8").strip()
        cls.package_json = json.loads((ROOT / "pwa/package.json").read_text(encoding="utf-8"))
        cls.appsettings = json.loads((ROOT / "api/appsettings.json").read_text(encoding="utf-8"))
        cls.docker_env, cls.docker_commented = parse_dotenv(ROOT / "docker/.env.example")
        cls.smoke_env, _ = parse_dotenv(ROOT / "docker/compose/smoke.env")
        cls.synology_env, cls.synology_commented = parse_dotenv(ROOT / "release-template/synology/.env.example")
        cls.apps_compose = yaml.safe_load((ROOT / "docker/compose/apps.yml").read_text(encoding="utf-8"))
        cls.synology_compose = yaml.safe_load((ROOT / "release-template/synology/compose.yaml").read_text(encoding="utf-8"))
        cls.taskfile_text = (ROOT / "Taskfile.yml").read_text(encoding="utf-8")
        cls.taskfile = yaml.safe_load(cls.taskfile_text)
        cls.schema_sql = (ROOT / "api/database/schema.sql").read_text(encoding="utf-8")

    def test_node_and_npm_versions_align_across_nvmrc_package_json_and_taskfile(self):
        node_tuple = parse_semver(self.nvmrc)
        engine_range = self.package_json["engines"]["node"]
        range_match = re.fullmatch(r">=(\d+\.\d+\.\d+)\s+<(\d+)(?:\.(\d+)\.(\d+))?", engine_range)
        self.assertIsNotNone(range_match, f"Unsupported engines.node format: {engine_range!r}")
        lower = parse_semver(range_match.group(1))
        upper = (
            int(range_match.group(2)),
            int(range_match.group(3) or 0),
            int(range_match.group(4) or 0),
        )
        self.assertGreaterEqual(node_tuple, lower)
        self.assertLess(node_tuple, upper)

        pkg_manager = self.package_json["packageManager"]
        self.assertTrue(pkg_manager.startswith("npm@"), pkg_manager)
        npm_version = pkg_manager.removeprefix("npm@")
        npm_major, npm_minor, _ = parse_semver(npm_version)
        self.assertEqual(self.package_json["engines"]["npm"], f"{npm_major}.{npm_minor}.x")
        self.assertIn(f"npm@{npm_version}", json.dumps(self.taskfile["tasks"]["hooks:setup"]["cmds"]))

    def test_embedding_model_and_dimensions_are_consistent_everywhere(self):
        self.assertEqual(self.appsettings.get("EMBEDDING_MODEL_ID"), EXPECTED_EMBEDDING_MODEL)
        self.assertEqual(self.docker_env.get("EMBEDDING_MODEL_ID"), EXPECTED_EMBEDDING_MODEL)
        self.assertEqual(self.smoke_env.get("EMBEDDING_MODEL_ID"), EXPECTED_EMBEDDING_MODEL)
        self.assertEqual(self.synology_env.get("EMBEDDING_MODEL_ID"), EXPECTED_EMBEDDING_MODEL)

        self.assertEqual(
            self.apps_compose["services"]["api"]["environment"]["EMBEDDING_MODEL_ID"],
            f"${{EMBEDDING_MODEL_ID:-{EXPECTED_EMBEDDING_MODEL}}}",
        )
        self.assertEqual(
            self.synology_compose["services"]["api"]["environment"]["EMBEDDING_MODEL_ID"],
            f"${{EMBEDDING_MODEL_ID:-{EXPECTED_EMBEDDING_MODEL}}}",
        )

        # Verify C# embedding configuration sources (GeminiEmbeddingProvider + any GeminiOptions record/class).
        csharp_files = [
            ROOT / "api/src/RecipeApi/Services/GeminiEmbeddingProvider.cs",
            *sorted((ROOT / "api/src/RecipeApi").rglob("*Gemini*Options*.cs")),
        ]
        combined_csharp = "\n".join(p.read_text(encoding="utf-8") for p in csharp_files if p.is_file())
        self.assertIn(f'"{EXPECTED_EMBEDDING_MODEL}"', combined_csharp)
        self.assertNotIn("gemini-embedding-001", combined_csharp)
        self.assertRegex(combined_csharp, rf"\b{EXPECTED_EMBEDDING_DIMENSIONS}\b")

        # Verify SQL vector column matches C# & template defaults.
        self.assertRegex(self.schema_sql, rf"\bembedding\s+vector\({EXPECTED_EMBEDDING_DIMENSIONS}\)")
        self.assertEqual(self.docker_commented.get("EMBEDDING_DIMENSIONS"), str(EXPECTED_EMBEDDING_DIMENSIONS))
        self.assertEqual(self.synology_commented.get("EMBEDDING_DIMENSIONS"), str(EXPECTED_EMBEDDING_DIMENSIONS))
        self.assertEqual(
            self.synology_compose["services"]["api"]["environment"]["EMBEDDING_DIMENSIONS"],
            f"${{EMBEDDING_DIMENSIONS:-{EXPECTED_EMBEDDING_DIMENSIONS}}}",
        )

    def test_gemini_generation_defaults_match_across_appsettings_compose_and_templates(self):
        for source_name, mapping in (
            ("api/appsettings.json", self.appsettings),
            ("docker/.env.example", self.docker_env),
            ("docker/compose/smoke.env", self.smoke_env),
            ("release-template/synology/.env.example", self.synology_env),
        ):
            with self.subTest(source=source_name):
                self.assertEqual(mapping.get("GEMINI_MODEL_ID"), EXPECTED_GEMINI_MODEL)
                self.assertEqual(mapping.get("GEMINI_MODEL_ID_HERO"), EXPECTED_HERO_MODEL)

        self.assertEqual(self.appsettings.get("GEMINI_ENDPOINT"), EXPECTED_GEMINI_ENDPOINT)
        self.assertEqual(self.docker_env.get("GEMINI_ENDPOINT"), EXPECTED_GEMINI_ENDPOINT)
        self.assertEqual(self.smoke_env.get("GEMINI_ENDPOINT"), EXPECTED_GEMINI_ENDPOINT)
        self.assertEqual(
            self.synology_env.get("GEMINI_ENDPOINT") or self.synology_commented.get("GEMINI_ENDPOINT"),
            EXPECTED_GEMINI_ENDPOINT,
        )

    def test_calendar_timezone_defaults_match_shipped_templates_and_compose(self):
        self.assertEqual(self.docker_env.get("Calendar__TimeZone"), EXPECTED_TIMEZONE)
        self.assertEqual(self.synology_env.get("Calendar__TimeZone"), EXPECTED_TIMEZONE)
        self.assertEqual(
            self.apps_compose["services"]["api"]["environment"]["Calendar__TimeZone"],
            f"${{Calendar__TimeZone:-{EXPECTED_TIMEZONE}}}",
        )
        self.assertEqual(
            self.synology_compose["services"]["api"]["environment"]["Calendar__TimeZone"],
            f"${{Calendar__TimeZone:-{EXPECTED_TIMEZONE}}}",
        )
        self.assertIn(EXPECTED_TIMEZONE, str(self.taskfile["vars"]["CALENDAR_TIMEZONE"]))
        # Smoke environment explicitly pins UTC for deterministic CI runs.
        self.assertEqual(self.smoke_env.get("Calendar__TimeZone"), "UTC")

    def test_required_environment_keys_and_ports_stay_present_across_templates(self):
        shared_keys = {
            "POSTGRES_PASSWORD",
            "HEARTH_SECRET",
            "ELEVATED_ACTIONS_PIN",
            "GEMINI_API_KEY",
            "GEMINI_MODEL_ID",
            "GEMINI_MODEL_ID_HERO",
            "EMBEDDING_MODEL_ID",
            "DEMO_MODE",
            "Calendar__TimeZone",
            "HISTORICAL_INTEREST_WEEKS",
            "HISTORICAL_INTEREST_ENABLED",
            "COOKED_COOLDOWN_WEEKS",
            "DREAMING_ROTATION_ENABLED",
        }
        for name, env_map in (
            ("docker/.env.example", self.docker_env),
            ("docker/compose/smoke.env", self.smoke_env),
            ("release-template/synology/.env.example", self.synology_env),
        ):
            with self.subTest(template=name):
                missing = shared_keys - env_map.keys()
                self.assertFalse(missing, f"{name} is missing required keys: {sorted(missing)}")

        # Local dev ports in docker/.env.example match Taskfile vars.
        self.assertEqual(self.docker_env.get("API_PORT"), str(self.taskfile["vars"]["API_PORT"]))
        self.assertEqual(self.docker_env.get("PWA_PORT"), str(self.taskfile["vars"]["PWA_PORT"]))
        self.assertEqual(self.docker_env.get("POSTGRES_PORT"), str(self.taskfile["vars"]["DB_PORT"]))
        self.assertEqual(self.docker_env.get("POSTGRES_DB"), str(self.taskfile["vars"]["DB_NAME"]))

        # Release template keeps tunnel and version selectors required by setup.sh / update.sh.
        synology_required = {
            "COMPOSE_FILE",
            "CLOUDFLARE_TUNNEL_TOKEN",
            "WFS_PROXY_NETWORK",
            "WFS_PROXY_ALIAS",
            "WFS_VERSION",
            "WFS_HTTP_PORT",
        }
        self.assertFalse(synology_required - self.synology_env.keys())


if __name__ == "__main__":
    unittest.main()
