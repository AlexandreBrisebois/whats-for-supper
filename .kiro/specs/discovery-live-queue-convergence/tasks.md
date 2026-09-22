# Discovery live queue convergence — tasks

## DQC-1 — Converge a loaded Discovery tail from absolute Like counts

- [x] Implement this selected tracer-bullet only.

**Requirements:** DQC-R1 through DQC-R4.

**Authorized effects:** `specs/openapi.yaml`; Discovery DTO/service/controller tests; generated PWA client; Discovery wrapper/store/SSE tests; Discovery E2E mocks and tests; this spec package. No calendar, consensus, category, vote-policy, or visual redesign change.

**Work:** Add optional Discovery `voteCount` contract support and seed the local queue on each Discovery fetch. Replace the visible-only interest promotion with a stable sort of the loaded tail by absolute count while preserving index zero. Ensure an SSE update does not make a Discovery GET.

**Checks:** targeted API and PWA tests, Discovery E2E, generated-client/type/lint checks, contract reconciliation and applicable drift checks. Record passed, failed, blocked, not-run, and not-applicable evidence.

**Stop:** Do not refetch per vote, use client ranking formulas beyond count plus fetch ordinal, or broaden into the deferred voting-window, capacity, eligibility, or server-rotation work.

**Implementation evidence — 2026-09-21:** Focused PWA store/SSE tests (50) and PWA typecheck passed. Generated client synchronization passed after a sandbox-timeout retry. The filtered Discovery API test compiled the API but did not return a test result before the command window ended; it remains not-run for completion evidence. `git diff --check` passed.
