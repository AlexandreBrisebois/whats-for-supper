# Design

## Context

See `proposal.md` for motivation. This documentation extraction crosses the two existing browser journeys and benefits from explicit boundary decisions: a disabled UI action is not server idempotency, and preview cancellation is not request cancellation. Current source identities, assertions and full coverage mapping are recorded in BSL-recipe-sharing-005–008 in [the capability plan](../../../../docs/openspec-baseline/recipe-sharing.md).

## Goals / Non-Goals

**Goals:** Extract the two unrecorded pending-control behaviors without duplicating the nine promoted requirements. Keep evidence confidence, limitations and lifecycle status independent.

**Non-Goals:** No new architecture, implementation, contracts, test changes, persistence guarantees, promotion or archival. Runtime qualification remains not-run under A34.

## Decisions

1. **Use a new additive delta for the two pending controls.** The original active sharing delta has the same 9 requirement/34 scenario blocks as main and includes staged evidence relocation. Extending it would mix already-promoted content with unreviewed additions. Preserve it and main byte-for-byte; use the existing `recipe-sharing` capability rather than a new capability. The three scenarios add only disabled/repeated-activation state and release after successful delivery; preparation notice, errors and retry results remain owned by existing requirements.

2. **First slice: pending Share control (BSL-recipe-sharing-006).** `RecipeDetailSheet.handleShareRecipe` guards `isSharingRecipe`, sets it before awaiting `getRecipeShareBundle`, awaits `downloadRecipeBundleFile`, and clears it plus the toast in `finally`. The visible Share button uses `disabled={isSharingRecipe}`. The component test for a slow bundle asserts one request after repeated click, a persistent toast, disabled control, and cleanup; its export/delivery functions and toast store are substituted. Delivery-success re-enabling follows source `finally`; that exact assertion is absent. Do not convert this into an atomic click lock or backend deduplication promise.

   Real boundary traced: detail → recipes wrapper → generated GET share builder → OpenAPI GET share → controller (member/hero check) → service DB read and image reads → bundle → native share or anchor download. `navigator.canShare` is evaluated outside the delivery catch; capability-probe errors do not receive the same fallback as rejected `navigator.share`. Actual device behavior is unqualified.

3. **Second independent slice: pending import acceptance (BSL-recipe-sharing-007).** `MinimalCapture.handleAcceptBundle` guards `isBundleSubmitting`, sets it while awaiting `importRecipeShareBundle`, and clears it in `finally`. The accept Button receives both `disabled` and `isLoading`; `Button.tsx` renders a spinner and a disabled native button. No direct pending-import assertion was found in the selected tests; confidence is medium and source-supported. Scope the scenario to review remaining displayed: Cancel is still clickable, clears local submitting state, and does not abort an in-flight request.

   Real boundary traced: capture parsed bundle → import wrapper → generated POST import builder (`data` response) → OpenAPI POST import-bundle → controller → `ValidateBundle` → DB add/SaveChanges → metadata write → optional hero → originals → mapped DTO → `SuccessWrappingFilter` → wrapper mapping → success screen/Done. The filter wraps the created RecipeDto in `data`, while excluding bundle responses; no response-envelope discrepancy is inferred from the controller alone. DB and asset writes are separate effects, without rollback coordination or retry idempotency demonstrated here.

4. **Reuse immediate shared owners only.** Household-identity owns “Gate protected page entry with household access”, “Apply member context after household access”, and “Authenticate protected API requests independently”. Recipe-library owns “Represent persisted recipe attribution and readiness” and “Exclude soft-deleted recipes from standard library listings and search”. These explain context, DTO state and eligible duplicate queries; they do not imply extra export eligibility or universal duplicate prevention. No shared-owner files change.

## Risks / Trade-offs

- [Promoted text exceeds source at some boundaries] → Retain existing requirements; record RS-U01–RS-U09 and U05/U53–U57 in the capability plan as non-normative review findings, rather than silently correcting accepted text.
- [Substituted assertions are mistaken for integration qualification] → API tests default to EF in-memory storage, InMemoryRecipeStore, mocked orchestration and disabled authentication; component tests replace API calls, stores and detail overlay. Browser routes substitute bundles and import responses (200 rather than contract 201). No tests run in this session.
- [Pending UI controls are mistaken for exactly-once creation] → Claims cover disabled actions in their displayed pending state only. In-flight cancellation, uncertain-response retries, partial asset failures, parallel clients and remounts have no idempotency/atomicity guarantee.
- [Version/format and serializer fidelity disagreements] → Keep U53/U54 and RS-U01/RS-U07 visible. Client validation is a shape check, server base64 decoding is a separate boundary, and serialization does not preserve every server DTO field.

## Migration Plan

No runtime migration, deployment or rollback applies. Stop with validated planning drafts. Human review must examine the evidence map and limitations and separately authorize any promotion. No automatic apply or archive step is appropriate for documentation-extraction completion.
