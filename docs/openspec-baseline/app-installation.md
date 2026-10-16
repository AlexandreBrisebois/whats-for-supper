# App installation baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **17 requirements / 41 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Ordinary-household source-supported baseline complete and promoted (2026-10-16):
17 requirements / 41 scenarios across three sequential slices. The current
user request authorizes discovery, evidence reconciliation, documentation-only
artifact generation, validation and promotion through all necessary bounded slices.
This supersedes the historical A84 discovery-not-started/review-only checkpoint.
A09–A12 and A34 remain in effect; source-supported extraction is not runtime
qualification. No separate human review event is claimed.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 17 requirements / 41 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `d8f73dd6e53468b73191316ed87a61685fccbc59d8b74ccd18dd84ecc8d2863c`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| App installation: enter through an installed household app | Manifest identity/icons, shortcuts, standalone presentation, link/PDF share transport/staging, interruption; no assumed full offline support | [manifest route](../../pwa/src/app/manifest.json/route.ts), [PDF manifest](../../pwa/src/lib/pdfManifest.ts), [service worker](../../pwa/public/sw.js) | [install browser tests](../../pwa/e2e/install-identity.spec.ts), [PDF browser tests](../../pwa/e2e/pdf-capture.spec.ts) | Identity, capture, flags, browser/OS/deployment / medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision and provenance |
| --- | --- |
| AI-D01 | User 2026-10-16 explicitly authorized completing the supported ordinary-household baseline, including sequential generation and sync to main. No implementation, qualification, archival or shared-workflow changes. This is the authorization record, not an invented review event. |
| AI-D02 | Use three sequential slices: metadata/launch; worker transport; browser staging/lifecycle. Reuse accepted household-identity and recipe-capture requirements by name; withhold disputed guarantees and retain U11/U74. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U11 | Runtime/device/deployment qualification is incomplete | [PostgreSQL PDF tests](../../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) require explicit configuration; [PDF flow](../flows/user-flows/pdf-recipe-import.md), [release status](../../README.md), [template](../../release-template/synology/compose.yaml). Device sharing, offline use, NAS rendering/recovery and deployment flag propagation require separate evidence. | Open |
| U74 | Shared PDF entry is conditional browser staging, not OS installation transport | Existing capture BSL-015 reconciled with BSL-app-installation-004–009: synthetic stage/visibility overrides and blocked service workers do not establish installed OS sharing. | Retained; OS delivery and deployment guarantees excluded |
| AI-U01 | No offline application capability established | Worker opens an empty cache and uses caches.match/fetch without populating it, fallback page or mutation queue. No selected runtime worker check. | Offline availability, background upload/durable replay excluded |
| AI-U02 | Flag advertisement and acquisition are separately configured | PWA env chooses manifest; API registry/member snapshot chooses acquisition. Ordinary Compose/Dockerfile inspection found no explicit PDF variable forwarding. Browser expectation overrides and stubs are substitutions. | Deployment propagation and installed-manifest refresh excluded |
| AI-U03 | Parser does not uniformly reject every wrong-field shape | One File under another key plus a string files entry can satisfy separate source counts. VM tests cover common invalid count/type/size, not all malformed shapes. | Strict uniform field rejection withheld; no repair |
| AI-U04 | Browser/storage and presentation results remain conditional | Registration lacks rejection/retry UI; no server share-target fallback found; IndexedDB discard/cleanup failures are caught. Safe-area and Apple splash declarations lack selected device checks. | No successful worker control, guaranteed deletion deadline, full-device presentation or resumable delivery |
| AI-U05 | Documentation and test names overstate transport evidence | PDF user flow says Android can deliver and iOS uses picker; cold/warm browser test directly stages/navigates, interruption overrides claim/visibility. Title is transported but unused by MinimalCapture. | Android/iOS support matrix, OS cold/warm handoff and title-derived recipe identity excluded |

## Slice evidence and lifecycle records

### Slice 1 — metadata and launch (BSL-app-installation-001–003)

| Evidence | Actor, entry, rules and observable outcome | Failure / cancellation / recovery | Ordered source and inspected assertions | Class / confidence / disposition |
| --- | --- | --- | --- | --- |
| BSL-app-installation-001 | Public visitor reads manifest/initial Welcome HTML; ordinary stable channel and DEMO_MODE false select unchanged branding, root icons and initial-head metadata. | Public metadata is independent of household API availability; no install success, asset-fetch or OS rendering guarantee inferred. | `pwa/src/lib/baseManifest.json` → `pwa/src/lib/server/app-identity.ts` (`resolveAppIdentity`) → `pwa/src/app/manifest.json/route.ts` (`GET`), `pwa/src/app/layout.tsx` (`generateMetadata`); `pwa/next.config.js` initial-head setting. `pwa/e2e/install-identity.spec.ts` asserts exact manifest equality, public status, no-store, head tags and nonempty image bodies; `pwa/src/lib/server/app-identity.test.ts` asserts resolver/metadata agreement with mocked release channel, Next connection/fonts/providers and stubbed env. | Implementation-supported / high for descriptors; medium for initial rendering / accepted/promoted. |
| BSL-app-installation-002 | Household visitor starts at `/` or opens advertised `/discovery` or `/capture`; routes consume accepted page gates and hydrated landing behavior. | Missing access/member context follows identity-owner recovery; no independent installed identity or guaranteed arrival. No shortcut cancellation flow exists in source. | Manifest shortcuts/start → `pwa/src/proxy.ts` → `pwa/src/components/identity/IdentityValidator.tsx`; `pwa/src/app/page.tsx` is landing markup. Install test asserts shortcuts and unauthenticated planner 307; shortcut-specific launch is not directly asserted. Full accepted household-identity spec inspected. | Implementation-supported / medium / accepted/promoted. |
| BSL-app-installation-003 | Document declares standalone/Apple presentation and startup links, safe-area cover/spacing, and requests worker registration if browser support exists. | No registration rejection feedback/retry, no OS splash or device-safe-area qualification. No cache-population/offline claim. | `pwa/src/app/layout.tsx`, `pwa/src/components/common/Layout.tsx`, `Navigation.tsx`, `pwa/src/app/globals.css` safe-top/safe-bottom; install test checks metadata, not OS standalone rendering or worker control. | Implementation-supported / medium / accepted/promoted. |

Configuration assumptions: ordinary stable baked `release-channel.json`, DEMO_MODE
false, browser features/insets supplied where applicable. Test expectations may use
`WFS_IDENTITY_TEST_DEMO_MODE` and `WFS_IDENTITY_TEST_PDF_MODE`; these do not set
server configuration. Playwright uses a test secret and mocked/aborted APIs.
Checks: source/assertion inspection completed; browser/unit/runtime checks not-run
under A34. No behavior is labeled runtime verified.

Slice 1 mapping (every scenario under each requirement belongs to the stated evidence):

| Evidence | Requirement names | Requirements / scenarios |
| --- | --- | --- |
| 001 | Publish ordinary household install identity; Advertise ordinary install icons; Supply document install presentation hints | 3 / 6 |
| 002 | Advertise direct household shortcuts; Launch through the household root entry | 2 / 4 |
| 003 | Account for supplied safe-area insets in app presentation; Request service-worker registration when supported | 2 / 4 |

Artifacts: `openspec/changes/baseline-app-installation-metadata-launch/`
(proposal, specs/app-installation/spec, design, documentation tasks and scaffolded
metadata). Strict change validation passed; seven requirements/fourteen scenarios accepted under AI-D01 and promoted via installed sync workflow. No separate human review asserted.


### Slice 2 — conditional worker transport (BSL-app-installation-004–006)

| Evidence | Actor, entry, eligibility and outcome | Failure / cancellation / recovery | Ordered source and actual assertions | Class / confidence / disposition |
| --- | --- | --- | --- | --- |
| BSL-app-installation-004 | PWA manifest consumer; trim/lowercase PWA process PDF variable, on/opt-in advertise multipart PDF; other values retain GET link sharing. Independent API/member gate remains capture-owned. | Unknown/absent mode defaults to GET. Changing advertised transport is not proof an installed manifest refreshes. No member-specific manifest. | `pdfManifest.ts` → manifest `GET`; `pdfManifest.test.ts` tests undefined/blank/off/invalid and opt-in/on/trimmed ON; install equality assertions use PDF expectation overrides; `app-identity.test.ts` stubs env. `FeatureFlagService.cs` registry and Resolve inspected; `featureFlagStore.ts` → panel resolved snapshot. | Implementation-supported / high for declaration, medium for configuration seams / accepted/promoted. |
| BSL-app-installation-005 | Controlling worker selects same-origin exact-path POST; text-only redirect carries title/text/url, valid one PDF is staged before token redirect, never API-uploaded/rendered. | Parse, envelope, invalid file/count or storage exceptions redirect restart; no cancellation UI at transport, no server fallback found. Wrong-name mixed field validation is not uniformly strict. | `sw.js` → `pdf-share.js` matches → formWithinBound (20 MiB + 65,536 bytes) → handle → stage; `pdf-share.test.mjs` exact match, synthetic file/post 303, invalid count/type/size and thrown staging, text-only preservation. Stage is replaced in VM, no IndexedDB supplied. Capture route → `CaptureWithPdf`/`MinimalCapture`; `pwa/e2e/capture-flow.spec.ts` shared url/text tests inspect review and explicit save with mocked API. `sharedTitle` read but unused. | Implementation-supported / medium / accepted/promoted. |
| BSL-app-installation-006 | Worker bypasses API, stream, manifest and non-GET except matching share POST. Registration/activation do not establish offline behavior. | No precache, response cache writes, fallback page, request queue or registration retry UI found. Existing cache match may return prior cache content; fetch failure has no application fallback. | `layout.tsx` register → `sw.js` install opens supper-v1, activate clients.claim and caught cleanup; fetch exact share first, GET checks, caches.match/fetch. No selected worker runtime assertion; Playwright serviceWorkers block globally. | Implementation-supported / medium / accepted/promoted. |

Configuration discrepancy: inspected ordinary `docker/compose/apps.yml` and
`pwa/Dockerfile` do not explicitly forward the PDF flag. Manifest mode comes from
PWA process env; API registry reads its own configuration; test overrides select
expectations rather than configuring deployment. U11/U74 remain. No runtime checks
executed under A34; no verified transport delivery claim.

| Evidence | Requirement names (all scenarios under each mapped) | Requirements / scenarios |
| --- | --- | --- |
| 004 | Select share advertisement from PWA configuration | 1 / 3 |
| 005 | Handle share transport only on its worker request boundary; Hand text-only share POST to existing link review; Stage a compatible shared PDF before capture handoff; Reject unusable share envelopes with restart handoff | 4 / 9 |
| 006 | Preserve worker network access for API and manifest requests | 1 / 3 |

Artifacts: `openspec/changes/baseline-app-installation-share-transport/`.
Strict change validation passed; six requirements/fifteen scenarios accepted under AI-D01 and promoted, preserving slice 1. No separate human review event.

### Slice 3 — browser staging and recovery (BSL-app-installation-007–009)

| Evidence | Actor, entry, rules and observable outcome | Failure / cancellation / recovery | Ordered source and inspected assertions | Class / confidence / disposition |
| --- | --- | --- | --- | --- |
| BSL-app-installation-007 | Browser receives valid staged PDF; single pending slot replaced by newer file/token. Matching readwrite claim consumes; stale token leaves newer slot intact. Claim returns only valid file age <=10 minutes. | Matching expired/invalid file deleted without return. cleanup removes age >10 minutes, not at exact deadline. open blocked/error or transaction abort rejects; no durability guarantee. | `pdf-share.js` open/transaction/stage/claim/discard/cleanup; `sw.js` activation cleanup; `PdfShareLifecycle` cleanup on mount/pageshow/minute timer. `pdfShare.test.ts` only asserts delegation to a mocked bridge, despite atomicity in its title. `pdf-capture.spec.ts` stages twice, discards older token, navigates/claims newer, reloads to restart, then stages warm replacement; expiry uses fixture clock 12:00 → 12:11 and cleanup/claim assertions. | Implementation-supported / medium (real IndexedDB assertions exist but not executed) / accepted/promoted. |
| BSL-app-installation-008 | Root lifecycle runs outside IdentityValidator: non-capture page with share query requests matching discard and removes share using history replacement, retaining other query fields. | Unlock/onboarding cannot resume discarded delivery. Storage discard failures swallowed; no guaranteed immediate physical deletion. No restoration token. | `proxy.ts` pathname redirects preserve query → root `layout.tsx` → `PdfShareLifecycle`; no dedicated installed-unlock or direct lifecycle test found. Accepted household-identity gates referenced, not duplicated. | Implementation-supported / medium / accepted/promoted. |
| BSL-app-installation-009 | Capture panel processes token once per mount; selected member outside GOTO attempts claim; accepted current visible return enters foreground selection. Missing member/GOTO discard; acquisition checks and explicit Save stay capture-owned. | mounted/token/epoch/visibility/member checks reject late result; member switch-back cannot revive it. Missing bridge throws, null/expired/consumed claim sets restart feedback. Foreground ownership and failed storage cleanup do not establish durable delivery. | `pdfShare.ts` → `PdfCapturePanel` effects → `pdfCaptureStore` → `PdfCaptureConfirmation`; `CaptureWithPdf` integrates panel. Panel tests mock bridge/API/navigation and set stores, assert GOTO/query reset and member-switch-back rejection; store test asserts older generation reset cannot clear newer selection. Browser interruption test overrides claim/visibility and dispatches events; save tests mock API. Full accepted PDF capture owner inspected for flag, confirmation, failure, cancellation and retry outcomes. | Implementation-supported / medium / accepted/promoted. |

| Evidence | Requirement names (all scenarios under each mapped) | Requirements / scenarios |
| --- | --- | --- |
| 007 | Keep one token-owned browser PDF handoff; Bound browser handoff age without draft resumption | 2 / 6 |
| 008 | Discard token delivery away from capture | 1 / 3 |
| 009 | Hand a claimed PDF to the current foreground capture | 1 / 3 |

Artifacts: `openspec/changes/baseline-app-installation-staging-recovery/`.
Strict change validation passed; four requirements/twelve scenarios accepted under AI-D01 and promoted, preserving slices 1–2. No separate human review event.

### Shared-owner reconciliation

- [Household identity](../../openspec/specs/household-identity/spec.md): `Gate protected page entry with household access`, `Apply member context after household access`, `Route hydrated landing context to the next household page`. Installation references gates, recovery and requested navigation, without copying cookie/auth/member policy.
- [Recipe capture](../../openspec/specs/recipe-capture/spec.md): `Enter and review a recipe link at capture entry`, `Gate PDF acquisition by effective member eligibility`, `Review PDF identity and optional metadata before saving`, `Resolve PDF draft eligibility and discard interrupted drafts`. Owner also retains intake validation, upload locking/error retry, pending acceptance, background completion, originals and failed-import recovery; none redefined here.
- Member feature preferences remain member-preferences-owned; installation does not define a second opt-in policy. No other owner requirements need modification for this scope.

### Ten discovery fields

| Field | Reconciled finding |
| --- | --- |
| Name | App installation (`app-installation`) |
| Business purpose | Expose household app identity/launch destinations and conditional browser share handoff into existing capture. |
| Existing capabilities | Public dynamic manifest, root icons and shortcuts, Apple/standalone declarations, safe-area styling, registration and worker network boundaries, GET link advertisement, optional multipart transport, one-slot browser staging and foreground recovery. |
| Important workflows | Public discovery → gated root/shortcut entry; supported worker registration → controlled share POST → staged token redirect; page token → one-use claim → capture-owned eligibility/review/Save; invalid/expired/interrupted handoff → fresh selection/share. |
| Business rules | Stable non-demo scope; manifest advertisement is process-configured, acquisition is member/API-owned; no automatic recipe save; transport file/envelope bounds; one pending token, <=10-minute claim age and stale-ownership protection. |
| Source files | BSL-001–009 above name all primary symbols/paths and immediate identity, capture, flag, layout and deployment dependencies. |
| Tests | Install identity, PDF browser and capture link assertions; manifest/resolver/bridge/panel/store units; VM worker helper tests. Assertions and substitutions inspected; execution not-run. |
| Dependencies | Accepted identity/capture owners, PWA process mode versus API flags, browser service-worker control and IndexedDB, current foreground member/visibility. No live database/model/device dependency exercised. |
| Uncertainties | U11/U74 and AI-U01–AI-U05 above; disputed claims excluded, none prevents supported extraction. |
| Confidence | Implementation-supported; high for aligned manifest descriptors, medium for browser/configuration seams, safe-area, worker control and staging. Runtime verified behavior: none. |

## Artifact status and evidence review

| Sequential slice | Change path under openspec/changes | Requirements / scenarios | Lifecycle |
| --- | --- | --- | --- |
| Metadata / launch | baseline-app-installation-metadata-launch | 7 / 14 | Generated, source-reviewed, strict validated, accepted under AI-D01, synced to main |
| Worker share transport | baseline-app-installation-share-transport | 6 / 15 | Generated, source-reviewed, strict validated, accepted under AI-D01, synced to main |
| Browser staging / recovery | baseline-app-installation-staging-recovery | 4 / 12 | Generated, source-reviewed, strict validated, accepted under AI-D01, synced to main |
| Main capability | openspec/specs/app-installation/spec.md | 17 / 41 | Promoted; changes remain active, unarchived |

Every normative requirement and its scenarios was reconciled to the evidence rows
above; metadata declarations and conditional software paths were retained, device
outcomes and disputed assertions excluded. Design files explain current boundaries;
tasks contain documentation checks only, not implementation or future architecture.
All three changes include CLI-generated `.openspec.yaml`, proposal, delta, design
and documentation-only tasks. No artifacts were conditionally skipped.

No consequential unresolved question prevents completing the supported ordinary
baseline. U11/U74 and AI-U01–AI-U05 remain qualifications/exclusions for separate
future scope; no acceptance of disputed behavior is implied.

## Session record — 2026-10-16

- Branch: `moving-to-openspec`; commit: `04a1c4570f9bbb01b47436790d4248635ac3179a`.
- Before edits, recorded full staged/unstaged patches, status, index entries and
  140 dirty/untracked file digests in `/tmp/wfs-app-installation-baseline/`.
  Capability plan was clean; app-installation main/change paths did not exist.
  Index `docs/openspec-baseline-plan.md` already had staged and unstaged changes;
  its before-image is preserved there. Existing dirty harness/CI/Taskfile,
  shared workflow, other capability plans and many OpenSpec artifacts are not
  owned by this task. Concurrent recipe-search promotion and tonight-plan summary
  updates were observed during scope review and preserved, including shared-index
  rows and recipe-search tasks/plan. The Git index remained byte-identical to the
  initial captured entries. No selected application source/test/configuration file
  was dirty at baseline. Raw status/patches retain the complete input inventory.
- Authorization: this user's explicit completion request, recorded as AI-D01.
  No additional human-review event, approval, runtime acceptance or implementation
  authority is claimed. A09–A12/A34 retained.
- Discovery: all ten fields and BSL-app-installation-001–009 completed; source,
  actual assertions, fixtures, mocked APIs, blocked workers and configuration
  substitutions reconciled. Three slices generated, validated and promoted in
  sequence. Evidence mappings cover every requirement and all nested scenarios.
- Task-owned changes: this capability plan, only the app-installation summary row
  of the shared index, three new change directories (five files each), and the
  new main app-installation spec. No shared workflow edits.
- Checks before final gate: strict validation passed for each selected change;
  installed sync workflow main-spec validation passed after slices 1–2.
  All-main strict validation passed after slice 3 (14 specs at that moment),
  and strict selected change revalidation passed for all three deltas.
  Source/delta equality, 17/41 counts and complete requirement mapping checks passed.
  `task verify -- <all 18 task-owned paths>` passed documentation, selected
  spec checks and content stability in run `7222843b281a4e0487cc7dfe19e45dfb`.
  Failed/blocked checks: none. That run covers pre-checklist-update content;
  a fresh final run verifies these final records. Its unique record and actual
  outcomes are reported in the final response, without later document edits.
- Runtime/browser/OS/worker/device/PostgreSQL/model/deployment checks: not-run
  under A34 and explicit scope. Application red/green, contract/client generation,
  database migration, deployment and archival: not-applicable to this task.
- Complete within authorized source-supported scope; exclusions remain explicit.

## Next action

No further extraction or promotion is required for the supported ordinary-household
app-installation baseline. Any runtime/device/OS/deployment qualification,
variant extraction, defect repair or archival requires a separately selected scope.
The historical review-only prompt and discovery-not-started checkpoint are
superseded by AI-D01 and this completion record.
