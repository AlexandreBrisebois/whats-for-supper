#!/usr/bin/env python3
"""Private task-session baselines for attributing edits in a dirty worktree."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
SESSION_DIR = ROOT / ".task" / "agent-session"
MANIFEST = SESSION_DIR / "manifest.json"
VOLATILE_PATHS = {"pwa/next-env.d.ts"}


def git_paths(root: Path, *args: str) -> list[str]:
    output = subprocess.check_output(["git", *args, "-z"], cwd=root)
    return [item for item in output.decode("utf-8").split("\0") if item]


def visible_paths(root: Path) -> list[str]:
    """Return tracked and untracked, non-ignored files without reading .task output."""
    return sorted(set(git_paths(root, "ls-files", "-co", "--exclude-standard")) - VOLATILE_PATHS)


def changed_paths(root: Path) -> list[str]:
    changed = [
        *git_paths(root, "diff", "--name-only", "--cached"),
        *git_paths(root, "diff", "--name-only"),
        *git_paths(root, "ls-files", "--others", "--exclude-standard"),
    ]
    return sorted(set(changed) - VOLATILE_PATHS)


def fingerprint(path: Path) -> dict[str, str | int]:
    if path.is_symlink():
        return {"kind": "symlink", "target": os.readlink(path)}
    if not path.is_file():
        return {"kind": "missing"}
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return {"kind": "file", "sha256": digest.hexdigest(), "mode": path.stat().st_mode}


def snapshot(root: Path) -> dict[str, dict[str, str | int]]:
    return {name: fingerprint(root / name) for name in visible_paths(root)}


def changed_between(before: dict, after: dict) -> list[str]:
    """Return paths whose content identity changed between two snapshots."""
    names = set(before) | set(after)
    return sorted(name for name in names if before.get(name) != after.get(name))


def load_manifest(session_dir: Path = SESSION_DIR) -> dict:
    path = session_dir / "manifest.json"
    if not path.is_file():
        raise RuntimeError("no active task session; run `task agent:begin -- <task-id>` before editing")
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, KeyError) as error:
        raise RuntimeError(f"invalid task session manifest: {error}") from error


def begin(task_id: str, root: Path = ROOT, session_dir: Path = SESSION_DIR) -> dict:
    if not task_id.strip():
        raise RuntimeError("task id must not be empty")
    if (session_dir / "manifest.json").exists():
        active = load_manifest(session_dir)
        raise RuntimeError(
            f"task session {active.get('task_id', '<unknown>')} is already active; "
            "finish it or run `task agent:abort` before starting another"
        )
    session_dir.mkdir(parents=True, exist_ok=True)
    baseline = snapshot(root)
    ambient = changed_paths(root)
    # Preserve pre-existing dirty file content privately so an overlap can be
    # reviewed against the true task boundary rather than against HEAD. The
    # ignored snapshot is never printed or promoted to task evidence.
    snapshot_dir = session_dir / "baseline"
    for name in ambient:
        source = root / name
        if source.is_file() and not source.is_symlink():
            destination = snapshot_dir / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
    manifest = {
        "version": 1,
        "task_id": task_id,
        "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root).decode().strip(),
        "baseline": baseline,
        "ambient_at_start": ambient,
    }
    (session_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return manifest


def task_delta(root: Path = ROOT, session_dir: Path = SESSION_DIR) -> dict[str, list[str]]:
    manifest = load_manifest(session_dir)
    baseline = manifest["baseline"]
    current_names = set(visible_paths(root))
    all_names = current_names | set(baseline)
    owned = sorted(
        name for name in all_names
        if fingerprint(root / name) != baseline.get(name, {"kind": "missing"})
    )
    ambient_start = set(manifest.get("ambient_at_start", []))
    ambient = sorted(ambient_start - set(owned))
    overlap = sorted(ambient_start & set(owned))
    return {"owned": owned, "ambient": ambient, "overlap": overlap}


def abort(session_dir: Path = SESSION_DIR) -> None:
    if session_dir.exists():
        shutil.rmtree(session_dir)


def print_status(root: Path = ROOT, session_dir: Path = SESSION_DIR) -> int:
    manifest = load_manifest(session_dir)
    delta = task_delta(root, session_dir)
    print(f"Task session: {manifest['task_id']}")
    print(f"Baseline HEAD: {manifest['head']}")
    for label in ("owned", "ambient", "overlap"):
        paths = delta[label]
        print(f"{label}: {len(paths)}")
        for path in paths:
            print(f"  {path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument("--begin", metavar="TASK_ID")
    actions.add_argument("--status", action="store_true")
    actions.add_argument("--abort", action="store_true")
    args = parser.parse_args()
    try:
        if args.begin is not None:
            manifest = begin(args.begin)
            print(f"Started task session {manifest['task_id']} at {manifest['head'][:12]}.")
            print(f"Ambient paths preserved: {len(manifest['ambient_at_start'])}.")
            return 0
        if args.abort:
            abort()
            print("Removed task-session metadata; source files were not changed.")
            return 0
        return print_status()
    except RuntimeError as error:
        print(f"blocked: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
