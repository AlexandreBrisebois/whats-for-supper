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
