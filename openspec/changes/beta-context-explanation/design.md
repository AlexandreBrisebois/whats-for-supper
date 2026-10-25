# Beta context design review

## Context and Existing Ownership

**Source inspection, not rendered Beta evidence.** Main `4414c7379000b11d0f4411b4213ee71b98eb651c` has the noninteractive 9px [IdentityHint](https://github.com/AlexandreBrisebois/whats-for-supper/blob/4414c7379000b11d0f4411b4213ee71b98eb651c/pwa/src/components/identity/IdentityHint.tsx): Demo wins visually over Beta, while a screen-reader description exposes the Beta channel. Installation identity is informational; it does not authorize access or establish API model availability.

Unmerged Demo #348 at `fdde5fe3a6721582e2ec00dda5429936d9f17c82` supplies the actual reusable pattern:

- [DemoContext](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fdde5fe3a6721582e2ec00dda5429936d9f17c82/pwa/src/components/identity/DemoContext.tsx): Layout-top band, initial query-free `/home`, family readiness, interaction/task/modal suppression, and route/owner-scoped opening.
- [Visit store](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fdde5fe3a6721582e2ec00dda5429936d9f17c82/pwa/src/store/demoContextStore.ts): `presented`, `interacted`, `acknowledged`, `storageRead`, `eligibleEntry`, `openPath`, `openOwner`; Demo key `wfs:mode-info:demo:dismissed`.
- [DemoDialog](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fdde5fe3a6721582e2ec00dda5429936d9f17c82/pwa/src/components/demo/DemoDialog.tsx): native modal, heading focus, Escape/Close, contained focus, connected-band focus return, scrollable cream surface and responsive phone/tablet shape.
- [DemoModeProvider](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fdde5fe3a6721582e2ec00dda5429936d9f17c82/pwa/src/components/demo/DemoModeProvider.tsx): existing GET `/api/health` runtime demo status, including unknown/error states. [Layout](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fdde5fe3a6721582e2ec00dda5429936d9f17c82/pwa/src/components/common/Layout.tsx) owns band placement; app route layout owns the notification zone and providers.
- [Demo delta](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fdde5fe3a6721582e2ec00dda5429936d9f17c82/openspec/changes/cost-safe-demo-exploration/specs/demo-household/spec.md) explicitly proposes distinct Beta/Demo keys and Demo explanation without a second introduction on Beta. It is not yet main's contract.

The affected capability is [app-installation](../../specs/app-installation/spec.md), adding release-context presentation. [demo-household](../../specs/demo-household/spec.md) retains Demo hint and runtime policy ownership; [household-identity](../../specs/household-identity/spec.md) retains access. No capability move or duplicated Demo requirement is needed.

## Decisions and Tradeoffs

All choices below are **proposed for Alex's approval**, not settled product decisions.

| Choice for review | Recommendation and reason | Alternative and cost |
| --- | --- | --- |
| Combined Demo + Beta | Retain Demo-first explanation plus existing assistive Beta-channel description. Do not stack bands/modals or acknowledge Beta when closing Demo. Matches main's hint precedence and #348's explicit overlap scenario. | A combined explanation adds visible channel context but changes Demo copy, acknowledgement meaning and review scope. Separate stacked introductions add interruptions. Neither is selected. |
| First visit | Same initial query-free Home gate as Demo; suppress for the whole app visit after ineligible entry, interaction or active work. A later fresh normal Home load can qualify. | Waiting until a deep-link task finishes risks a surprise focus grab and needs extra task-completion policy. |
| Presentation and reuse | Extend the existing concrete context presenter/state owner to select Demo or Beta copy/key; reuse DemoDialog and Layout insertion. Keep only mode-specific acknowledgement state separate and one visit-level interruption guard. | Copying a BetaContext/store implementation duplicates safety logic. A generic onboarding/mode framework adds infrastructure beyond two concrete explanations. |
| Beta copy | Short pre-release expectations only, with a reopen hint. No data or feature promises. | Adding household, AI or reset statements requires reconciling installation configuration and expands the chance of misleading claims. |

Expose the existing installation identity through a small existing-provider accessor if needed; do not add another identity fetch/model. Runtime demo status continues to come from the existing provider, independently of the release channel. Do not infer runtime policy from a Beta label or client environment variable.

| Installation / runtime state | Proposed context outcome |
| --- | --- |
| stable, installation demo false, runtime false | No mode band or explanation |
| beta, installation demo false, runtime false | Beta band and safe eligible Beta introduction |
| either channel, runtime true | Existing Demo context wins; on beta retain the existing assistive Beta-channel hint |
| runtime unknown/error | No Beta explanation or acknowledgement; preserve current identity hint and Demo availability/retry behavior |
| installation demo true, runtime false | No Beta explanation; retain existing Demo identity hint and existing runtime Demo behavior. Do not invent a reconciliation or AI policy in this change. |

The tiny Beta-only hint is superseded by the band once resolved; retain the existing hint as unresolved fallback and the existing Demo/combined informational hint. Avoid duplicate Beta-only announcements. If resolving mode replaces a band while its explanation is open, close it without acknowledgement, do not open another mode automatically, and do not return focus into an active task. Explicit reopening uses the current mode. Test real source disagreement; matching-flag fixtures alone cannot establish honesty.

## First Observable Slice

After explicit approval and availability of the reviewed Demo prerequisite, exercise one confirmed Beta-only ready Home entry through the real installation provider, existing runtime provider, family/UI readiness, Layout context owner, locale selection, native dialog and browser acknowledgement. Start exploring closes it, reload does not automatically repeat it, and the band reopens it. No backend mutation, provider call or new endpoint is needed. Browser API fixtures may supply the existing health response, but component-only tests cannot establish native focus or real shell layering.

## State, Concurrency and Recovery

An app visit is the running client application's lifetime across ordinary route navigation and shell remounts; a full reload starts another visit. Capture initial shell path/query even while runtime mode is unknown. Query-bearing Home is conservatively ineligible even for unfamiliar parameters. No persistent marker is written for eligibility, presentation or routing. On a fresh eligible Home visit, require selected member, family `hasLoaded && !isLoading`, no UI loading, no pending capture recipes, no PDF selection, no competing modal and no prior pointer/key/wheel interaction. Routes for editors, cooking and planning are ineligible; Home overlays are covered by the modal/interaction guards. Verify these actual seams rather than promise a universal task detector.

Keep Demo's visit guard across mode discovery and remounts. A mode change cannot clear `presented`/`interacted` or manufacture a new safe entry. Remove open state on route/owner/mode departure; restore focus only on explicit dismissal to a still-connected band. Reopening manually is deliberate but must not discard an editor or create stacked modals: while another modal is open, its native modality owns focus and the background band cannot activate. Neither click-outside dismissal nor a new timer is proposed; retain DemoDialog's current explicit actions/Escape.

Beta acknowledgement is proposed as `wfs:mode-info:beta:dismissed` with value `true`. Keep Demo's key unchanged. Read once per mode per app visit; catch both reads and writes, including unavailable `localStorage`. Set in-memory acknowledgement on explicit dismissal even if storage write fails. No ID, cookie, server synchronization, timestamp, copy hash, locale suffix or reset integration. Cross-tab instantaneous synchronization is not promised; each tab's visit guard prevents repeat interruptions. A full reload with blocked storage may introduce once again, honestly bounded to visit memory.

## Compatibility, Rollout and Reversal

Keep this spec branch directly on main; no runtime dependency is needed to review documents. Later implementation must first verify #348's merged successor on main (or an explicitly reviewed stack) and reconcile changed presenter/spec ownership before writing code. Do not cherry-pick its broad backend/AI work just to obtain the band, or independently rebuild that pattern. If #348 changes or does not land, dependent implementation remains blocked.

Reversal of a later presentation change can restore the prior hint without clearing either local acknowledgement. No schema migration, dependency upgrade, feature flag, manifest/icon or release-channel change is proposed. Preserve current Home voting/duration work and its archive. No sync/archive is requested in this phase.

## User Experience

Exact proposed copy (no additional feedback destination or new link):

| Element | English | Français |
| --- | --- | --- |
| Band and modal title | Beta · What to know | Bêta · À savoir |
| Description | This is a pre-release version of What's for Supper. Features may change, and you may encounter bugs. | Vous utilisez une version préliminaire de What's for Supper. Les fonctionnalités peuvent changer et vous pourriez rencontrer des bogues. |
| Reopen hint | You can reopen this explanation from the Beta band at any time. | Vous pouvez rouvrir cette explication à tout moment à partir du bandeau Bêta. |
| Primary dismissal | Start exploring | Commencer à explorer |
| Close accessible name | Close | Fermer |

Use existing locale ownership, not hard-coded language detection. Keep white text on Demo's `#6b21a8`, `#581c87` hover/pressed surface; retain help icon, minimum 44px control dimensions, visible white focus and safe-area top padding. Reuse the current `sm` dialog breakpoint (640px): phone-width sheet, compact wider dialog, including wider phone landscape. Do not add device sniffing. Primary acceptance must check both phone orientations against that existing responsive choice. Long copy wraps and the dialog scrolls; keep Close and the primary action reachable at large text and short landscape heights.

## Review Findings and Verification Plan

Review of this draft found no need for another onboarding framework or server contract. Two concrete risks shape the proposal: server installation identity and runtime demo mode are separate sources, so Beta must not guess non-demo; and per-mode fresh visit state could open a second introduction after a mode transition, so keep one interruption guard. The proposed table and transition scenarios cover both. This is author review of source and documents, not independent review or device certification.

After approval, generate bounded red/green/refactor tasks from the accepted decisions. Suggested verification, not executed Beta behavior evidence:

| Boundary / scenarios | Required evidence after implementation |
| --- | --- |
| Identity combinations, mismatch/unknown, mode transitions | Extend `IdentityHint.test.tsx` and the existing `DemoContext.test.tsx` owner; use real provider wiring where appropriate and synthetic existing health fixtures. Observe intended missing-behavior red, then green via `task test:unit -- src/components/identity/DemoContext.test.tsx` and `task test:unit -- src/components/identity/IdentityHint.test.tsx`. |
| Safe entry, persistence, independent keys, storage failure, route/remount and interaction | Extend the same context tests, including StrictMode, delayed status, read/write separately throwing, selected-member/locale changes, Demo acknowledgement before Beta and vice versa; no write on route/unmount. Record preservation of pending capture/PDF work. |
| Real shell, navigation and native modal | Add Beta scenarios to the existing `pwa/e2e/demo-mode.spec.ts` context suite or a focused sibling only if needed. Run `task test:e2e -- demo-mode.spec.ts` (plus any added sibling), with GET `/api/health` method-specific schema-compliant fixtures in `pwa/e2e/mock-api.ts`. Check deep-link voting, recipe/share/import destinations and drafts, band reopen, Escape/focus containment/return, notification overlap, stable and Demo controls. API contract/client generation is unchanged. |
| Visual and assistive behavior | Inspect EN/FR iPhone, Pixel and iPad portrait/landscape browser captures, safe areas, large text, short landscape, 44px targets, measured normal/hover/pressed contrast and reduced motion. Check Safari/VoiceOver on physical iPhone/iPad and Chrome/TalkBack on physical Pixel separately; record unavailable devices as unrun, never infer them from emulation. |
| Integration and scope | Run repository-supported `task verify -- <complete reviewed changed-path set>` for the actual future application diff, plus its named scenario acceptance. Preserve access, selected member, feature/AI policy, Home voting/duration, capture/planning/cooking and reset boundaries; no production/provider calls. |

For this documentation-only PR: strict `task spec:check -- beta-context-explanation --type change`, full `task spec:check`, explicit-path `task verify:plan` and `task verify`, source/diff review, then connector read-back and exact-head CI monitoring. No behavior red/green cycle applies to this phase. Copy/precedence/safe-entry approval and actual Beta implementation/device evidence remain outstanding regardless of document validation success.
