# Design review

## Context and Existing Ownership

Source review is pinned to main `e680fb7966978da3fbde25453a241c7e69e2b2a1`; the saved checkout matched it and was clean before planning. This is an author design review, not rendered/runtime qualification. The screenshot described in the delegation supports the visible tiny login hint and ordinary helper; no new screenshot or deployed diagnosis is claimed.

| Existing owner | Source-observed behavior and affected seam |
| --- | --- |
| `pwa/src/lib/server/app-identity.ts`, `resolveAppIdentity` | Server-only PWA `DEMO_MODE` parser plus baked release channel. Root layout awaits `connection()` and passes only Demo/channel presentation identity through InstallIdentityProvider. This is the Welcome identity authority, not API health. |
| `pwa/src/app/(auth)/welcome/page.tsx` and `page.test.tsx` | Client form starts empty; effect calls generated `apiClient.api.health.get()` and fills `Swipe-Match-Cook` on `demoMode` when current input is falsy. A late response can refill a deliberately cleared field. Existing branding test explicitly permits Demo identity with empty input. |
| `pwa/src/lib/api/api-client.ts`, PWA/API health owners | API base URL is configurable, otherwise relative `/api`. PWA `app/api/health/route.ts` hardcodes false; .NET `HealthController` independently returns Demo diagnostics and can return 503 for storage. Source establishes a plausible mismatch, not which route failed in a deployed request. |
| `pwa/src/lib/auth.ts` | Server actions use one `HEARTH_SECRET`; authenticate trims both inputs, generates signed token on match, and Welcome awaits cookie write before `/onboarding`. No separate read/write credential exists. |
| `pwa/src/components/identity/IdentityHint.tsx` | Noninteractive tiny note; Demo wins visually over Beta, with accessible Beta-channel description. Welcome is a direct consumer; other placements must retain their note semantics. |
| `pwa/src/components/identity/DemoContext.tsx` and `pwa/src/store/demoContextStore.ts` | Existing sage band, exact bilingual explanation, route/owner opening, one Demo dismissal key. Home eligibility is initialized on mount, even when mode is unknown. Pointer/key/wheel listeners and busy/capture/PDF guards consume this app visit's interruption allowance. |
| `pwa/src/components/demo/DemoDialog.tsx` | Native modal, naming, focus containment, Escape, phone sheet and wider compact dialog. Cleanup always returns focus to a connected trigger, including departure; this needs a bounded dismissal-versus-departure adjustment. |
| `release-template/synology/.env.example` | Empty required `HEARTH_SECRET`, default `DEMO_MODE=false`. Release packaging does not guarantee the public constant. No deployment setting is changed here. |

The normative delta belongs to [demo-household](../../specs/demo-household/spec.md); [household-identity](../../specs/household-identity/spec.md) remains authoritative for access and retries. The delta changes the old health-dependent prefill and login-only hint exception; it preserves every existing explanation, accessibility and dismissal scenario.

Current competing work: #348 is merged; #340 remains draft and concerns broader reset/capture behavior. #351 at `2bf9e01ff844ed502a75d92ea8eb2a48abd77983` is an unapproved Beta proposal touching presenter, acknowledgement and focus seams. Its old purple/44px prose differs from main's later sage/32px specification and must not be copied into this design. Do not apply its Beta/mismatch proposals implicitly. Reconcile the eventual implementation with whichever changes actually land first.

## Decisions and Tradeoffs

The three product directions are approved. The following concrete design is proposed for the required pre-implementation review.

1. **Guard at server rendering, not health.** Split Welcome into a request-time server page and the existing interactive client form. The server page uses the canonical `resolveAppIdentity()` authority also used by the root page identity; explicitly remain request-dynamic using the installed Next guidance. Compute a Welcome-only initial value from `identity.demo && process.env.HEARTH_SECRET === PUBLIC_DEMO_PASSPHRASE`. Return the named public constant on success, otherwise `null`. Keep the configuration read and equality decision in a server-only owner; do not serialize the environment value, a configuration object, token or signing material. The public constant's declaration may be shared safely; it is deliberately public, not a secret placeholder. Avoid adding a fetch endpoint, unauthenticated credential action, client environment variable or root-provider credential payload.
2. **Exact equality is deliberately conservative.** The designated constant is `Swipe-Match-Cook`, matching current source. Missing/custom/case-changed/padded secrets withhold prefill. Authentication still trims normally. Normalizing the configured secret would admit extra configurations; exact matching gives a smaller disclosure rule and the ordinary editable fallback. The architecture supports this guard without credentials, roles, health-contract changes or deployment changes. No deviation from the approved security boundary is required.
3. **Initialize once; retain provenance.** Client state starts from the server's allowed value. A separate local flag means “this mounted form received prefill and has never been edited,” rather than inferring prefill from string equality or Demo mode. Every input change clears that flag permanently for the mount. Locale, errors, submitting, unrelated rerenders and late health events never reset input or provenance. Remove only Welcome's convenience health dependency; leave the app DemoModeProvider and API enforcement unchanged.
4. **Extract the concrete presentation, keep automatic policy in its current shell owner.** Reuse the existing band/dialog body through a small shared Demo explanation presentation component, with explicit open/dismiss callbacks and trigger reference. Keep one copy of the four paragraphs, setup link and actions, using current locale keys. Welcome uses server identity and local route-scoped manual-open state. The ordinary DemoContext wrapper keeps current runtime mode/readiness and Home visit policy. Do not mount the existing stateful DemoContext on Welcome or add a DemoModeProvider there. A global context/onboarding framework is unnecessary.
5. **Share acknowledgement, not login interaction history.** Put read/dismiss operations with the existing Demo store/key owner so both wrappers call the same logic. Welcome may load the acknowledgement and explicitly dismiss through that owner; it must not initialize `eligibleEntry`, set Home `presented`/`interacted`, or install the app-shell activity listeners. Home's visit starts on first shell entry. A manual Welcome opening removed by navigation has not been acknowledged or presented on Home. Explicit Welcome dismissal sets in-memory acknowledgement immediately and attempts the existing browser key. This suppresses a later automatic Home explanation even if persistence fails. No second storage key, copy hash, user ID or server write.
6. **One login control, preserve channel context.** A top-level layout row holds the same full-width sage band; the cream centered form remains below, avoiding an absolute overlay. Replace only Welcome's tiny Demo note. The Demo band's accessible description retains `Beta release channel` / `Canal bêta` on beta. Beta-only Welcome keeps its current tiny informational note and ordinary helper. Stable private Welcome remains ordinary. Add no Beta introduction or role conversion elsewhere.
7. **Dismissal owns focus return.** Reuse DemoDialog, but distinguish Start exploring/Close/Escape from route/mode/unmount cleanup. Only explicit dismissal restores focus to the still-connected triggering band. Departure closes the old modal without acknowledgement, clears its route-local open state and respects destination focus; no second modal opens automatically as a replacement. Preserve existing consumers' unrelated behavior and test both positive return and departure with a still-connected trigger.

## First Observable Slice

After approval, first establish request-time Demo+public-constant Welcome through real server identity and guard, HTML/RSC serialization, hydration, editable form, real authentication action, token generation and cookie writing. Before Enter: populated field, exact helper, no token/cookie/navigation. After explicit Enter: valid `h_access` and onboarding, with member selection still separate. Browser health can fail throughout. This path needs an isolated PWA process and dummy environment, not a database, real provider or deployed demo. Subsequent slices add shared manual explanation/lifecycle and responsive accessibility.

## State, Concurrency and Recovery

| Form state | Input and helper |
| --- | --- |
| Guard permits initial prefill | Public constant and demo helper; Enter enabled when idle |
| Guard withholds | Empty input, existing ordinary helper; Enter disabled until nonblank |
| Any edit/clear/retype | Visitor value and ordinary helper for the rest of this form mount |
| Explicit submit pending | Existing checking feedback; Enter disabled; no background authentication |
| Rejection/action or cookie failure | Existing localized feedback; retained input/provenance; retry becomes possible |
| Fresh full form mount | New server guard may initialize again; no promise to persist unsent passphrases across reload |

For configuration changes between rendering and submission, authentication remains authoritative and may reject the prefill normally; never auto-retry with another credential. No late health callback or prop refresh is allowed to overwrite user edits. Do not introduce storage for passphrases.

| Welcome-to-Home transition | Expected explanation state |
| --- | --- |
| Type, clear, Enter and onboarding; no explanation dismissal | Leave Home eligibility/presentation/activity pristine until first shell entry; ready query-free Home may introduce once |
| Open manually then explicit dismissal | Same Demo acknowledgement; Home does not automatically reopen; band can reopen manually |
| Open manually then route departure without dismissal | No acknowledgement or Home presented marker; eligible Home introduction remains possible |
| Storage read or write fails | Usable manual dialog and shared visit-local acknowledgement; fresh reload may introduce again |
| Deep-link first shell entry, pending capture/PDF, another dialog, or shell interaction before readiness | Preserve existing whole-visit automatic-introduction suppression and destination/work |
| StrictMode, shell remount, locale/member changes | No duplicate open explanation, listener leakage or fresh interruption allowance |

## Compatibility, Rollout and Reversal

No public REST contract or generated-client change is needed: this is server-rendered presentation plus existing actions. Health diagnostics and app runtime Demo restrictions retain their current meaning. If implementation discovers a necessary API shape/status change, stop that slice for a reviewed contract delta rather than quietly adding one.

No schema, dependency, release channel, icon, manifest, cookie rule or secret migration. Reversal restores prior Welcome presentation without deleting Demo acknowledgements. This spec branch is based directly on main; it does not stack unrelated drafts. Later approved implementation must first check current main, #340/#351 and any new overlapping work. No synchronization or archival in this stage.

## User Experience

| Helper state | English | Français |
| --- | --- | --- |
| Actual untouched prefill | The demo passphrase is filled in for you. Tap Enter to explore. | Le mot de passe de la démo est déjà rempli pour vous. Appuyez sur Entrer pour explorer. |
| Ordinary/private/edited | Enter your family's passphrase to continue | Entrez le mot de passe de votre famille pour continuer |

Use the existing `auth.enter` button label (`Enter` / `Entrer`), localized errors and locale provider. Do not claim that Start exploring authenticates: on Welcome it only closes the explanation and returns to the form; Enter remains the login action. Keep its established label and body copy as requested. The band remains `Demo · What to know` / `Démo · À savoir`. Reuse all four approved paragraphs and link from the existing explanation owner, without login-specific duplicates or additional marketing.

Keep the approved 32 CSS pixel minimum band, 13px/18px medium label, 16px help icon, sage interaction surfaces, charcoal copy and safe-area inset. Permit wrapping/growth at 320px and enlarged text. Keep 44px minimum modal controls and setup link, existing sheet/compact-dialog breakpoint, scrollable content, visible interactive focus and static-title exception. Give the passphrase input a localized programmatic name and associate its state-dependent helper, so helper changes are understandable without relying on placeholder or color. Preserve cream, existing typography and ochre Enter. Test keyboard opening without form submit, naming/description, focus trap, Shift+Tab, Escape, explicit close and return. Measure actual normal/hover/pressed contrast; existing tokens alone are not visual evidence.

## Review Findings and Verification Plan

The guard is architecturally feasible. Required design adjustments are the request-time server/client split, reuse of presentation separately from automatic-visit policy, provenance-aware helper, and dismissal-only focus restoration. These are bounded ways to deliver the approved directions; they remain for Alex's design approval before code. No new screenshot-driven redesign is needed.

| Test boundary | Concrete acceptance after approval |
| --- | --- |
| Guard matrix | Server-only guard/page tests: PWA Demo true/false/absent/invalid × public/custom/missing/empty/whitespace/case-changed/padded secret, stable and beta. Cross-check runtime health true/false/503/rejection/stall so health never controls Welcome prefill. Assert exact constant-or-null result and correct band/helper, not deleted-string absence. |
| No disclosure and runtime identity | Dedicated isolated request-time PWA process using synthetic private canaries. Check raw HTML, RSC navigation responses, serialized props, client bundles and any presentation responses for canary absence, including JSON/HTML/URL-encoded forms. Build with opposite Demo config and run with each matrix config; test at least one same-build runtime switch to rule out baked credential/prefill. Client-visible constant is allowed; private canaries and signed tokens before submit are not. Never print real environment values. |
| Form and auth | Extend Welcome tests for no auth/cookie/navigation before explicit Enter, edit/clear/retype and locale retention, pending disablement, rejected then corrected retry, action/cookie exception, token/cookie/navigation ordering. Use real actions/token/cookie in isolated browser acceptance; mocked unit actions alone do not prove authentication. |
| Lifecycle and shared content | Extend DemoContext/IdentityHint tests plus existing demo browser suite: no initial login popup; manual open; same exact EN/FR paragraphs; one band/dialog; shared key; read/write storage failures independently; untouched Home eligibility after login interactions; dismissal suppression; route removal without acknowledgement; deep links, busy/capture/PDF, competing dialog, delayed readiness, StrictMode and remount preservation. |
| Real browser, layout and accessibility | EN/FR iPhone and Pixel phone plus iPad portrait/landscape, 320px, enlarged text/short viewport, virtual-keyboard layout, reduced motion, safe-area and reachable Enter/Close/actions. Inspect actual isolated captures. Measure control bounds and contrast; assert accessible input/helper, native focus containment, return after each dismissal, and destination focus on departure while trigger stays connected. Physical Safari/VoiceOver and Chrome/TalkBack are separately reported if unavailable. |
| Contract/mock isolation | Existing GET `/api/health` method-sensitive fixtures in `pwa/e2e/mock-api.ts` retain approved diagnostics and synthetic GUID builders. No new method/shape/client generation. Dedicated Welcome matrix must actually configure the server; mocking browser health cannot prove the server guard. Keep existing loopback traffic trap and refuse provider/production/unknown origins. |

Use existing Task targets and observed red/green per bounded slice; tasks.md gives commands. This document-only stage instead runs strict OpenSpec, explicit-path `task verify:plan` and `task verify`, link/whitespace and scope review. Application/API/database/browser behavior checks and device acceptance are unrun here; documentation validation cannot establish them.
