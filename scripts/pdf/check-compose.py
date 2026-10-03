#!/usr/bin/env python3
"""Check the real Compose interpolation with synthetic values; never reads a live .env."""
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
template = root / "release-template" / "synology"
for mode in ("off", "opt-in", "on"):
    environment = dict(os.environ)
    environment.update({key: "qualification-placeholder" for key in ("POSTGRES_PASSWORD", "HEARTH_SECRET", "GEMINI_API_KEY", "CLOUDFLARE_TUNNEL_TOKEN", "ELEVATED_ACTIONS_PIN")})
    environment["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = mode
    result = subprocess.run(["docker", "compose", "--env-file", str(template / ".env.example"), "-f", str(template / "compose.yaml"), "config", "--format", "json"], env=environment, check=True, capture_output=True, text=True)
    services = json.loads(result.stdout)["services"]
    assert services["api"]["environment"]["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] == mode
    assert services["pwa"]["environment"]["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] == mode
    for service in ("api", "pwa"):
        assert not any(key.startswith("WFS_PDF_") for key in services[service]["environment"]), service
    print(f"passed: Compose API/PWA share mode {mode}, renderer uses code-owned settings")
assert "WFS_PDF_" not in (template / ".env.example").read_text()
assert "WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off" in (template / ".env.example").read_text()
