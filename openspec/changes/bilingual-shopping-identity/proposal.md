# Bilingual shopping identity

## Why

Mechanical description normalization cannot safely identify equivalent French/English foods or distinguish preparation from purchase facts. Grocery generation must use saved validated identities deterministically.

## Outcome and Scope

App-owned IDs, validated EN/FR labels and exact aliases, protected shopping names and import/reprocessing proposals. No runtime AI, automatic dictionary-wide publication or translation-based guesses. Dataset choice remains gated by corpus/licence evaluation.

## What Changes

- **BREAKING:** adopt the applicable shared [contract](../canonical-ingredient-correction/contracts.md) with explicit compatibility/failure behavior.
- Preserve user decisions and existing safety boundaries in the shared [review](../canonical-ingredient-correction/review.md).
- Add adversarial acceptance from the shared [corpus](../canonical-ingredient-correction/acceptance-corpus.md); no product implementation in this session.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: apply this change’s bounded grocery requirements.

## Impact

Depends on the canonical foundation and companion ownership map as specified in design.md. Future apply must synchronize OpenAPI, generated clients, consumers and stateful mocks where affected, and qualify actual persistence/workflow seams. Planning existence does not establish implementation readiness.
