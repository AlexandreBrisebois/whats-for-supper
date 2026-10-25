# Beta context explanation proposal

## Why

[Issue #345](https://github.com/AlexandreBrisebois/whats-for-supper/issues/345) asks for understandable pre-release context in place of the tiny unexplained Beta hint. Reusing the Demo interaction lets a household learn once and reopen the explanation without repeated interruptions.

## Outcome and Scope

**Draft for Alex's review; specification preparation only.** The behavior below is proposed, not approved or implemented. This PR must not close #345. No runtime code, credentials, dependency pins, deployment or production testing changes are included.

Publish this specification independently from main; later implementation depends on the actual reusable Demo work in [PR #348](https://github.com/AlexandreBrisebois/whats-for-supper/pull/348). That PR remains unmerged at `fdde5fe3a6721582e2ec00dda5429936d9f17c82`. Main is `4414c7379000b11d0f4411b4213ee71b98eb651c`; it contains Home #339 and duration #346 with archived specs, but not DemoContext. Recheck both heads before applying any approved plan.

The review asks Alex to approve the exact copy, initial query-free Home eligibility, and retaining Demo-first combined-mode precedence. These are explicit proposals. Dependent implementation task generation/application waits for that approval; [design](design.md) records alternatives and acceptance.

## What Changes

- Beta-only gets the same compact purple/white top band and reopenable phone sheet / iPad dialog as Demo, with pre-release copy in EN/FR.
- A first normal ready Home visit can introduce the explanation before interaction. Deep links and active work suppress automatic introduction for that app visit, with no delayed interruption.
- Explicit dismissal uses a separate browser-local Beta acknowledgement; failures use visit memory. Cosmetic edits, member changes and household resets do not replay it.
- Proposed overlap policy retains Demo-first presentation and the existing accessible Beta-channel hint, without stacked introductions or cross-mode acknowledgement.
- Authentication, member selection, household data, AI policy, capture, cooking, planning, voting, resets, icons/manifests and release identity stay with their existing owners.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-installation`: add informational Beta release-context presentation and acknowledgement requirements. This owner already covers install-facing identity and shell presentation; access remains owned by `household-identity`, and Demo behavior by `demo-household`. No parallel onboarding capability is introduced.

## Impact

This change adds only planning artifacts. A later approved implementation would reuse the existing identity provider, DemoContext visit/eligibility pattern, DemoDialog, shared Layout and locale files; see immutable source links in [design](design.md). No API, OpenAPI, generated client, database or server acknowledgement change is proposed. The spec PR is based on main so its diff contains only Beta documents; stacking it on #348 would unnecessarily include application code and complicate review.
