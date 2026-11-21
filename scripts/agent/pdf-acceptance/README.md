# Finite PDF acceptance tooling

Run from the repository root after installing the pinned PWA dependencies:

```sh
node --test scripts/agent/pdf-acceptance/acceptance-selftest.cjs
```

The agent test suite also invokes this offline suite through
`scripts/agent/tests/test_pdf_acceptance.py`. It needs Node and the installed
TypeScript/Kiota dependencies. It starts no listener, API, database, browser or
container and sends no network request.

The operator and its strict guard come from the independently reviewed future
MASTER query repair retained under
`.task/dependable-portions-coordinator/pdf/demand-query-guard-repair/`.
The originally imported `acceptance.cjs` SHA256 is
`d3cc7aa2f6e9b4c311a88ce36acc01c0169fa515f831886ac785b9a463a04ebc`.
The maintained source additionally requires the imported `date-admission.cjs`
in the runtime source manifest and independent review byte closure. Its omission,
changed bytes or omitted reviewer binding fail closed.

That query repair admits exactly one matching `referenceWeekStartDate` query for the
owned grocery check. Original failed PDF3 campaign sources and receipts remain
unchanged; this source does not retroactively qualify that campaign.

`action-wire-offline.cjs` loads current application wrappers, generated Kiota
serializers and the actual fetch adapter, replacing only transport and unrelated
store/localization dependencies. All nine finite mutations are serialized and
checked against the operator. Editor requests additionally use the actual
recipe read decoder/normalizer and ingredient draft owners. A synthetic read
response precedes each editor write; exactly one mutation is allowed per action.
Multipart capture uses the actual PDF wrapper and FormData. Cleanup uses the
captured current removal token through the real slot owner. No server outcome or
PDF renderer is qualified by these tests.

The included two-page PDF is a synthetic fixture; no matching tracked fixture
existed when this tooling was retained. Its 1330 exact bytes and SHA256 remain
part of the strict capture contract. `fixture-source.json` has synthetic operation
identity and no candidate/image authority. It is deliberately unadmitted and
cannot authorize a live operation.

For a separately authorized operational campaign, copy the complete maintained
source bundle into a task-owned ignored operation directory, bind a fresh exact
candidate/configuration/source manifest and independently reviewed dates, and
supply the existing operation preparation, source review, render, baseline,
backup/deployment and phase receipts. The operator's admission checks enforce
those dependencies before mutation. Never run it in this tracked directory or
reuse the synthetic dates as proof that live weeks are absent. Keep reports,
screenshots, secrets, dumps and private household data outside Git. Root remains
the sole DV mutator for the current release.

The grocery check binds the exact `presentationEpoch` from the ordinary demand
read. The finite guard requires its serialized `expectedPresentationEpoch` to
match that captured value and retains the existing source, query, amount and
identity checks.
A captured nil UUID is valid for presentation epochs only.
