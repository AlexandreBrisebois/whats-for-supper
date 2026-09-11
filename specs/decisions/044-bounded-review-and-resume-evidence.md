# ADR 044: Bounded review backlog and resume evidence

Status: Accepted for the HM-E harness migration; no product behavior change.

## Context

The 2026-05-11 repository memory described why the CNF cross-spec review moved
from one broad conversation to independent decision branches: preserve unresolved
seam questions, examine one risk without loading the whole system, and make review
state durable across interruptions. Its blanket interviews and mandatory personas
went beyond that useful rationale.

The current [CNF review requirements](../../.kiro/specs/cnf/cnf-cross-spec-review/requirements.md)
and [design](../../.kiro/specs/cnf/cnf-cross-spec-review/design.md) still retain that
branch backlog and household-utility intent. The
[shared specification workflow](../../.agents/core/specification-workflow.md) already
supports conditional branch manifests and consequential decisions with options.

## Decision

Keep large review backlogs in their selected specification. A branch tracks the
issue, affected specs, status, decision and next action. Preserve explicitly selected
one-branch review conversations; do not turn that workflow into a universal interview,
mandatory persona or permission to implement. Findings-only review is a valid result.

Use HANDOVER as a compact resume checkpoint whose evidence must be checked against
current files. Store detailed task results in specs and durable rationale in ADRs.
Shared loading and execution owners define the procedure; history adds no authority.

## Consequences

Review intelligence survives a new session without compulsory history loading or
multi-file turn-end writing. Source provenance and obsolete decisions remain in the
[HM-E ledger](../../.kiro/specs/harness-modernization/hm-e-ledger.md).
JOURNAL remains searchable frozen history, including unresolved historical proposals
that are not automatically active tasks.

Provenance: retired `.agents/core/memory/2026-05-11-spec-review-evolution.md`,
lines 1–29; `.agents/MEMORY.md`, lines 18–23; session-review evidence/handoff content.
Historical conversation reference: `b1429092-d27d-4b59-ace4-84aa6e5d3b94`.
