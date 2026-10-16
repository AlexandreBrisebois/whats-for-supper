# Proposal

## Why

The promoted meal-planning baseline covers week reading and ordinary empty-day recipe assignment, but does not describe the existing recipe-free supper-plan lifecycle. Extracting this bounded journey makes its save, edit, clear and failure boundaries reviewable without changing application behavior.

## What Changes

- Add source-supported requirements for dated Other plans entry, sheet drafts/validation, protected save, recipe conflict, skipped calendar persistence, response handling and recipe-free clear.
- Describe pending controls, guarded rereads, editable failure recovery and the connected Home handoff, reusing promoted reading and live-update ownership.
- Record source identities, inspected assertions, persistence/publication ordering and limitations in the capability plan. Preserve U95–U115 and earlier qualifications; withhold disputed reachability, schema parity, concurrency, rollback and convergence guarantees.
- Produce documentation-extraction tasks only. Stop at a validated draft for human review.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: ADDED requirements for creating, editing and clearing recipe-free non-cooking plans. Preserve the existing Purpose and all 30 promoted requirements/70 scenarios unchanged.

## Impact

Documentation only: this change's proposal/design/delta/tasks/CLI metadata, `docs/openspec-baseline/meal-planning.md` and the small baseline index. Evidence follows Planner/pivot/sheet → browser wrapper/generated client → OpenAPI → controller/service/relational boundary → slot or week publication → rereads/stores/Home. Access remains household-identity; recipe facts remain recipe-library; connection and snapshot guards remain household-live-updates. Grocery internals, suggestion policy, voting/locking, recipe replacement/removal policy, move/defer, cooking, capture, notifications, administration, maintenance, demo and deployment are excluded.

No application, tests, contract, generated client, SQL, dependencies or configuration changes. No services or runtime/API/browser/network/database/model qualification. No consequential unresolved product choice is needed for supported clauses: discrepancies remain non-normative under U116–U122 in the capability plan, pending separately authorized treatment. No promotion, archive, implementation or successor slice is authorized.
