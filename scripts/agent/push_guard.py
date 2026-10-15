#!/usr/bin/env python3
"""Ensure local push validation refers to clean, committed source."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def validate(root: Path, expected_head: str) -> None:
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if head != expected_head:
        raise RuntimeError('Checked-out revision changed during validation; rerun task check:push.')
    target = os.environ.get('PRE_COMMIT_TO_REF')
    if target and target != head:
        raise RuntimeError('The pushed revision is not checked out; check out that revision before pushing.')
    dirty = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=root, text=True)
    if dirty.strip():
        raise RuntimeError('Push validation requires a clean worktree. Commit or preserve pending tracked/untracked changes first.')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-head', required=True)
    args = parser.parse_args()
    try:
        validate(ROOT, args.expected_head)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f'blocked: {error}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
