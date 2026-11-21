"""Run both harness suites without an invoking Git hook's repository context."""
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def main():
    names = subprocess.check_output(
        ['git', 'rev-parse', '--local-env-vars'], cwd=ROOT, text=True,
    ).splitlines()
    env = {key: value for key, value in os.environ.items() if key not in names}
    result = subprocess.run([
        sys.executable, '-B', '-m', 'unittest', 'discover',
        '-s', 'scripts/agent/tests', '-p', 'test_*.py',
    ], cwd=ROOT, env=env)
    if result.returncode:
        return result.returncode
    tests = sorted(path.relative_to(ROOT).as_posix()
                   for path in (ROOT / 'scripts/ci').glob('*.test.cjs'))
    if not tests:
        raise RuntimeError('No shared CI selector tests were found.')
    return subprocess.run(['node', '--test', *tests], cwd=ROOT, env=env).returncode


if __name__ == '__main__':
    raise SystemExit(main())
