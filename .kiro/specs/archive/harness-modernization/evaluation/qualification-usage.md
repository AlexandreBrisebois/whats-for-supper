# HM-Q operator tooling

Status: delivered and tested. Model/native/efficiency evaluation was waived by the
user; see [acceptance](../hm-q-validation.md). Tools never fabricate a qualification pass.

Use Python with `PyYAML==6.0.3` and `jsonschema==4.26.0` in a disposable virtual
environment. The original package checker remains dependency-light; the new record
validator deliberately uses a complete JSON Schema implementation.

From the repository root:

```sh
python3 -B .kiro/specs/harness-modernization/evaluation/test_qualification.py
python3 -B .kiro/specs/harness-modernization/evaluation/qualification.py plan --configuration codex-astra --host codex --model gpt-6-astra --output /tmp/new-hmq-records
python3 -B .kiro/specs/harness-modernization/evaluation/qualification.py export --workspace /tmp/new-hmq-workspace --evidence /tmp/new-hmq-evidence --variant candidate --fixture F06 --candidate ca048a2b3368f91786646e990b8435a8fc9c3867
python3 -B .kiro/specs/harness-modernization/evaluation/qualification.py report /tmp/new-hmq-records
```

Use fresh output paths each time. `plan` writes 48 not-run records per configuration;
it does not establish that the requested model exists or is accessible. `export`
uses the frozen application baseline and only the A–E implementation path allowlist
from the selected committed candidate. Unrelated product changes are excluded.
Compare export application identities before a pair. Shared evaluator-link
neutralization is listed with before/after hashes in each export record.

The exported workspace is staging only. Any future model run needs a separate
process/filesystem environment and an empty disposable host profile. Never mount
the source checkout, its Git objects, operator evidence, oracles or host memory into
the model environment. No launcher is supplied by this waived scope. Preserve exact
fixture prompts and protocol invocation wrappers; do not inject oracle/control text.

For future scored records, supply actual pinned settings, transcript and content
evidence, operator-reviewed assertions and telemetry under the existing schema.
Evidence references are relative files under the records directory. The report
validates these references for passing runs and retains failed-attempt cost; it
does not decide adoption. Native loading, per-pair configuration equivalence,
transcript review and real affected gates remain separate obligations if evaluation
is later resumed. A schema-valid record alone cannot prove its assertions.
