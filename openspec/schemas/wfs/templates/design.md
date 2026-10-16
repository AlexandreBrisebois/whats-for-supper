# Design

<!-- Create only when the schema's design conditions apply. Keep the core concise.
     Omit inapplicable conditional sections entirely; do not fill them with N/A.
     No section requires introducing a new abstraction, subsystem or dependency. -->

## Context and Existing Ownership

<!-- Refer to the proposal for motivation and scope. Identify current behavior,
     authoritative business-rule owners, reusable implementations and affected seams.
     Cite source paths/symbols. Distinguish observed facts from assumptions. -->

<!-- When business terms have conflicting meanings or rule ownership is unclear,
     resolve the affected terms with concrete scenarios and identify the capability
     that owns each rule. Reference terminology in its owning capability; distinguish
     context-specific meanings and describe necessary translations between them.
     Keep this proportional to the selected change. -->

## Decisions and Tradeoffs

<!-- Record agreed choices and why they fit the behavior. For consequential choices,
     explain the credible alternative and tradeoff. Identify proposed assumptions
     explicitly. Resolve questions that could change scope, behavior, approach or
     acceptance before producing dependent tasks. Keep each business rule with one
     owner and expose dependencies/side effects. Avoid speculative abstractions. -->

## First Observable Slice

<!-- Identify the smallest scenario that exercises every required internal seam.
     Name entry point, affected owners/layers, observable result and integration
     boundary. External-provider doubles belong at external boundaries. Include only
     layers this behavior needs; subsequent slices build on a working first path. -->

## State, Concurrency and Recovery

<!-- CONDITIONAL: stateful, asynchronous or retryable behavior.
     Describe allowed transitions and invariants; identify stale-response guards,
     competing updates, duplicate submission/idempotency and cancellation semantics
     where applicable. Explain partial success and recovery from the user's view.
     Reference observable requirements rather than duplicating them. -->

## Persistence and Side Effects

<!-- CONDITIONAL: persistence plus multiple effects, workflows or event publication.
     State the durability/transaction boundary, ordering, publication point, and
     behavior when a later effect fails. Identify the authoritative source of truth.
     Identify which affected invariants must hold together and which cross-owner
     updates may complete later, with their observable failure/recovery behavior.
     Do not promise atomicity or delivery guarantees the design cannot establish. -->

## Compatibility, Rollout and Reversal

<!-- CONDITIONAL: contract/data changes or rollout-sensitive behavior.
     Address affected clients and existing data, migration order and reversibility.
     State any irreversible step and recovery strategy. Tie feature flags or staged
     rollout to a concrete need; do not create infrastructure to fill this section. -->

## Operational Diagnosis

<!-- CONDITIONAL: background work, external services or consequential failure modes.
     Name the evidence needed to distinguish bad input, application defects and
     provider/infrastructure failures. Reuse existing logs/status/correlation fields;
     identify sensitive data that must not be emitted. State measurable performance
     or reliability acceptance only when relevant and grounded in the requirement. -->

## User Experience

<!-- CONDITIONAL: user-facing behavior.
     Describe primary action, loading/empty/error/success states and recovery.
     Preserve navigation during background work. Apply Solar Earth and accessibility;
     specify observable interaction/keyboard/focus checks where affected. Minimize
     decisions and repeated effort for busy households. -->

## Risks and Deferrable Questions

<!-- Include only material risks with mitigations and genuinely deferrable unknowns.
     A question is deferrable only if its answer cannot change the approved scope,
     behavior, approach or task breakdown. Omit this section if empty. -->
