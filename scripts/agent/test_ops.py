#!/usr/bin/env python3
"""Explainable, cache-aware selection of impacted Playwright tests."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import platform
import shutil
from typing import NamedTuple


ROOT = Path(__file__).resolve().parents[2]
E2E_DIR = ROOT / "pwa" / "e2e"
CACHE_PATH = ROOT / ".task" / "agent-test-impact" / "last-success.json"
CACHE_CONTEXT_FILES = (
    "scripts/agent/test_ops.py",
    "Taskfile.yml",
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
    return output.decode("utf-8").split("\0") if b"\0" in output else output.decode("utf-8").splitlines()


def get_changed_files() -> list[str]:
    changed = [
        *git_lines("diff", "--name-only", "--cached", "-z"),
        *git_lines("diff", "--name-only", "-z"),
        *git_lines("ls-files", "--others", "--exclude-standard", "-z"),
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

        before = len(reasons)
        if file == "pwa/src/lib/api/recipes.ts":
            mapped = matching_specs("recipes") | matching_specs("home-recipe")
            impacted.update(mapped)
            reasons.append(f"{file}: recipe API wrapper maps to recipe and home-recipe flows")
            if mapped:
                continue
            return ImpactPlan((str(E2E_DIR),), (f"{file}: no mapped tests; run all E2E",), True)

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

        if len(reasons) == before and not non_application_path(file):
            reasons.append(f"{file}: unknown/unmapped impact requires all E2E")
            return ImpactPlan((str(E2E_DIR),), tuple(reasons), True)

    return ImpactPlan(tuple(sorted(impacted)), tuple(reasons), False)


def non_application_path(path: str) -> bool:
    if path.endswith('.sql') or path == 'specs/openapi.yaml':
        return False
    return (path.endswith(".md") and not path.startswith(("pwa/", "api/"))) or (
        path.startswith((".agents/", ".kiro/specs/", "scripts/agent/"))
        and path.endswith(('.md', '.py', '.json', '.yaml', '.yml', '.patch'))
    )


def add_file_to_digest(digest, root: Path, relative_path: str) -> None:
    path = root / relative_path
    digest.update(json.dumps(relative_path).encode() + b"\0")
    if path.is_symlink():
        digest.update(b"link:" + os.readlink(path).encode())
    if path.is_file():
        digest.update(str(path.stat().st_mode).encode() + b"\0")
        with path.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
    else:
        digest.update(b"<missing>")
    digest.update(b"\0")


def content_paths(root: Path) -> list[str]:
    if (root / ".git").exists():
        output = subprocess.check_output(
            ["git", "ls-files", "-co", "--exclude-standard", "-z"], cwd=root
        )
        return sorted(set(output.decode().split("\0")) - {""})
    return sorted(str(p.relative_to(root)) for p in root.rglob("*")
                  if p.is_file() and ".task" not in p.parts and "__pycache__" not in p.parts)


def runtime_identity() -> str:
    # Hash actual installed inputs, not just lockfile intent. No raw environment
    # values (which may contain credentials) are persisted or printed.
    digest = hashlib.sha256(json.dumps(dict(os.environ), sort_keys=True).encode())
    digest.update((sys.version + platform.platform()).encode())
    for tool in (sys.executable, shutil.which("node"), shutil.which("task"), shutil.which("dotnet")):
        if tool:
            add_file_to_digest(digest, Path("/"), tool)
    roots = [ROOT / "pwa/node_modules", Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH",
             str(Path.home() / ("Library/Caches/ms-playwright" if sys.platform == "darwin"
                                else ".cache/ms-playwright"))))]
    for root in roots:
        digest.update(str(root).encode())
        for path in sorted(root.rglob("*")) if root.exists() else []:
            if path.is_file():
                add_file_to_digest(digest, root, str(path.relative_to(root)))
    # Framework dotenv inputs are ignored by Git but still affect tests.
    for directory in (ROOT, ROOT / "pwa", ROOT / "api"):
        for path in sorted(directory.glob(".env*")):
            if path.is_file():
                add_file_to_digest(digest, directory, path.name)
    return digest.hexdigest()


def build_impact_digest(root: Path, changed_files: list[str], tests: list[str]) -> str:
    digest = hashlib.sha256(runtime_identity().encode())
    # Include unchanged sources and test helpers: a changed-file-only digest can
    # reuse evidence after switching branches or editing an unselected dependency.
    for relative_path in sorted(set(content_paths(root)) | set(changed_files) | set(CACHE_CONTEXT_FILES)):
        add_file_to_digest(digest, root, relative_path)
    for test in sorted(tests):
        digest.update(test.encode() + b"\0")
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
        print("not-applicable: E2E for recognized non-application changes; no application completion claim.")
        return

    tests = list(plan.tests)
    digest = build_impact_digest(ROOT, changed_files, tests)
    cache_enabled = (not os.environ.get("CI") and os.environ.get("WFS_DISABLE_TEST_CACHE") != "1"
                     and os.environ.get("WFS_ISOLATED_RUNNER") == "1"
                     and not os.environ.get("BASE_URL"))
    if cache_enabled and has_success_cache(CACHE_PATH, digest, tests):
        print(f"✅ Reusing successful impact result for unchanged digest {digest[:12]}.")
        return

    print("🚀 Running impacted tests...")
    for test in tests:
        print(f"  - {os.path.relpath(test, ROOT)}")

    from finish import run_command
    CACHE_PATH.unlink(missing_ok=True)
    # Local installed CLI avoids npx downloading a different candidate at run time.
    command = [shutil.which("node") or "node", str(ROOT / "pwa/node_modules/playwright/cli.js"),
               "test", *tests]
    status, detail = run_command(command, timeout=900, cwd=ROOT / "pwa")
    if status != 'passed':
        print(f"{status}: impact tests: {detail}")
        raise SystemExit(2 if status == 'blocked' else 1)

    post_test_changed_files = get_changed_files()
    post_test_digest = build_impact_digest(ROOT, post_test_changed_files, tests)
    if post_test_digest != digest:
        CACHE_PATH.unlink(missing_ok=True)
        print("failed: content/config/runtime mutated during tests; success discarded.")
        raise SystemExit(1)
    if cache_enabled:
        write_success_cache(CACHE_PATH, digest, tests)
        print(f"💾 Cached actual tested identity {digest[:12]}.")
    print("✅ Tests passed!")


def main() -> None:
    if "--impact" in sys.argv or "--all" in sys.argv:
        run_impacted(run_all="--all" in sys.argv)
    else:
        print("Usage: python3 test_ops.py [--impact | --all]")


if __name__ == "__main__":
    main()
