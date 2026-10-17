# Design

## Context

See proposal.md. Cross-module source: `pdf-share.js` readwrite IndexedDB transactions on one pending key → `pdfShare.ts` bridge → `PdfCapturePanel` delivery epoch/token/member checks → `pdfCaptureStore` generation ownership → capture-owned confirmation. Root `PdfShareLifecycle` sits outside IdentityValidator, so token discard and URL removal can run on unlock/onboarding. Evidence: BSL-app-installation-007–009 in [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/app-installation.md).

## Goals / Non-Goals

**Goals:** preserve one-use staging and conditional foreground delivery while referencing accepted capture rules.

**Non-Goals:** durable queue, transactional recipe delivery, OS cold/warm launch qualification, full browser-storage reliability or new draft architecture.

## Decisions

- Record slot semantics from executable stage/claim/discard transactions rather than the wrapper unit-test title. `pdfShare.test.ts` only verifies mocked delegation; it does not exercise atomic storage.
- Stage commits before returning; claim deletes a matching pending entry before testing age/validity. A mismatched token leaves it untouched. Cleanup uses greater-than ten minutes; exact boundary remains claimable. No exact-time deletion promise.
- Preserve foreground protection through mounted state, current token, member identity and deliveryEpoch; foreground store generation prevents older reset from clearing replacement. Capture owner already defines the broader draft lifecycle and submission behavior.
- Keep public lifecycle discard separate from accepted household identity, with no copied cookie/auth policy.

## Risks / Trade-offs

- Browser tests call page bridge stage directly; workers are blocked. Cold/warm in the test name refers to page navigations/replacements, not installed OS launch → retain U74.
- Interruption test replaces claim and overrides document.visibilityState; panel unit tests mock navigation, bridge and API and directly set stores → do not label device behavior verified.
- Expiry test uses fixture-pinned 2026-05-04 12:00 then 12:11 clock, cleanup and claim; it establishes an assertion of expiry, not exact-time deletion or storage durability. Tests are inspected, not run.
- Storage exceptions: open blocked/error rejects, transaction errors abort, discard catches failures, lifecycle/activation cleanup catches failures. Removal cannot be guaranteed after failed storage access → fresh delivery guidance, bounded claim eligibility only.

## Migration Plan

Documentation-only strict validation, authorized sync and scoped task verify. No deployment, implementation or archival.
