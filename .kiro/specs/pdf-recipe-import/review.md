# PDF recipe import preview — current review and historical evidence

Status: specification consolidation reviewed; product decisions recorded, technical gates remain unresolved. No implementation approval.
Reviewed source baseline: 9eb64bb06339b25861e45b559284629064c30f7a, followed by this authorized revision.
Workflow: .agents/prompts/spec-writer.md → .agents/core/specification-workflow.md, then .agents/prompts/spec-reviewer.md. Applied sequentially to this package; no external agent/persona output is claimed.

## Current authority and consolidation

Current acceptance is [requirements.md](requirements.md) PDF-R01–15; approach is [design.md](design.md) D1–D8; dependent work/checks are [tasks.md](tasks.md) T01–T08. Feature specification, design-first, gated cadence, planned lifecycle. Stable IDs are new for the consolidated checklist. The existing package is registered with current capture/recovery/storage/flag dependencies.

Only the current sections above the historical archive carry review status. The archive preserves past findings, rejected proposals and user dispositions as evidence. Every archived correction, Acceptance paragraph and “pending” label is historical, superseded by the current artifacts. Do not convert archived draft preservation, PDF GOTO promotion, Cancel, unlock staging retention, rating/notes omission, original-PDF export or multi-recipe detection proposals into implementation requirements.

Consolidation preserves: primary photo chooser layout; enabled PDF file extension/Android sharing; iOS picker; rating/notes/no dish designation; server PDFtoImage + normal workflow; unchanged retained PDF/internal page-image viewer; one recipe/20 MB/10 pages; no Cancel; restart/reset on interruption/navigation/unlock/member change; existing Settings failed-job Retry/Delete; best-effort/shared-session feedback/uncertain duplicates; acquisition-only flag and unchanged GOTO/household eligibility. User guide/flow docs/Synology template/env remain required future deliverables.

## Spec-reviewer findings, risks and open questions

- **Finding F1 / OQ-01 — architecture resolved by user:** conversion is a separate processor in existing recipe-import after pending PDF source acceptance. Existing automatic retries and failed-task Settings Retry/Delete apply; corrupt/encrypted PDFs stay failed for the user to delete. Requirements/design/tasks now replace synchronous conversion-before-acceptance. Source/metadata retention, safe partial-page retries and existing cleanup/listing still need implementation evidence.
- **Open question Q2 — contract gate:** design D3 / OQ-02. PDF multipart field names file/rating/notes and 202 {data:{id}} are now approved, but exact field schemas/transport errors remain to be synchronized in OpenAPI. Page/content failure belongs to the conversion processor. The photo contract has an existing files-versus-images mismatch; leave its rename out of scope. Approve PDF wire semantics after tracing actual contracts; tests/mocks must not decide them.
- **Risk R3 — runtime qualification:** design D4/D6 / OQ-03. Renderer/native timeout, production memory/disk/quality, architecture compatibility and orphan-share limits are not measured. 200 DPI PNG is a candidate. Qualify before setting release guarantees; do not infer cancellation or supported CPU from library documentation.
- **Open question Q4 — manifest/config gate:** design D6 / OQ-04. Actual serving/linkage and deployment-wide selection must be chosen consistently for API/PWA/Synology before advertising required Android PDF sharing.

Historical assertion contradiction B4 is resolved by this consolidation and archive boundary. B1 interruption and B2 unlock/member reset follow the user's restart decision; no recovery architecture is required for unsaved selections. B3 recovery follows Settings import-job requirement and is covered by F1's remaining technical gate. These dispositions do not reopen accepted preview tradeoffs.

## Review checklist and actual evidence

- Writer registry search: repository spec_registry.py searches pdf (no registered PDF match), capture and import (existing photo/url/bundle/progress/recovery baselines). This is a revision/registration of the existing descriptive package, not a new duplicate.
- Bounded source evidence at the pinned baseline: CapturesController, CaptureFailureService, FeatureFlagService, photo capture and failed-capture requirements, recipes helper and FailedCapturesSection; prior source maps remain explicitly subject to T01 revalidation. Source observations affect requirements, seam design and task order rather than being just a file list.
- Semantic/traceability review: all PDF-R01–15 map to D1–D8 and required T01–T08/checks; tasks name affected browser/API route, scenario, mock owner and envelope/proposal state. Gates block dependent tasks; no successor is authorized.
- Scope: requirements/design/tasks/review, registry and rendered index only. Application, OpenAPI, user docs, deployment templates and live .env are unchanged; their updates are planned deliverables.
- Validation results are recorded after the final content check below. Application/API/device/container checks are not run (specification-only); full checkout Task session tooling is unavailable. Private baseline uses pinned HEAD/blob identities and remote path inventory.

## Consolidation validation results

Passed: python3 -B scripts/agent/spec_registry.py render and check pdf-recipe-import on a materialized specification snapshot using the repository script; selected-package artifact/dependency checks and exact generated-index comparison passed.
Passed: full registry/dependency/active-package artifact-path comparison against pinned remote Git tree plus new local artifacts; no unregistered active directory or missing active artifact path. This is path-existence validation, not a full materialized-checkout task spec:check run.
Passed: static checklist has exactly PDF-R01–15, T01–T08 required task sections, explicit OQ-01–04 gates, and a boundary before preserved historical text. Semantic writer/reviewer pass maps requirements to design/tasks/checks and preserves user decisions; At consolidation F1/Q2/R3/Q4 were unresolved; the subsequent processor decision resolves F1/OQ-01, leaving Q2/R3/Q4.
Not run: application/API tests, browser/device/renderer/container/compose qualification and full-checkout Task session/spec commands; no runtime/template/OpenAPI implementation performed. Local checkout unavailable; remote baseline 9eb64bb06339b25861e45b559284629064c30f7a and blob identities retained privately.
Completion delta limited to requirements.md, design.md, tasks.md, review.md, spec-registry.yaml and generated SPEC_INDEX.md. Original historical review content preserved under the non-authoritative archive.

## Approved processor decision and review — 2026-10-02

User explicitly selects a separate conversion processor in the existing workflow. This supersedes API-process conversion-before-acceptance. API persists unchanged PDF, rating/notes and pending recipe, then returns acceptance; server workflow converts and continues normal extraction. Photo jobs skip conversion. Workflow retries are retained; encrypted/corrupt failed jobs stay in Settings for user Delete, with no automatic deletion or special cancellation/password UI.
Writer/reviewer synchronization: PDF-R05/06/08/10, D3–D5, T01/T03/T04/T05/T08 updated. OQ-01 retained with resolved status; wire/API/resource/manifest gates remain. No product/runtime/OpenAPI/template implementation. Metadata/count/readiness and attempt-cleanup safety are required checks, not a claim of running code.
Current checks: stable requirement/task/gate IDs and remote text/content scope verification; application/API/renderer/device checks not run. Historical archive remains untouched. The earlier consolidation-validation statements describe their original content identity, not this later processor implementation.

## Approved exact input limits — 2026-10-02

User accepts 20 MiB = 20,971,520 bytes, matching the existing photo convention, enforced at API upload before pending-import persistence. The separate workflow conversion processor checks 10 pages; over-limit documents fail the whole job in existing Settings recovery with no truncation. API/schema details remain OQ-02; this resolves only the byte/page boundary decision.
Requirements/design/tasks are synchronized, including exact boundary checks (20,971,520 versus 20,971,521 bytes; 10 versus 11 pages). Historical 20 MB wording remains evidence only; current specification uses 20 MiB. No application/OpenAPI changes or runtime qualification; remote content verification is the completion check.

## Approved PDF acceptance wire decision — 2026-10-02

User approves multipart/form-data file (one PDF), rating and notes on POST /api/recipes/capture-pdf, returning 202 {data:{id}} after pending source/recipe persistence and before workflow conversion. id is the pending recipe GUID, not a workflow ID or readiness guarantee. Requirements/design/tasks are synchronized; source/default/error schema details remain OQ-02 for later contract work. No OpenAPI/client/runtime changes in this specification revision; remote content verification performed.

## Historical archive — non-authoritative

<details>
<summary>Prior reviews and decision history (superseded assertions; evidence only)</summary>

# PDF preview regression and family-experience review

Status: findings only; no runtime fixes or approved-contract changes.
Reviewed branch: codex/pdf-recipe-import-preview, after design commit 48fc7a66feb3bd945e95d20f1ac806818b7c42af.
Reviewed design: [design.md](design.md). Source reads used the branch ref, not an immutable checkout; revalidate at implementation.
Lens: [.agents/prompts/mere-designer.md](../../../.agents/prompts/mere-designer.md), applied directly to interruptions, cognitive load, recovery and family effects.

Product disposition, 2026-10-01: the user accepts best-effort completion feedback and manually managing duplicate recipes. R2's durable feedback/reconciliation requirement and R3's idempotency requirement are withdrawn. Their observations remain documented below; they are not implementation blockers. Further disposition, 2026-10-02: draft loss is accepted, withdrawing R1's preservation/recovery requirement and R9's draft-preservation/discard-confirmation requirement. Family GOTO keeps its existing photo flow; PDFs are excluded from that chooser, resolving R4 by exclusion. R5 is resolved by the user's approval to preserve the existing capture layout and extend the recipe-file picker to enabled PDFs outside Family GOTO. R6 is resolved by the approved disabled-share message and explicit navigation, with file reselection accepted after a Settings detour. R7's product scope is resolved: one recipe per PDF, including multipage recipes; multi-recipe PDFs are unsupported and no automatic detection or splitting is added. Extraction/readability qualification remains required. R8's access/side-effect scope is resolved: the flag gates acquisition only, saved recipes follow existing household readiness/access rules, and import alone leaves voting, planning, groceries and GOTO unchanged. Shared-device session completion feedback is also accepted: another member may see household import feedback, without new notification filtering; attribution remains with the authenticated submitting member. Remaining findings still apply within these decisions.

Recommendation: revise the remaining design gaps before implementation. The page-image adapter remains a promising minimal seam, but the current spec does not yet substantiate its interruption-safe or no-support-needed outcome. The findings below distinguish new design risks from inherited limitations. No application tests were executed.

## R1 — Accepted tradeoff: flag refresh can discard a file or photo draft

Disposition, 2026-10-02: unsaved draft loss is accepted. The correction and retention acceptance below are historical recommendations, not preview requirements. Do not add draft persistence, stable editor ownership, recovery or discard confirmation for this slice. Keep API-side feature enforcement and established member identity checks.

Design lines 38 and 54 select a complete capture layout by effective flag and default to legacy while unresolved. In pwa/src/components/featureFlags/FeatureFlagProvider.tsx, window focus calls refresh. In pwa/src/store/featureFlagStore.ts, refresh calls load, which immediately empties flags even for the same member. The hook consequently returns false.

Trigger: Mom enables the preview, opens the system picker, and returns with a PDF. Focus refresh can flip the entire capture boundary to legacy and then back. If the alternate components own draft state, they unmount and lose the selected file or previously entered photos/notes. The same transient transition can affect kids' ordinary captures when this preview is enabled for them.

Smallest correction: put draft ownership above the feature decision and keep an active editor stable across same-member revalidation. Block new PDF Save if the server disables the flag, while keeping the file and a clear recovery action. Do not continue submitting using stale enablement. Distinguish same-member refresh from actual member change; re-confirm attribution on identity change. If the shared flag store is changed, include its existing cooking preview consumers in regression checks.

Acceptance: enabled capture with photos/notes → picker → focus refresh false/loading → enabled again retains all draft data. Repeat with network failure, real off response and member change. No upload happens automatically.

## R2 — Accepted tradeoff: completion feedback may be missed

The pending and notification stores are session-only, and SSE feedback may be missed after app closure or when an event arrives before pending registration. The user accepts this: completed recipes can be found through browsing when ready.

No durable pending-state persistence, resume reconciliation, or missed-notification recovery is required for the PDF preview. Verify that a completed recipe is browseable without a toast or pending entry. Preserve best-effort existing feedback.

RecipeService can also persist a recipe without successful workflow launch. This is a separate inherited limitation: acceptance copy must not imply readiness or verified launch. Record the limitation; do not expand this slice into a new durable queue/recovery system.

## R3 — Accepted tradeoff: uncertain retries may create duplicates

The UI lock prevents repeated taps during one active request; it does not prevent a second recipe after a lost response and retry. The user accepts identifying, flagging and deleting duplicates with existing controls.

Server idempotency, cross-tab submission deduplication and exactly-once recovery are not requirements for this preview. Keep the local lock and ordinary retry behavior. Confirm existing duplicate-management actions remain usable for page-image imports; do not add new management UI.

## R4 — Resolved by scope: Family GOTO retains its photo flow

Disposition, 2026-10-02: exclude PDFs from the Family GOTO chooser regardless of preview enablement. Preserve its existing photo flow, pending promotion and return context. Ordinary and externally shared PDFs add library recipes only and do not mutate GOTO. The support recommendation below is superseded; acceptance now checks exclusion and unchanged GOTO photo behavior.

Design line 42 always navigates Home and the PDF proposal carries no GOTO intent behavior. MinimalCapture currently branches on intent=goto and photo/link/description handlers save pending GOTO entries; the GOTO path provides a Settings destination.

Trigger: Mom enters capture from Family GOTO, chooses the new PDF option and saves. An implementer following the spec can add a library recipe without adding it to the fallback rotation she intended to update.

Smallest correction: explicitly support intent=goto with the existing pending promotion and return context, or exclude PDF from that contextual chooser with clear copy. Supporting the intent is the more natural extension. Do not change unrelated bundle/GOTO behavior in this slice.

Acceptance: PDF from ordinary capture, external share and Family GOTO each have defined destinations and effects. GOTO submission creates exactly one pending rotation entry and promotes it when ready; ordinary imports do not change GOTO.

## R5 — Resolved: preserve capture layout and extend the file picker

Disposition, 2026-10-02: approved. Keep photo import primary and every existing action in its established position in both preview states. Extend the existing recipe-file picker for PDFs only when enabled, outside Family GOTO; keep .txt bundle handling separate. Do not introduce Other ways. The earlier disclosure proposal is superseded. Verify existing direct links and keyboard/screen-reader paths.

Design line 38 couples PDF enablement to moving Describe a recipe and Import recipe file under Other ways. This makes an import preview alter unrelated familiar controls. Description is a practical way for a child to add an idea without possessing a recipe document. The spec's broad legacy tests do not settle on-path discoverability.

Smallest correction: keep the existing description/file actions in their established positions for the first PDF slice and extend the file action to accept PDFs. Treat progressive disclosure as a separately evaluated small UX change, or explicitly accept it within this preview with discovery checks for Mom and the kids. Keep direct mode=describe and mode=photo links working.

Acceptance: both preview states retain one understandable route to each existing capability; direct links and keyboard/screen-reader paths work. If the disclosure is retained, test finding Describe and a shared .txt bundle without instructions, including a child user.

## R6 — Resolved: disabled-share message and explicit destinations

Disposition, 2026-10-02: approved. Resolve identity/flags before showing a disabled verdict; flag failure keeps submission disabled. For disabled PDF preview, show “PDF import preview isn’t enabled. This file hasn’t been added.” Offer Preview features only when opt-in is available and Choose another way returning to ordinary Capture, including launches without browser history. Never automatically enable, switch identity or save. File reselection after Settings is accepted; the staged-token preservation/return-to-file recommendations below are superseded by the draft-loss tradeoff. Verify deployment off, opt-in disabled, loading/failure, stale manifest and both destinations.

Design lines 56–58 advertise PDF sharing for the deployment, while effective enablement is per member. The share sheet cannot know which family member will be selected. Its proposed Back action also lacks a guaranteed external-app return destination.

Trigger: Mom opts in on the shared tablet, a child switches identity and shares a PDF, and the app appears to accept the file before saying the preview is unavailable. Alternatively, Mom follows the Settings link to opt in and loses the confirmation context.

Smallest correction: specify three receiver states: resolving identity/flags, opt-in available but disabled, and deployment off. Do not show a disabled verdict while loading. In opt-in mode, preserve the staged token through Settings and provide an explicit return to the file after confirmed opt-in; do not silently switch identity or auto-save. For deployment off, offer dismiss/choose another way and explain that the file has not been added. Define fallback navigation for launches without browser history.

Acceptance: separate opted-in and non-opted-in members, stale manifest, unknown identity, flag request failure, Settings detour and browser Back. No lost file, accidental opt-in or unexplained empty capture screen. This is a usability issue, not a request for a new parental permission system.

## R7 — Scope resolved: one recipe per PDF; qualification remains

Disposition, 2026-10-02: approved. Support exactly one recipe per PDF, including a single recipe across multiple pages. Multi-recipe PDFs are unsupported. Confirmation says “Choose a PDF containing one recipe”. Reuse normal photo extraction; do not add cookbook splitting, multiple-recipe output or automatic multiple-recipe detection. The automatic ambiguous/multi-recipe rejection recommendation below is not an approved extraction change. Qualify representative single-recipe extraction and readable page images before rollout; multi-recipe fixtures document limitations rather than establish support or a detection guarantee.

Source-retention decision: the user explicitly requires retaining the unchanged original PDF and converting its pages to images for the normal photo-import flow. View original must display those readable page images. The earlier proposal to discard the PDF is superseded; direct Gemini PDF input is not selected.

Design lines 10–12 promise one recipe but leave multiple-recipe behavior unqualified. The confirmation only shows a filename. The revised design rasterizes pages, retains the source PDF and keeps sourceType as photos. Source storage must exclude the PDF from image enumeration.

Trigger: Mom shares a short collection or a file with nutrition/cover pages. Existing extraction might merge recipes or return an apparently plausible result. A child cooking from it could see mismatched quantities or steps. This is an unverified quality risk, not an established extraction defect.

Smallest correction: qualify single-recipe multipage fixtures, unrelated-page and two-recipe fixtures before rollout. Explicitly reject ambiguous/non-recipe results rather than label them ready; if the current processor cannot support this, narrow supported documents and state the limitation plainly in confirmation. Say “Choose a PDF containing one recipe.” Ensure View original still exposes readable rendered pages. Do not promise downloadable original PDFs or imply generated hero imagery is the user's dish photo.

Acceptance: representative bilingual, scanned, multipage, cover-page and multi-recipe fixtures; readable originals on a phone; exact ingredient quantities/units and ordered instructions. A chosen render resolution must preserve that content. Any required extraction behavior change needs an explicit scoped task.

## R8 — Resolved: existing household access and shared-device feedback

Disposition, 2026-10-02: approved. The PDF flag gates acquisition only. Ready imported recipes follow existing household access/readiness/eligibility rules, including for members with preview off; no new immediate promotion is introduced. Import alone does not change votes, meal plans, grocery lists or Family GOTO. Verify these behaviors without expanding existing eligibility policy. Further disposition, 2026-10-02: retain existing session feedback across member switches; another member may see household import completion feedback. Do not add member-specific notification filtering or redesign feedback-store ownership. Preserve authenticated submitting-member attribution; later member switches do not reattribute accepted recipes. The filtering/ownership recommendation below is superseded by this accepted tradeoff.

The feature flag is per member; recipe persistence/library is shared. The design says disabling preserves recipes, but its test table does not explicitly cover a non-opted-in child using Mom's imported recipe or effects on voting/planning/groceries.

Smallest correction: state that the PDF flag gates acquisition only. Existing recipe access and eligibility rules still control view, search, voting, planning and cooking. Import alone must not cast votes, assign meals, alter the weekly grocery list or change GOTO. Follow the existing readiness/discoverability policy instead of inventing immediate promotion. Define whose capture feedback remains visible on a shared-device member switch; the current notification stores do not carry member ownership.

Acceptance: Mom imports → child with preview off can view/cook after readiness and participate in existing discovery when eligible. Pending/failed recipes do not appear as cookable. Planning/vote/grocery state is unchanged by importing alone. Test member switch during upload and completion for attribution and confusing notifications.

## R9 — Resolved: no PDF cancellation; server processing continues

Disposition, 2026-10-02: draft loss is accepted; the preservation and explicit-discard recommendations below are withdrawn. Further user decision, 2026-10-02: no PDF-specific Cancel action. Save launches server-side conversion and the normal photo-import workflow; leaving the screen does not request cancellation or retract launched server work. Merely choosing/sharing a file does not submit it. No new client/server cancellation mechanism or durable upload/queue guarantee is added. Preserve honest copy and the accepted duplicate-on-retry tradeoff; no draft recovery requirement remains. Cancellation recommendations below are historical and superseded.

The design promises Cancel creates no mutation, but that can only hold before Save is sent. After Save begins, an aborted browser request can still complete on the server. It also promises preservation of an existing photo draft on PDF cancel, yet automatic Home navigation after PDF success will unmount that draft.

Smallest correction: distinguish pre-submission Cancel from leaving during an in-flight import. Never imply an abort erased server work. Ordinary retry may create a duplicate under the accepted tradeoff; no submission identity/reconciliation is required. Define handling of an unsaved photo draft when starting a PDF import: preferably prevent mixing and offer Keep editing photos / Choose PDF with an explicit discard decision, or preserve the draft beyond the PDF route. Settle long-running conversion copy before using immediate Home navigation.

Acceptance: cancel before Save produces no request; leaving during upload does not falsely claim server work was cancelled; Save PDF with existing photos/notes does not silently discard them; timeout offers retry, with duplicate results accepted.

## Preserved decisions and review limits

The dedicated PDF endpoint, unchanged image-only photo validation, finishedDishImageIndex=-1, photo-import rating/notes semantics, shared workflow reuse, default-off flag and iOS picker fallback are sensible boundaries. Keep them unless fixture evidence requires a change.

Mom's actual phone and unaided usability remain unverified. This review establishes source/spec risks, not observed device failures or passing tests. Do not declare all PDF promises covered by the current “reuse” design until the remaining decisions and family acceptance scenarios are explicit. R1 is an accepted tradeoff and R4 is resolved by excluding PDFs from Family GOTO. R2 and R3 are accepted tradeoffs, not prerequisites. Do not turn inherited photo limitations into an unbounded cleanup project.

Initial review delta: one new review document only. Follow-up disposition updates this review and the proposed design to record the user's accepted feedback/duplicate tradeoffs; no application code or API contract changes. Repository Task harness unavailable without a local checkout; review used GitHub connector reads and a new-file commit, with remote content verification.

Specification follow-up, 2026-10-02: recorded accepted draft loss and Family GOTO exclusion in design/review only. Capture-layout/file-picker proposal was subsequently approved on 2026-10-02 and recorded in both documents. No runtime implementation or approved API contract changes. Local checkout and Task harness were unavailable because Git clone could not reach the configured proxy; baseline used branch HEAD and fetched blob identities, followed by remote content verification.

Specification follow-up, 2026-10-02: recorded approved disabled-share behavior and resolved R6; no application or OpenAPI changes. Remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: approved one-recipe PDF scope, explicitly excluding multi-recipe PDFs and new automatic detection/splitting. Fixture qualification remains release evidence; no application or OpenAPI changes.

Specification follow-up, 2026-10-02: approved acquisition-only flag scope and unchanged household access/readiness and import side effects. Member-switch feedback was subsequently accepted on 2026-10-02 and recorded above. No application or OpenAPI changes; remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: approved existing session completion feedback across shared-device member switches, with submitting-member attribution preserved. R8 is resolved within existing household behavior; no application or OpenAPI changes. Remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: approved per-PDF input limits of 20 MB and 10 pages. Exceeding either rejects the whole document before recipe acceptance; no page truncation. Exact byte threshold must be specified in the approved contract following repository conventions. Renderer dimensions/pixels, memory, temporary disk and timeout limits still require specification and production-container qualification. No application or OpenAPI changes; remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: removed the PDF Cancel action per user decision. Launched work is server-side and proceeds through conversion and the reused photo-import workflow; leaving does not request cancellation. API conversion-before-acceptance remains unchanged. No application or OpenAPI changes; remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: user requires PDF import to provide the same rating and notes controls/defaults/validation as photo import and preserve supplied values through recipe creation/workflow. The earlier rating/notes omission and forced unknown-rating proposals are superseded. No cooked/finished-dish photo selection; PDF pages remain source images with finishedDishImageIndex=-1. Updated proposed endpoint metadata and acceptance scope, without changing OpenAPI or application code. Remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: Android PDF sharing to the installed app is required, from any originating app offering a compatible PDF file share through the OS share sheet. No origin-app restriction; receiver opens confirmation with rating/notes and does not auto-save. Real Android OS registration and representative source-app cold/warm sharing are release evidence, not established by synthetic navigation. User agrees to the iPhone/iPad file-picker strategy; native iOS sharing remains outside preview scope. No application or OpenAPI changes; remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: approved dedicated authenticated POST /api/recipes/capture-pdf for one PDF plus photo-import rating/notes. Existing photo endpoint remains image-only; both use the normal photo-import workflow. Exact multipart schemas, response/error details and resource limits still need contract specification/qualification; this decision does not change OpenAPI or application code. Remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: approved photo-import progress and return-to-Home behavior for PDFs: show “Preparing your PDF…” during upload/server conversion, then add the accepted recipe ID to the existing pending store and navigate Home while the normal workflow continues. Reuse existing photo-import progress/feedback conventions; no separate PDF processing screen or new countdown. No application or OpenAPI changes; remote content verification used because the local checkout/Task harness remains unavailable.

Specification follow-up, 2026-10-02: approved internal-only retention of the unchanged PDF for the preview. View original shows readable rendered pages via the existing image viewer; no PDF download/export action or PDF viewer is added. Retention/storage lifecycle requirements remain in force. No application or OpenAPI changes; remote content verification used because the local checkout/Task harness remains unavailable.

Specification clarification, 2026-10-02: navigating away resets unsaved capture selection/state, including PDF/images, rating and notes; returning requires selecting a new PDF or image. Staged Android shares are temporary initial delivery, not recoverable drafts. Discard an abandoned active capture's staged share; accepted server work continues. The proposed 24-hour pending-draft lifetime was not approved. Orphaned staging still needs bounded storage/cleanup, with implementation resource limits to be specified. No unrelated photo-flow cleanup, application or OpenAPI changes authorized; remote content verification used because the local checkout/Task harness remains unavailable.

## Mère-Designer busy-day re-review — 2026-10-02

Status: findings only, awaiting disposition; no new product decisions, design edits, OpenAPI changes or implementation.
Reviewed immutable commit: 25497758098da8757273cd3167021b1661588612.
Sources: design.md and review.md, verified against their pinned blob identities, plus .agents/prompts/mere-designer.md. The spec directory contains only design.md and review.md; requirements.md is absent. Requirements were therefore assessed as embedded in design.md, not as an independently verified requirements document.
Method: scenario walkthrough of Android sharing while interrupted, initial unlock/member selection, rating/notes entry, navigating away, uncertain submission, rejected documents and later household cooking. No runtime/source revalidation, application tests, device tests or observed usability results. Local checkout/Task harness unavailable; private baseline is the reviewed commit and fetched blob identities.

### What works for a busy day

Photo remains primary with familiar actions in place. Android PDF sharing opens confirmation directly, avoiding a repeated source-choice step. Rating/notes use the familiar photo flow; no cooked-dish page choice, PDF Cancel action or mandatory extracted-recipe editing is introduced. After acceptance, Home returns attention to supper while ordinary processing continues. View original uses readable page images in the existing viewer. Existing household access and Family GOTO behavior remain intact.

Accepted draft resets, uncertain-retry duplicates, missed feedback and shared-device notifications remain accepted. This review does not reopen them or propose durable draft recovery, idempotency, notification ownership, cookbook detection or a new queue.

### B1 — P1: “launched” can imply safety before upload reaches the server

Interaction: Mom taps Save on a scanned PDF while mobile reception is poor, then switches apps to answer a call or closes the PWA. Mom's interaction says Save launches server processing and leaving does not retract launched work. The execution boundary still requires the browser upload and synchronous API conversion before an accepted ID. Neither a tap nor an incomplete upload establishes that the server has the entire document; inherited workflow-launch failure also means acceptance is not verified workflow execution.

Household consequence: she can assume the recipe is safely underway when nothing usable reached the server, then discover it missing at supper. This is a false-certainty gap, distinct from the accepted loss of completion feedback.

Smallest useful correction (proposal only): distinguish uploading, server preparation and accepted recipe ID in the requirement wording and existing progress UI. Promise continuation only for work that actually reached the server; do not tell the member that a Save tap guarantees receipt, completion or workflow launch. Keep no Cancel and ordinary retry/duplicate behavior. Do not add durable delivery infrastructure.

Acceptance to approve/qualify: interrupt before upload completion, after full receipt during conversion, and after accepted ID. Verify honest progress/outcome copy and the existing failure/retry behavior; no early success claim. The server-work continuation requirement itself needs implementation evidence, not a spec assertion.

### B2 — P2: initial delivery versus abandoned capture needs an explicit boundary

Interaction: a cold Android share goes through unlock/member selection before confirmation. “Receiving a shared file” preserves the token through that initial delivery but deletes it when navigation leaves active capture. The exact point at which capture becomes active, and which transitions are authentication delivery versus abandonment, is unspecified.

Household consequence: cleanup can delete the PDF during required unlock, making the Android share path fail before Mom reaches Save. Alternatively, treating all navigation as initial delivery could restore a draft she deliberately abandoned, contrary to the approved reset behavior.

Smallest useful correction (proposal only): define the delivery boundary as initial share handoff through required unlock/member selection into confirmation, then treat leaving the active confirmation/capture as abandonment. Specify how cold launch, member change and app suspension are classified. Do not equate losing browser focus with navigating away; do not add resume persistence.

Acceptance to approve/qualify: locked cold share reaches confirmation once with no submission; unlock/member selection does not prematurely delete the file; leaving active capture resets PDF/rating/notes, and returning cannot restore the abandoned token. Test an incoming second share so cleanup cannot delete the newer handoff.

### B3 — P2: limits and rejection copy do not yet give a concrete quick next step

Interaction: Mom shares an 11-page recipe, a password-protected PDF, or a corrupt download. Confirmation names the one-recipe scope but does not explicitly expose the approved 20 MB/10-page limits; the design says errors have a next step without specifying the member-facing distinction.

Household consequence: she can enter rating/notes and wait before learning the file cannot be accepted, then repeatedly try the same unsupported file. The accepted draft-reset tradeoff makes repeated preparation especially costly.

Smallest useful correction (proposal only): show compact guidance near file selection/confirmation, such as “One recipe · up to 10 pages · 20 MB”. Reuse existing error presentation with concrete reasons and Choose another file. Explain that encrypted files need an unlocked copy; do not add password entry or page editing. For a known validation/conversion rejection, say no recipe was added; for an uncertain transport outcome, do not make that promise. Keep this copy distinct from the approved preview-disabled path.

Acceptance to approve/qualify: oversize/over-page, encrypted, corrupt and uncertain network cases each have an understandable next action. Keyboard-open notes entry leaves Save and errors reachable with one hand; rating/notes semantics remain identical to photos. This is qualification, not a new form redesign.

### B4 — P2: historical review acceptance can reintroduce rejected behavior

Interaction: an implementer turns the older review's Acceptance paragraphs into tests. R1 still demands retained drafts, R4 still demands PDF GOTO promotion, R6 still demands no lost file through Settings, and R9 still mentions Cancel and forbids silent draft loss. Disposition paragraphs supersede them, but the old imperatives remain interleaved with current scope.

Household consequence: implementation can reintroduce recovery/discard dialogs, PDF GOTO behavior or cancellation controls that the user explicitly excluded. Requirements are spread across the design, historical findings and repeated follow-up notes, with no separate requirements.md.

Smallest useful correction (proposal only): consolidate a current requirements/acceptance section and clearly label or relocate superseded review acceptance as historical evidence. Preserve decision history without treating old corrections as live requirements. No behavior or approved decision needs changing.

Acceptance to approve/qualify: a reviewer can derive one unambiguous current set of requirements for navigation resets, no Cancel, GOTO exclusion, Android sharing, rating/notes, source retention, single-recipe limits and existing household feedback without resolving historical contradictory imperatives.

### Review conclusion and evidence limits

The approved scope is suitable for a lightweight import preview, but a claim that it handles interruptions unaided remains unqualified. Prioritize B1's receipt/continuation wording; then clarify handoff cleanup and concrete rejection paths before implementation acceptance is finalized. Renderer readability/performance, real Android cross-app sharing and phone usability remain release evidence to obtain, not passing results from this review.

Review-only delta: appended this findings section to review.md; design and embedded requirements remain unchanged. Proposals require user disposition one at a time under the existing session instruction.

## Busy-day review disposition — user clarification, 2026-10-02

B1: interruption requires the user to restart; no durable delivery/recovery guarantee or additional interruption flow is requested. Launched server work still has no cancellation control; a tap or incomplete upload must not be described as completed receipt.
B2: the initial-unlock preservation proposal is declined. Unlock/member change has the same reset effect as leaving capture, including the staged PDF, rating and notes. The user restarts/selects again; Android staging bridges only the foreground handoff.
B3: rejected/failed submitted PDFs use existing Settings import-job Retry/Delete like links/photos. No separate PDF recovery UI is selected. Pre-recipe validation/conversion rejection needs explicit failed-capture integration and retained source for retry; this is a remaining specification seam, not verified reuse.
B4: historical-assertion consolidation remains awaiting approval. Proposed option: one current requirements/acceptance document, with superseded assertions in this review clearly marked historical. No consolidation performed yet.

Added required implementation deliverables to design.md: docs/user-guide.md; process documentation under docs/flows; release-template/synology/compose.yaml, .env.example and README.md. Deployment/runtime files are not changed in this specification-only turn. Live .env values are applied during deployment rather than committed.
Evidence: inspected existing CAP-07 recovery design, photo-upload data-flow and Synology template/env example at the branch commit. No application tests or device checks. Scope delta: design/review only; remote content verification used because local checkout/Task harness remains unavailable.

</details>
