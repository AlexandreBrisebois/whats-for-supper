# PDF preview regression and family-experience review

Status: findings only; no runtime fixes or approved-contract changes.
Reviewed branch: codex/pdf-recipe-import-preview, after design commit 48fc7a66feb3bd945e95d20f1ac806818b7c42af.
Reviewed design: [design.md](design.md). Source reads used the branch ref, not an immutable checkout; revalidate at implementation.
Lens: [.agents/prompts/mere-designer.md](../../../.agents/prompts/mere-designer.md), applied directly to interruptions, cognitive load, recovery and family effects.

Product disposition, 2026-10-01: the user accepts best-effort completion feedback and manually managing duplicate recipes. R2's durable feedback/reconciliation requirement and R3's idempotency requirement are withdrawn. Their observations remain documented below; they are not implementation blockers. R1, R4 and the other UX findings still apply.

Recommendation: revise the remaining design gaps before implementation. The page-image adapter remains a promising minimal seam, but the current spec does not yet substantiate its interruption-safe or no-support-needed outcome. The findings below distinguish new design risks from inherited limitations. No application tests were executed.

## R1 — P1: flag refresh can discard a file or photo draft

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

## R4 — P1: Family GOTO intent is dropped by unconditional Home navigation

Design line 42 always navigates Home and the PDF proposal carries no GOTO intent behavior. MinimalCapture currently branches on intent=goto and photo/link/description handlers save pending GOTO entries; the GOTO path provides a Settings destination.

Trigger: Mom enters capture from Family GOTO, chooses the new PDF option and saves. An implementer following the spec can add a library recipe without adding it to the fallback rotation she intended to update.

Smallest correction: explicitly support intent=goto with the existing pending promotion and return context, or exclude PDF from that contextual chooser with clear copy. Supporting the intent is the more natural extension. Do not change unrelated bundle/GOTO behavior in this slice.

Acceptance: PDF from ordinary capture, external share and Family GOTO each have defined destinations and effects. GOTO submission creates exactly one pending rotation entry and promotes it when ready; ordinary imports do not change GOTO.

## R5 — P2: enabling PDFs moves the kids' existing actions

Design line 38 couples PDF enablement to moving Describe a recipe and Import recipe file under Other ways. This makes an import preview alter unrelated familiar controls. Description is a practical way for a child to add an idea without possessing a recipe document. The spec's broad legacy tests do not settle on-path discoverability.

Smallest correction: keep the existing description/file actions in their established positions for the first PDF slice and extend the file action to accept PDFs. Treat progressive disclosure as a separately evaluated small UX change, or explicitly accept it within this preview with discovery checks for Mom and the kids. Keep direct mode=describe and mode=photo links working.

Acceptance: both preview states retain one understandable route to each existing capability; direct links and keyboard/screen-reader paths work. If the disclosure is retained, test finding Describe and a shared .txt bundle without instructions, including a child user.

## R6 — P2: deployment-wide share registration creates a dead end for non-opted-in members

Design lines 56–58 advertise PDF sharing for the deployment, while effective enablement is per member. The share sheet cannot know which family member will be selected. Its proposed Back action also lacks a guaranteed external-app return destination.

Trigger: Mom opts in on the shared tablet, a child switches identity and shares a PDF, and the app appears to accept the file before saying the preview is unavailable. Alternatively, Mom follows the Settings link to opt in and loses the confirmation context.

Smallest correction: specify three receiver states: resolving identity/flags, opt-in available but disabled, and deployment off. Do not show a disabled verdict while loading. In opt-in mode, preserve the staged token through Settings and provide an explicit return to the file after confirmed opt-in; do not silently switch identity or auto-save. For deployment off, offer dismiss/choose another way and explain that the file has not been added. Define fallback navigation for launches without browser history.

Acceptance: separate opted-in and non-opted-in members, stale manifest, unknown identity, flag request failure, Settings detour and browser Back. No lost file, accidental opt-in or unexplained empty capture screen. This is a usability issue, not a request for a new parental permission system.

## R7 — P2: source preservation and one-recipe scope can produce misleading results

Design lines 10–12 promise one recipe but leave multiple-recipe behavior unqualified. The confirmation only shows a filename. Pages are rasterized and the PDF is discarded, while sourceType remains photos.

Trigger: Mom shares a short collection or a file with nutrition/cover pages. Existing extraction might merge recipes or return an apparently plausible result. A child cooking from it could see mismatched quantities or steps. This is an unverified quality risk, not an established extraction defect.

Smallest correction: qualify single-recipe multipage fixtures, unrelated-page and two-recipe fixtures before rollout. Explicitly reject ambiguous/non-recipe results rather than label them ready; if the current processor cannot support this, narrow supported documents and state the limitation plainly in confirmation. Say “Choose a PDF containing one recipe.” Ensure View original still exposes readable rendered pages. Do not promise downloadable original PDFs or imply generated hero imagery is the user's dish photo.

Acceptance: representative bilingual, scanned, multipage, cover-page and multi-recipe fixtures; readable originals on a phone; exact ingredient quantities/units and ordered instructions. A chosen render resolution must preserve that content. Any required extraction behavior change needs an explicit scoped task.

## R8 — P2: the child's experience after Mom imports is not specified

The feature flag is per member; recipe persistence/library is shared. The design says disabling preserves recipes, but its test table does not explicitly cover a non-opted-in child using Mom's imported recipe or effects on voting/planning/groceries.

Smallest correction: state that the PDF flag gates acquisition only. Existing recipe access and eligibility rules still control view, search, voting, planning and cooking. Import alone must not cast votes, assign meals, alter the weekly grocery list or change GOTO. Follow the existing readiness/discoverability policy instead of inventing immediate promotion. Define whose capture feedback remains visible on a shared-device member switch; the current notification stores do not carry member ownership.

Acceptance: Mom imports → child with preview off can view/cook after readiness and participate in existing discovery when eligible. Pending/failed recipes do not appear as cookable. Planning/vote/grocery state is unchanged by importing alone. Test member switch during upload and completion for attribution and confusing notifications.

## R9 — P2: upload interruption and cancellation semantics are incomplete

The design promises Cancel creates no mutation, but that can only hold before Save is sent. After Save begins, an aborted browser request can still complete on the server. It also promises preservation of an existing photo draft on PDF cancel, yet automatic Home navigation after PDF success will unmount that draft.

Smallest correction: distinguish pre-submission Cancel from leaving during an in-flight import. Never imply an abort erased server work. Ordinary retry may create a duplicate under the accepted tradeoff; no submission identity/reconciliation is required. Define handling of an unsaved photo draft when starting a PDF import: preferably prevent mixing and offer Keep editing photos / Choose PDF with an explicit discard decision, or preserve the draft beyond the PDF route. Settle long-running conversion copy before using immediate Home navigation.

Acceptance: cancel before Save produces no request; leaving during upload does not falsely claim server work was cancelled; Save PDF with existing photos/notes does not silently discard them; timeout offers retry, with duplicate results accepted.

## Preserved decisions and review limits

The dedicated PDF endpoint, unchanged image-only photo validation, finishedDishImageIndex=-1, unknown rating, shared workflow reuse, default-off flag and iOS picker fallback are sensible boundaries. Keep them unless fixture evidence requires a change.

Mom's actual phone and unaided usability remain unverified. This review establishes source/spec risks, not observed device failures or passing tests. Do not declare all PDF promises covered by the current “reuse” design until R1 and R4 are resolved and the family acceptance scenarios are explicit. R2 and R3 are accepted tradeoffs, not prerequisites. Do not turn inherited photo limitations into an unbounded cleanup project.

Initial review delta: one new review document only. Follow-up disposition updates this review and the proposed design to record the user's accepted feedback/duplicate tradeoffs; no application code or API contract changes. Repository Task harness unavailable without a local checkout; review used GitHub connector reads and a new-file commit, with remote content verification.
