# Design

## Context and Existing Ownership

The [proposal](proposal.md) selects documentation-only investigation. The [inventory](../../../docs/telemetry/journey-inventory.md) seeds known experiences from existing canonical specs and source. The [tracker](../../../docs/telemetry/README.md) owns session state; this change's tasks own investigation completion. Baseline implementation remains with F1/F2/F3 and is not a prerequisite for reading existing journeys.

## Decisions and Tradeoffs

One walkthrough group per session: planning/voting; plan changes; groceries/extras; access/search/cooking; capture/repair/library. Start with the current capability and follow only its actual UI -> generated client -> contract -> controller -> service -> commit/publication boundary. Use docs/user-guide and flow diagrams as navigation, verify canonical/source behavior, and label historical diagrams explicitly. Do not assume a click, optimistic view or HTTP 2xx proves commitment.

For each inventory row record source identity, entry, intended task, presentation, trusted outcome, cancellation, handled/unexpected failure, retry/recovery, existing automatic coverage, proposed custom event owner/carrier/fields/correlation, approximate frequency, remaining receiver gaps, exact tests and actual walkthrough/qualification status. The schema is in the inventory. Candidate names are proposals, not a global generic event bus. No emitter call sites become implementation tasks before this trace and the selected journey's consequential semantics are resolved.

Keep Discovery's personal exhausted-feed result distinct from household convergence and persisted votes. Convergence stops the UI but does not close the persisted voting round; late submitted votes can commit. Close Voting promotes suggestions through separate requests before atomic round close. Grocery has committed checks and aisle-complete presentation, not a persisted shopping-trip completion operation. Capture acceptance/readiness and cooking completion/overnight automatic finalization are distinct. These distinctions determine questions and safe emitter placement.

Privacy retains document-local anonymous scopes and accepts reload gaps; asynchronous capture/repair may outlive a document. Before proposing any background correlation, identify bounded operation lifetime, storage/restart needs and conflict with the agreed no-cross-document/no-person policy. Never reuse recipe/import/workflow/member/round IDs as anonymous correlation or quietly add durable telemetry state.

Choose one narrowly useful next implementation change only after its row is traced. Include contract/client/mock changes when real API propagation is needed, preserve producer authority, and reuse existing .NET providers/log bridges. SDK/transport changes require evidence at that selected slice; do not turn inventory into a platform migration or receiver workflow engine.

## First Observable Slice

I1: trace Open Voting, multi-vote Discovery and Close Voting from current specs through their source/test owners. If an isolated existing UI is available, walk those screens with synthetic state; otherwise record not-run without claiming a completed live walkthrough. Produce exact proposed emitter boundaries and test/receiver gaps for one selected next proposal. Stop before instrumentation or generating all successor changes.

## Operational Diagnosis

Evidence states are separate: source seed, source traced, local UI observed, proposed change, implemented, protected receiver qualified, deployed qualified and device qualified. A blocked or unavailable UI does not erase useful source work; it leaves that evidence cell open. A documentation-only inventory session uses link/source/contract consistency checks and scoped repository verification; it does not run a fake TDD cycle. Keep source-derived claims distinct from unit/mock passes, actual database/exporter seams and device behavior.
