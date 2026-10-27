# Reproduce the audit evidence

Run from the repository root on the recorded source revision. The code below checks canonical source hashes, extracts archived one-off experiment source into a fresh external temporary directory, regenerates inventory/candidates/recorded reviews/links/benchmark payloads, and compares them to the durable evidence. It installs nothing and writes no repository files. The CSV inventories are regenerated in the temporary directory.

Human classifications are replayed from recorded decisions; running the program does not independently validate semantic judgments. Exact model tokens remain unavailable. Experimental source is preserved as JSON data, not installed production tooling. No OpenSpec or Taskfile configuration change is required.

```sh
python3 -B - <<'PY_REPRODUCE'
from pathlib import Path
import hashlib, json, subprocess, sys, tempfile
root = Path.cwd().resolve()
audit = root / 'docs/audits/openspec-architecture'
evidence = audit / 'evidence'
expected = json.loads((evidence / 'inventory.json').read_text())
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == expected['head'], 'Source HEAD changed; refresh audit rather than replay stale reviews'
for f in expected['files']:
    assert hashlib.sha256((root / f['path']).read_bytes()).hexdigest() == f['sha256'], f['path']
archive = json.loads((evidence / 'experiment-sources.json').read_text())
work = Path(tempfile.mkdtemp(prefix='wfs-openspec-audit-reproduce.')).resolve()
for name, source in {**archive['sources'], **archive['supporting_data']}.items():
    target = work / name
    assert target.resolve().is_relative_to(work)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source.replace('/tmp/wfs-openspec-audit.Gst1Xs', str(work)))
def run(*args):
    result = subprocess.run([sys.executable, '-B', *map(str, args)], cwd=root, capture_output=True, text=True)
    (work / ('command-' + str(run.number) + '.log')).write_text(result.stdout + result.stderr)
    run.number += 1
    assert result.returncode == 0, result.stderr
run.number = 0
run(work/'inventory/extract_inventory.py', '--root', root, '--output', work/'inventory')
run(work/'overlap/candidates.py', work/'inventory/requirements.json', work/'overlap')
run(work/'overlap/review.py')
run(work/'overlap/links.py')
run(work/'benchmark/measure.py', '--repo', root, '--inventory', work/'inventory', '--output', work/'benchmark')
for actual, reference in {
    'inventory/inventory.json': 'inventory.json',
    'inventory/requirements.json': 'requirements.json',
    'overlap/candidates.json': 'overlap-candidates.json',
    'overlap/reviewed.json': 'overlap-reviewed.json',
    'overlap/summary.json': 'overlap-summary.json',
    'overlap/links.json': 'canonical-links.json',
}.items():
    assert (work/actual).read_bytes() == (evidence/reference).read_bytes(), actual
for name, content in json.loads((evidence/'benchmark-payloads.json').read_text()).items():
    target = work/'benchmark'/name
    if target.exists():
        assert target.read_text() == content, name
a = json.loads((work/'benchmark/results.json').read_text())
b = json.loads((evidence/'benchmark-results.json').read_text())
for value in (a, b):
    value['generation'].pop('elapsed_seconds_this_evidence_build')
assert a == b, 'Benchmark metrics differ'
print('PASS: inventory, source hashes, all candidate/review evidence, local links and benchmark payloads/metrics')
print('Temporary reproduction artifacts:', work)
PY_REPRODUCE
```

The lead executed this exact reproduction protocol before completing the review package; outcome and temporary path are recorded in `evidence/lead-final-reproduction.json`. Changing canonical input or HEAD requires a fresh audit and review, not editing the expected counts to force equality. Strict structural validation is separately available as `task spec:check` with pinned OpenSpec 1.14.3.

Finalization note: the live checkout advanced to `e680fb7966978da3fbde25453a241c7e69e2b2a1` through an unrelated two-file commit. Canonical hashes remain identical, as recorded in evidence/final-revision-reconciliation.json. The strict protocol above intentionally checks the original HEAD because its byte-identical inventory includes revision metadata; it will stop at that gate on the newer checkout. No branch checkout is performed automatically. Content-identity verification of the current canonical files was completed separately by the lead.
