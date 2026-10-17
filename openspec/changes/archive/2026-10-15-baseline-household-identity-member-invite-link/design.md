# Design

Archived 2026-10-15 under A25 after main-spec promotion. The text below records
the extraction-time scope and state; current main identity has 18 requirements/49
scenarios. See [archive record](tasks.md#archive-record--2026-10-15).

## Context

See [proposal](proposal.md) for motivation and [identity delta](specs/household-identity/spec.md) for the six additions/18 scenarios. This is a documentation extraction design, included because the journey crosses sharing, signed household access, cookie writes, client identity and navigation boundaries. It introduces no architecture or application implementation.

Source identity: `moving-to-openspec`, commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`. BSL-household-identity-006/007/008 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md) supply ordered source/test traces. A23 authorizes this draft; A17 and A22 govern excluded claims. The [main identity spec](../../../specs/household-identity/spec.md) stays unchanged at 12 requirements/31 scenarios.

## Goals / Non-Goals

**Goals:** Document the smallest connected invite journey, distinguish requesting member selection/navigation from completed identity recovery, and make failure feedback reviewable with explicit evidence limits.

**Non-Goals:** Designing a new invitation protocol, strengthening issuer authorization, signing member/redirect parameters, adding eligibility or expiry checks, making writes transactional, fixing errors/copy or qualifying deployment/browser behavior.

## Decisions

### Extend household identity without rewriting its shared rules

The first observable slice is Settings member Invite → generated link → Copy/native Share → public invite page → signature validation → cookie/state handoff → requested Home navigation. The source spans [FamilyManagement](../../../../pwa/src/components/profile/FamilyManagement.tsx), FamilySelector/FamilyMemberList, [InviteLinkDialog](../../../../pwa/src/components/common/InviteLinkDialog.tsx), [auth actions](../../../../pwa/src/lib/auth.ts), InvitePage and existing identity infrastructure. The delta adds invite-specific entry and feedback, then refers to existing page-gate/member lookup/recovery/display requirements.

A new invitation capability would split the approved household-identity owner. Restating its existing `/me` or page-gate requirements would duplicate policy; editing them would exceed this additive extraction. No change to the main Purpose is authorized.

### Treat generation and sharing as the connected UI path

The Settings row supplies ID/name and the dialog supplies `window.location.origin` to getInviteLink. It is a Next server action, not an OpenAPI invitation endpoint. Generation reads HEARTH_SECRET, signs timestamp text with HMAC-SHA256 and returns the encoded secret/member query fields. No member lookup or persisted invitation is involved. Native Share is conditional on browser support; Copy awaits clipboard success before temporary feedback. The spec claims invocation/copy feedback, not successful recipient delivery.

The action itself has no explicit current-access-cookie check; the connected Settings surface is page-gated. This does not settle broader issuer/operator permissions. The token does not sign memberId or redirect and has no age/single-use check. Under A17/A22, these remain non-normative observations, not credentials proving personal identity or a desired invitation security policy.

### Describe requested handoff without an atomic-completion guarantee

`pwa/src/app/(auth)/invite/page.tsx` accepts query inputs, awaits validateHearthSecret, then setHearthCookie, then the first setFamilyMemberCookie when memberId is truthy. It calls [familyStore.selectFamilyMember](../../../../pwa/src/store/familyStore.ts) without awaiting it, calls [completeOnboarding](../../../../pwa/src/store/onboardingStore.ts) and requests navigation. Selection repeats the member-cookie action before writing a readable fallback and updating client state. Both server cookie actions use the existing one-year/HttpOnly/Lax/root-path/domain/conditional-Secure implementation; retention is not expiry.

The spec therefore describes the initial cookie write, requested selection, onboarding flag and requested default Home navigation. It does not promise that client selection finishes first, all writes succeed together, or Home is the final visible page. If memberId is absent/empty, the route preserves prior member/onboarding state; a fresh browser still encounters existing identity gates. With a different existing member, initial cookie replacement and selection request target that member; old client state can persist during the asynchronous handoff (U17).

Claiming completed selection before navigation would contradict the source. Making the code await/rollback would be implementation outside A23. Malformed/unknown IDs pass into initial actions without a lookup; these observations remain U16, not normative eligibility/rejection requirements.

### Reuse the subsequent API boundary and bound redirects

The proxy validates access and requires only a nonempty member cookie for ordinary app pages. The root IdentityValidator exempts invite and later handles missing/current selection. Home serverFetch forwards access and member context for `/api/family` and schedule. Browser family calls use the generated client: `/api/family/me` → FamilyController.GetMe → GUID header/cookie binder → FamilyService → EF family-member reads. This reads membership; it does not redeem or create invitations.

U13 remains: unknown parsed member IDs yield an implemented 404 omitted from OpenAPI/generated error mapping; the client collapses lookup errors to null. Loaded nonempty-list conditions limit stale-selection clearing. U14 cookie-auth metadata and U15 configuration/transport/recovery gaps remain. The delta does not restate these as invite-time guarantees.

A nonempty supplied redirect is passed unchecked to router.replace, while the member-link generator supplies none. The draft covers only the default Home request and existing downstream gates. A blanket redirect requirement could turn unchecked targets into a security promise; its behavior stays evidence/U18. The voting generator and journey remain outside this change.

### Separate visible rejection from rollback and recovery qualification

Missing/empty token, false validation or caught initial action failures show the same invalid-link screen and `/welcome` anchor. Welcome resumes its already specified passphrase journey; the anchor carries no saved member/redirect. Earlier successful writes are not rolled back, rejected links do not clear existing state, and the route catch does not catch later unawaited selection rejection. The draft's error scenario is limited to initial awaited actions.

Expiry wording in English/French error copy does not establish age enforcement. Missing generation secret leaves the dialog generating; rejected generation promises have no visible handling. Share/copy errors are silently caught. These remain A17/U18 limitations; no new retry, clearing or resend policy is invented.

### Keep inspected assertions separate from runtime evidence

[Settings invite test](../../../../pwa/e2e/settings.spec.ts) checks dialog/link ID, a fake clipboard receiving one string with that ID and dismissal. It does not open the copied link or exercise native Share. [Auth-flow invite test](../../../../pwa/e2e/auth-flow.spec.ts) generates its own token and asserts only a Home URL; its comment about cookies is not an assertion. The fixture intercepts browser API calls, fixes browser time and injects access; common family mocks can synthesize successful `/me` for unknown/missing identity. Settings seeds cookies/legacy storage; its unit tests stub family management. Home serverFetch is outside browser route mocks. Test configuration and real cookie/API integration limits are in BSL-008.

These assertions were inspected, not executed. Source-supported A10 permits this initial draft with those limits. No behavior TDD, generated-client regeneration or application test execution applies to these documentation edits. No test is added to manufacture runtime qualification.

## Risks / Trade-offs

- Unsigned member/redirect fields and absent invite-time eligibility (U16) → Keep the credential/eligibility observations non-normative under A22; scope positive handoff to an existing member.
- Repeated unawaited writes and partial state (U17) → Specify initial writes and requests, retain failure/order limits and withhold transactional or durable-completion guarantees.
- Unchecked supplied redirects and incomplete generation/recovery handling (U18) → Cover default navigation and visible initial-action errors only; retain gaps without fixes.
- Expiry copy conflicts with no validator age check → Preserve A17 and exclude expiry/retention guarantees.
- Limited assertions and substituted boundaries → Mark behavior implementation-supported, runtime not-run, and static validation as artifact evidence only.

## Migration Plan

No application migration, deployment or rollback is needed. This session creates an active draft only. Human review comes next; acceptance, main-spec promotion and archival require separate authorization. Existing shared-access change and existing-member-selection archive stay untouched.

## Open Questions

Future security/eligibility, atomicity, redirect and recovery policy choices remain deferred under A17/A22; this draft does not select their desired behavior. U08 ownership/reporting and U13/U14/U15 qualification/contract reconciliation remain for separately selected work. No unresolved question is used as a premise for the added requirements.
