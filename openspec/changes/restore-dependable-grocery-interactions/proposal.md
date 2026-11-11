# Dependable grocery interactions

> **Delivery baseline — 2026-11-10:** Baseline delivery dependency. Reuse the implemented row/check and interaction work; remaining acceptance is tracked in this change. Bilingual equivalence is not a prerequisite for its conservative grouping and check guarantees. See the [release scope and agent coordination](../canonical-ingredient-correction/proposal.md#dependable-portions-delivery-baseline--accepted-2026-11-10).

## Why

The original defects were shared name-level checks across different unit rows and successful extra mutations always focusing Edit. The implemented corrections provide independent checks and stable interaction while amounts change; remaining qualification is tracked in tasks.md.

## Outcome and Scope

Row-scoped checks, proven-increase reset, removal of prior-unknown acknowledgement, focus/scroll preservation and category-control parity. Can ship before canonical facts using a reusable row identity. At the approved no-active-list upgrade, the next recipe-derived list starts new and unchecked; historical list/check data and extras remain preserved.

## What Changes

- **BREAKING:** adopt the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with explicit compatibility/failure behavior.
- Preserve user decisions and existing safety boundaries in the shared [review](../canonical-ingredient-correction/review.md).
- Add adversarial acceptance from the shared [corpus](../canonical-ingredient-correction/acceptance-corpus.md); the separately approved group 5 display slice is implemented, while the broader work remains open.

## Proposed known-amount display amendment — 2026-11-10

Expose a trusted numeric scalar/range even when its display unit is null, empty or whitespace-only, including zero. Append only a supplied usable unit; hide genuinely missing amounts. Preserve the existing three-decimal display convention, EN/FR known-subtotal wording, arithmetic, grouping, row/check identity and source disclosure. This is a display-only amendment, independent of bilingual catalogue adoption; it does not merge garlic/ail or count/volume/mass rows.

Alex approved this bounded display amendment and its implementation on 2026-11-10. This deliberately replaces the current grocery rule that hides known amounts without units. A bare number is more informative but does not identify an absent purchase unit; no clove, head, piece, density or package conversion is inferred. No new warning, badge or row is proposed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: apply this change’s bounded grocery requirements.

## Impact

Depends on the canonical foundation and companion ownership map as specified in design.md. Future apply must synchronize OpenAPI, generated clients, consumers and stateful mocks where affected, and qualify actual persistence/workflow seams. Planning existence does not establish implementation readiness.
