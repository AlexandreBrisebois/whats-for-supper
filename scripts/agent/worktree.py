#!/usr/bin/env python3
"""Stateless content snapshots for detecting preparation writes."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess

VOLATILE_PATHS = {"pwa/next-env.d.ts"}


def git_paths(root: Path, *args: str) -> list[str]:
    output = subprocess.check_output(["git", *args, "-z"], cwd=root)
    return [item for item in output.decode("utf-8").split("\0") if item]


def visible_paths(root: Path) -> list[str]:
    """Return tracked and untracked, non-ignored files without reading .task output."""
    return sorted(set(git_paths(root, "ls-files", "-co", "--exclude-standard")) - VOLATILE_PATHS)


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
