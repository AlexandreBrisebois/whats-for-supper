#!/usr/bin/env python3
"""Explainable, cache-aware selection of impacted Playwright tests."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import NamedTuple


ROOT = Path(__file__).resolve().parents[2]
E2E_DIR = ROOT / "pwa" / "e2e"
CACHE_PATH = ROOT / ".task" / "agent-test-impact" / "last-success.json"
CACHE_CONTEXT_FILES = (
    "scripts/agent/test_ops.py",
    "pwa/playwright.config.ts",
    "pwa/package.json",
    "pwa/package-lock.json",
)
VOLATILE_GENERATED_PATHS = {"pwa/next-env.d.ts"}


class ImpactPlan(NamedTuple):
    tests: tuple[str, ...]
    reasons: tuple[str, ...]
    run_all: bool = False


def git_lines(*args: str) -> list[str]:
    output = subprocess.check_output(["git", *args], cwd=ROOT)
    return output.decode("utf-8").splitlines()


def get_changed_files() -> list[str]:
    changed = [
        *git_lines("diff", "--name-only", "--cached"),
        *git_lines("diff", "--name-only"),
        *git_lines("ls-files", "--others", "--exclude-standard"),
    ]
    return sorted(set(filter(None, changed)) - VOLATILE_GENERATED_PATHS)


def matching_specs(prefix: str) -> set[str]:
    return {
        str(test_file)
        for test_file in E2E_DIR.glob(f"{prefix}*.spec.ts")
    }


def build_impact_plan(changed_files: list[str]) -> ImpactPlan:
    impacted: set[str] = set()
    reasons: list[str] = []

    for file in changed_files:
        if file in {
            "specs/openapi.yaml",
            "pwa/playwright.config.ts",
            "pwa/package.json",
            "pwa/package-lock.json",
            "Taskfile.yml",
        } or file.endswith(("fixtures.ts", "mock-api.ts")):
            reasons.append(f"{file}: shared contract or test infrastructure requires all E2E")
            return ImpactPlan((str(E2E_DIR),), tuple(reasons), True)

        if file.startswith("pwa/src/lib/api/generated/"):
            reasons.append(f"{file}: shared generated client requires all E2E")
            return ImpactPlan((str(E2E_DIR),), tuple(reasons), True)

        if file == "pwa/src/lib/api/recipes.ts":
            mapped = matching_specs("recipes") | matching_specs("home-recipe")
            impacted.update(mapped)
            reasons.append(f"{file}: recipe API wrapper maps to recipe and home-recipe flows")
            continue

        if file.startswith(("pwa/src/components/ui/", "pwa/src/components/common/")):
            reasons.append(f"{file}: shared UI component requires all E2E")
            return ImpactPlan((str(E2E_DIR),), tuple(reasons), True)

        if file.startswith(("pwa/src/lib/api/", "pwa/src/store/")):
            reasons.append(f"{file}: shared client or store requires all E2E")
            return ImpactPlan((str(E2E_DIR),), tuple(reasons), True)

        if "Controllers" in file:
            controller_name = Path(file).name.replace("Controller.cs", "").lower()
            if controller_name == "recipe":
                mapped = matching_specs("recipes") | matching_specs("home-recipe")
            else:
                mapped = matching_specs(controller_name)
            impacted.update(mapped)
            if mapped:
                reasons.append(f"{file}: controller maps to {len(mapped)} feature E2E file(s)")

        if file.startswith("pwa/src/app/"):
            parts = file.split("/")
            if "(app)" in parts:
                index = parts.index("(app)")
                if len(parts) > index + 1:
                    feature = parts[index + 1]
                    mapped = matching_specs(feature)
                    impacted.update(mapped)
                    if mapped:
                        reasons.append(f"{file}: app route maps to {feature} E2E flows")

        if file.startswith("pwa/src/components/"):
            parts = file.split("/")
            if len(parts) > 3:
                feature = parts[3]
                mapped = matching_specs(feature)
                impacted.update(mapped)
                if mapped:
                    reasons.append(f"{file}: component maps to {feature} E2E flows")

        if file.startswith("pwa/e2e/") and file.endswith(".spec.ts"):
            impacted.add(str(ROOT / file))
            reasons.append(f"{file}: changed E2E file runs directly")

    return ImpactPlan(tuple(sorted(impacted)), tuple(reasons), False)


def add_file_to_digest(digest: "hashlib._Hash", root: Path, relative_path: str) -> None:
    path = root / relative_path
    digest.update(relative_path.encode("utf-8"))
    if path.is_file():
        digest.update(path.read_bytes())
    else:
        digest.update(b"<missing>")


def build_impact_digest(root: Path, changed_files: list[str], tests: list[str]) -> str:
    digest = hashlib.sha256()
    for relative_path in sorted(set(changed_files) | set(CACHE_CONTEXT_FILES)):
        add_file_to_digest(digest, root, relative_path)
    for test in sorted(tests):
        digest.update(test.encode("utf-8"))
    return digest.hexdigest()


def write_success_cache(cache_path: Path, digest: str, tests: list[str]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps({"digest": digest, "tests": sorted(tests)}, indent=2) + "\n")


def has_success_cache(cache_path: Path, digest: str, tests: list[str]) -> bool:
    try:
        cached = json.loads(cache_path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return False
    return cached == {"digest": digest, "tests": sorted(tests)}


def run_impacted(run_all: bool = False) -> None:
    changed_files = get_changed_files()
    plan = (
        ImpactPlan((str(E2E_DIR),), ("--all explicitly requested",), True)
        if run_all
        else build_impact_plan(changed_files)
    )

    print("🎯 Identifying impacted tests...")
    for reason in plan.reasons:
        print(f"  • {reason}")

    if not plan.tests:
        print("✅ No impacted E2E tests identified for this change.")
        return

    tests = list(plan.tests)
    digest = build_impact_digest(ROOT, changed_files, tests)
    cache_enabled = not os.environ.get("CI") and os.environ.get("WFS_DISABLE_TEST_CACHE") != "1"
    if cache_enabled and has_success_cache(CACHE_PATH, digest, tests):
        print(f"✅ Reusing successful impact result for unchanged digest {digest[:12]}.")
        return

    print("🚀 Running impacted tests...")
    for test in tests:
        print(f"  - {os.path.relpath(test, ROOT)}")

    command = ["npx", "playwright", "test", *tests]
    try:
        subprocess.run(command, cwd=ROOT / "pwa", check=True)
    except subprocess.CalledProcessError:
        print("❌ Some tests failed.")
        raise SystemExit(1)

    if cache_enabled:
        post_test_changed_files = get_changed_files()
        post_test_digest = build_impact_digest(ROOT, post_test_changed_files, tests)
        write_success_cache(CACHE_PATH, post_test_digest, tests)
        print(f"💾 Cached successful impact result as {post_test_digest[:12]}.")
    print("✅ Tests passed!")


def main() -> None:
    if "--impact" in sys.argv or "--all" in sys.argv:
        run_impacted(run_all="--all" in sys.argv)
    else:
        print("Usage: python3 test_ops.py [--impact | --all]")


if __name__ == "__main__":
    main()
