# Design

## Current delivery checkpoint

At `a666a64f`, canonical storage/guarded editing, flagged correction and fresh
URL/photo publication have bounded local evidence. See [tasks](tasks.md) for exact
records and remaining criteria. Ordinary binding production is not implemented;
it now includes import and post-edit reevaluation under the step companion.
The [accepted baseline](proposal.md) sets coordinated deployment, maintenance reuse,
old-client refresh and bilingual deferral. The source descriptions below explicitly
refer to their historical checkpoints; do not reimplement them without checking
current code and evidence.

## Context and Existing Ownership

Source inspection at `d51222ffbb7e3eb6d08fed394851a52de3f5522c`, branch `recipe-view-redesign`, 2026-11-07. Uncommitted browser-parity edits are concurrent evidence, not part of this change. `RecipeService.UpdateRecipe` writes string Ingredients while `SupperIngredientProjection.Read` requires whole-list coherence before binding retained supply. Its `IntentionallyUnquantified` phrase list is not a validity rule for the new model. `CategorizeIngredientsProcessor` still reads raw supply. `SyncRecipeProcessor` replaces raw content and basis from disk. These were competing publication paths at that historical checkpoint; current URL/photo and guarded editing support is recorded above.

The existing projection/context and durable invalidation owners remain authoritative for dated counts, previews, cooked baseline and prepared receipts. The new model replaces their recipe input. Shared ownership and conflicts are in [review.md](review.md), exact proposed public/persistence boundaries in [contracts.md](contracts.md).

## Decisions and Tradeoffs

Use one `contentRevision` instead of the old draft's `ingredientRevision`: ingredients, basis, step text/bindings and shopping association can invalidate one another. This increases honest conflicts between simultaneous editors, but prevents mixed revisions. Notes/rating-only updates remain independent. Stable IDs are unrelated to order, displayed name and food ID.

Use bounded exact rational quantities, a tagged scalar/range union, independently nullable unit, original notation and explicit scaling policy. A stored zero is real, missing is unknown. Strings are rendered compatibility output; no second quantity store or prose parser on reads. Preserve source evidence/provenance separately. No whitelist of qualitative phrases and no always-visible repair selectors.

A complete content read includes all instructions and original facts even where step bindings are uncertain. Safe migration may retain a per-recipe legacy adapter until canonical publication can preserve trustworthy facts and exact wording. Never zip by position or import rounded projections. A known 200 g with unknown basis remains known original 200 g.

Import-time AI may propose facts and identities through existing provider boundaries. It cannot certify evidence or publish over protected human values. Existing Report issue/Review issue plus eligible reimport remain available. `RecipeAgent` currently writes recipe.json before `SyncRecipeProcessor` updates the DB; unchanged reuse would bypass protection. Future controlled reprocessing must stage results before file and DB publication, compare captured content/source revisions and preserve unselected media and human edits. Report state is not ingredient completeness and generation is not a saved correction.

## First Observable Slice

The approved sequence now extracts the coherent identity/guarded-publication
prerequisite needed by grocery continuity before grocery closure. See the
[prerequisite review](grocery-prerequisite-review.md) for boundaries, recovery
activation gate, precision proof limits and required checks. This does not close
this change or its companions and does not narrow grocery acceptance.

Search → detail at eight portions from basis four → Edit original 200 g pasta and untouched 100 ml sauce → Save pasta 250 g → reread 250 g original and 500 g dated, with one shared revision and source retained. Include a proven whole-use step in the coordinated step slice; until that slice passes, this tracer is not complete portions support. Exercise UI → generated client → real API → PostgreSQL plus durable grocery/search invalidation, and method-sensitive mock equivalents.

## State, Concurrency and Recovery

A guarded write atomically changes original facts, dependent-binding validity, human protection, contentRevision and durable derived obligations. Derived execution and notification remain later effects with updating/failed/current status. A timeout may follow commit: preserve the draft, reread and reconcile, never blindly replay. Concurrent ingredient/step writers using one baseline cannot both succeed.

Explicit nulls/empty collections are authoritative; retained metadata cannot revive them. Unrelated IDs/order/sections/media stay unchanged. A local active cooking session retains its coherent installed revision until explicit accepted refresh; a new read of a prepared meal uses current recipe with recorded prepared portions, never a fabricated historical snapshot.

## Compatibility, Rollout and Reversal

Alex confirms that frontend, backend and database deploy together as one release.
Do not design a rolling mixed-version backend/schema compatibility period or a
permanent legacy string-write adapter. Canonical records reject old ingredient/
instruction payloads atomically even with a current revision; stale tabs use the
supported refresh route with recoverable drafts and current-original reconciliation.
The current app's unconverted/review-material editing path remains supported.
Coordinated deployment still requires guarding delayed workers, preserving data
and verifying the matching application/schema recovery pair.

Add storage, settle contracts and client/draft fencing, qualify guarded publication, then in-place conversion under [rollout.md](rollout.md). Recovery and current-format-only support belong to the migration companion. No permanent legacy backup adapters. A per-recipe legacy read adapter during conversion is not old-backup restore compatibility. Disabling new code after new writes is not safe rollback.

## User Experience

Keep amount, unit and description as the primary editor fields. Accept fractions/ranges in amount. Shopping-name correction and fixed exceptions use progressive disclosure. Original and Reset stay in recipe actions; preserve quiet preview state, current phone/tablet composition, horizontal portions editor, original overlays, drafts, check states, exact offset and completion protections. Review EN/FR at 320 CSS px, 200% text and tablet Split View separately from automated checks.

## Approved decisions and remaining qualification

Alex approved keeping an explicit partial step amount at its original value when the ingredient total changes; it still scales with portions. Relative language stays relative to the corrected total. Proven whole uses follow that total, and inconsistent allocations require quiet review without blocking cooking. The step companion now includes the dependent reconciliation task.

Checked grocery ranges compare against the demand captured when the row was checked: only new minimum greater than that baseline maximum resets the check. Preserving the check does not advance its baseline. New split/merge rows start unchecked; unchanged continuing rows retain checks under that comparison rule. Upgrade has no active grocery list to convert: the next recipe-derived list is new, while historical data and extra occurrences remain preserved.

Dataset adoption remains a deferred bilingual gate, not a prerequisite of this portions release. Conditional disk fallback uses stable-ID comparison and stops/reports unexpected mismatches rather than choosing a disk/live winner. Alex reports no UI recipe edits and Dreaming synchronization, so no elaborate per-recipe conflict workflow is required solely for such edits. These accepted product decisions do not authorize implementation or release.


## Fresh-intake publication cutover — 2026-11-10

### Selected user outcome and existing requirement

Complete the first fresh-web portion of task 3.1 and recipe-capture's canonical publication requirements: URL capture → the real `url-import` workflow with provider doubles → server-owned canonical publication → ordinary detail/edit → dated projection and groceries. A four-serving recipe with 200 g pasta and 100 ml sauce must be editable to 250 g pasta through normal guarded Save; at eight portions the ingredient view and grocery demand show 500 g pasta exactly once, with sauce unchanged at its corresponding factor. Stable IDs, evidence and unrelated household state survive retries. This does not complete task 3.1's other intake/repair channels or the step companion.

At the reviewed `eec1ce51` baseline, code already stages acquisition/extraction and commits a publication journal before delivery. `RecipeAgent` submits normalized legacy JSON, `RecipeFilePublicationStore` rejects every canonical non-export writer, and `SyncRecipeProcessor` confirms existing producer publications rather than converting files. A second conversion in SyncRecipe would introduce a separate content commit after the producer's journal. Ordinary conversion intentionally protects unknown legacy facts and creates empty step bindings; it must not be repurposed unchanged as fresh-source authorship.

### Proposed narrow cutover

1. Establish freshness from server-retained bootstrap/launch ancestry plus the captured empty destination, not a caller flag, current `IsReady=false`, a recipe name or today's disk contents. If that evidence is absent, do not reclassify an existing or recovered recipe as fresh. Existing legacy conversion and canonical repair fences remain intact.
2. Derive a canonical candidate before publication through a small internal preparation function reusing exact quantity validation and lossless original-text handling. Allocate ingredient/section/step IDs and revisions once into the existing staged operation. A model may propose source facts; it may not choose saved IDs, protection or validation status. Retain normalized extraction evidence distinctly from original HTML/media and from current facts; do not call normalized output an immutable provider response. New witnessed source facts use the already-contracted `source` provenance; legacy/unknown authorship remains protected. No food mapping, unit conversion, package inference or phrase whitelist is added.
3. Commit canonical facts, compatible ingredient/instruction renderings, captured input/result receipt and existing derived obligations at the current publication transaction. Deliver `RecipeExportContent.Current` recipe JSON using the existing journal/replay mechanism. Its captured baseline source revision is a guard; the committed source revision must describe the selected new evidence, not be copied blindly from the pre-extraction baseline. SyncRecipe confirms/resumes that same producer operation and performs no second conversion or disk-to-database overwrite.
4. Carry the workflow to completion. The actual URL-import chain includes GenerateHero, SyncRecipe, CategorizeIngredients, CategorizeRecipe, RecipeReady and CompleteRecipeImportReport after extraction. Permit only the needed existing nonsemantic hero/readiness outputs against canonical content after validating their selected fields/files and captured guards; they must not replace canonical facts, revisions, source evidence or human selection. Category reads must use current canonical shopping/description facts when present, retaining the legacy adapter for unconverted recipes. Do not broadly remove the canonical publication fence or enable existing-recipe source replacement.
5. Extend the existing frozen publication/processor/launch-chain recovery validation for this candidate kind, using its retained input and result. Recovery must not infer fresh authorship from today's state, allocate replacement IDs or re-run a provider. Existing backup/seed/sync remains the recovery path; no new package, public API, journal framework or old-backup adapter.

The existing readiness contract is a separately bounded prerequisite: `.task/canonical-readiness-20261110/` qualifies permitting only captured RecipeReady metadata through the canonical launch/commit/resume fences, while semantic writers remain rejected. Its real PostgreSQL cases retain exact facts/files, stale guards and current event/receipt behavior. The fresh-intake milestone must reuse that owner, not reimplement it. No broader task checkbox is closed by this readiness increment.

### Approved fresh-intake review retention (2026-11-10)

A line with no trustworthy measurement is valid canonical text with independently absent amount/unit. Alex approved retaining usable ingredient/step wording from a fresh intake whose trustworthy facts cannot safely become canonical. The retained material is a guarded publication into the existing unready editable recipe, with original source and an operation receipt that says review material was retained, not that extraction completed. The extraction task remains failed and the existing content-review flag exposes it. No legacy-only publication is marked successful or ready; malformed or contradictory proposals cannot become validated facts merely to finish the workflow.

Recovery uses the existing Ready for review filter and original-content editor. A person can correct ingredients and steps, Save and reopen; an eligible changed Ingredients/Steps comment with a usable URL starts the existing guarded repair. An unchanged comment does nothing. Neither manual Save nor flag resolution certifies full import. For the witnessed fresh-URL review path, the accepted repair's captured human content becomes the candidate. Its retained supply must uniquely associate with the corrected line, and the current human text must have a losslessly representable exact amount/unit/description. An explicit human change from `200 g pasta, diced` to `250 g pasta` therefore supplies 250 g canonical facts while the earlier 200 g supply token remains separately retained as source evidence. Ambiguous associations or unrepresentable wording fail the attempt and leave the recipe editable and unready; no quantity is guessed from prose. Success publishes `review-canonical` under that repair task's journal with human-protected ingredient facts and fresh stable IDs, then existing hero/sync/category/readiness/report tasks can complete. The original failed extraction receipt never changes. A retry resumes committed delivery without calling the provider again, and a late replay cannot replace newer human fields. This narrow path does not turn older legacy reports or a manual Save into canonical repairs; general existing-recipe reprocessing remains task 3.1 work.

A human edit, clear, source replacement or membership change after capture rejects the delayed operation before any partial overwrite. After commit, interrupted delivery resumes the retained output without another provider call; a late completed replay must not reinstall old files over a newer edit. A report remains a report: no automatic unrelated resolution or correction claim. Existing household/history/extras are outside the selected write set.

### Binding boundary and remaining dependency

This milestone deliberately leaves new bindings empty/uncertain. `CookingStepProjection.Valid` verifies structural/revision/span/arithmetic conditions for already-confirmed uses; a provider-supplied `whole` label or `status=validated` cannot establish exhaustive semantic use. Matching a quantity to the row total, name or position is insufficient. A later narrowly reviewed inlet must specify what immutable evidence certifies ingredient association and whole/partial intent, validate unique UTF-16 spans and numeric roles, and abstain on ambiguous/repeated/time/temperature/package numbers. No new binding editor, language ontology or global inference rule is introduced here. Existing seeded-binding engine/live tests remain evidence for projection, not ordinary binding production.

### Acceptance and smallest alternatives

Use an existing CanonicalIngredientPublicationPostgresTests partial with the actual bootstrap/URL workflow and external-provider doubles. Prove fresh publication through ready status, ordinary generated-client edit/read/projection and grocery recompute; stable ingredient/step IDs, exact fractions/ranges/zero/null basis, source/media retention, no duplicate demand, and no household/history/extra changes. Include qualitative text and an unrepresentable trustworthy candidate, caller-forged freshness, delayed human clear, malformed IDs/operands, precommit cancellation, commit-before-delivery failure, unchanged retry, late replay after a later edit, and ordinary current-format backup/seed read-back of the new receipt/facts. Existing receipt/guard tests stay intact. Configure/discover the resulting native owner in the real PostgreSQL CI job and explicitly qualify a focused real browser/client seam; a mocked or seeded-content pass cannot establish the intake path.

The smallest coherent approach extends the existing transaction/journal and current codec. Converting after SyncRecipe is fewer call-site lines but breaks the single producer receipt/commit boundary and complicates replay. Making all old canonical writers pass is smaller syntactically but grants unqualified overwrite authority. A broader typed repair/binding-proposal pipeline could eventually serve more channels, but requires saved-identity/protection and semantic-proof decisions not settled by this first milestone. Guarded canonical success and distinct unready review retention serve different outcomes; neither claims complete step scaling or existing-recipe repair.

### Approved original-photo intake extension (2026-11-11)

Alex approved extending the same guarded canonical/review publication to **new photo recipes only** when the original photo and empty destination are verified. `recipe-import` also serves PDF and existing-recipe repairs, so its name or image presence alone grants no freshness. The extraction must descend from the original delivered photo bootstrap under the *same captured follow-up workflow ID*, with its declared original image bytes selected in the launch, no `original/source.pdf`, no HTML source, no prior ingredient/raw/canonical content and no ready state. Validate the retained follow-up intent and exact launch/field/file ancestry before publication. A later `recipe-import` on the same photo recipe cannot borrow that bootstrap. PDF-rendered pages cannot qualify as original photos.

Lossless photo extraction publishes `fresh-canonical` through the existing journal, hero, sync and readiness owners without replacing source images. Usable but unsafe wording publishes distinct unready `review-material` and the existing failed-extraction flag. A human can edit ingredient and step wording, then submit a changed eligible Ingredients/Steps comment; the existing image-backed `recipe-import` repair intent must capture those saved fields. Only that guarded repair may publish `review-canonical` from the selected human wording, without another provider response, then complete readiness/report flow. Manual Save/Resolve is not completion. Preserve failed receipts, replay protection, source/media bytes and unrelated human edits. General reimport, PDF, synthesis and share remain separate task 3.1 channels.

## Approved flagged-correction slice (2026-11-10)

The strict automated publication proposal above must not make a person's recipe read-only. Reuse RecipeImportReport, its reported/reviewed states, existing Reported search filter and badge; introduce no new draft status or product workflow. Only an exhausted semantic ingredient/usable-step validation failure with retained recipe content can create a missing system flag. Select only the failed content reasons, use Ready for review and its generic explanation, and persist a short safe explanation in the existing comment field. Acquisition, provider transport, image and category failures keep existing failed-capture handling. Preserve existing reports and only associate ordinary repair-failure diagnostics with their matching attempt. No automatic report resolution, repair launch or Ready transition follows a manual save.

The explicit filter-only report/review queue includes flagged unready recipes. Typed lexical/vector search and normal discovery/planning remain ready-only; do not infer expanded search eligibility from review-queue access. Detail and PATCH already support unready records. Open/Edit initializes authoritative original content, even when the dated projection cannot be read; it never saves a scaled preview as originals. The same editor offers original steps, stable canonical section/step IDs, and the existing legacy instruction representation without conversion on ordinary Save. Add/remove retains all unaffected wording and identities. Save, Cancel, error recovery and conflict reconciliation include steps as well as ingredients. Local unsaved edit recovery is an existing technical facility, not a new recipe status.

Canonical Save keeps human provenance/protection, independently nullable quantity/unit and original text. A changed step or invalidated ingredient dependency makes only unsafe proof ineligible for projection; unrelated valid uses remain usable. Do not guess allocations, erase readable instructions, or require a binding editor. Revision conflicts preserve the person's unsaved changes and require the existing intentional reread/reconciliation; automation captured earlier cannot overwrite an accepted correction.

Acceptance follows semantic content failure with retained material → existing Ready for review filter → open/Edit original ingredients and steps → Save/reopen → delayed producer rejection. Cover canonical and legacy content, no safe bindings, empty instructions, blank amount/unit, dated projection failure, Cancel/failure/reconciliation, unchanged report membership and unrelated household/history/extras. Use real normal-app/API/PostgreSQL and a generated-client/browser seam, plus CI discovery and final scoped verification. No whole-spec completion from this increment.

Existing flag comments keep their established meaning: a nonblank note on an eligible content report may request automated repair; a flag without a note is for human review. A system explanation SHALL describe the content issue without raw diagnostics, overwriting existing comments, or launching repair. Existing commented reports retain their guarded repair behavior and complete authorship/history/state.

## Reviewed system-review refinement (2026-11-10)

Alex approved a system flag only for actual ingredient/usable-step validation needs on retained editable recipe content. Use the existing Ready for review status and generic explanation, with a short system-authored explanatory comment and no repair launch. Unchanged feedback Save is a no-op; a changed human comment keeps the existing eligible correction rules (source URL/images, Ingredients/Steps, no Duplicate), history and stale-write protection. Do not turn image/category/transport failures into content reports or overwrite existing feedback. This is a limited bridge from content validation to the existing review queue, not replacement of failed-capture management. Review wording must not claim a re-import happened. Resolve retains its existing feedback-only semantics.

Use the existing Clear/deferred-cleanup guard conservatively: persisted ingredient/instruction/canonical content, including explicit empty saved collections, survives. This also retains some partial automated content; the trade-off avoids a new human-ownership marker/schema or recovery mechanism. Empty placeholders remain eligible for existing cleanup. Preserve the original-step editor and original-content entry, and verify system review → manual correction → reopen → changed comment correction, no-op unchanged save (including after backup/read-back), report preservation, clear protection and stale-job safety. The earlier broad failure-flag proposal is superseded; URL/photo canonical source publication is locally qualified, while other intake channels and ordinary binding production remain unfinished. Broader tasks and archive stay open until required acceptance passes.

The classifier does not treat arbitrary partial provider output as a completed extraction. For witnessed fresh URL work, the extractor may publish usable normalized wording as `review-material` under the existing journal before raising the typed semantic-content failure. The worker passes that classification after exhausting the attempt. The report owner verifies the persisted failed ExtractRecipe task and retained recipe before inserting a flag. Provider/network/image/category errors do not share that signal. Empty acquisition placeholders remain in existing failed-capture management.

The system explanation is stored in the existing report note, not dropped or hidden behind generic copy. No new origin field/status is needed: unchanged feedback without a retained RepairIntentId is a no-op, independently of authorship; an existing retained command keeps its original retry/reconciliation path. A changed comment or other eligible changed feedback requests a newly captured correction under existing rules. Current backup/read-back already preserves note/reasons/status and absence of a repair command; qualify that unchanged restored feedback cannot create one. Missing/deleted member attribution is never used to infer system origin.


## Coordinated explicit package input — 2026-11-12 UTC

Selected tasks 1.1–1.3 extend the existing guarded editor, not source extraction.
An explicit human declaration supplies the existing package object: count label,
exact scalar/range capacity, capacity unit and net/drained/unspecified basis.
The ingredient amount alone scales. Capacity remains fixed, without purchase
rounding, guessed package sizes, regional conversion or a new catalogue. Existing
canonical nonnegative quantity rules, including zero and independently unknown
count, remain unchanged. Line unit and package count label are independent: a
cleared line unit stays null and does not clear the package or acquire a fallback.

New literal unit objects carry null definition IDs. A non-null definition object
may only continue unchanged at its own saved line/count/capacity path; changing
text under the same ID, moving an ID or introducing one remains rejected. Capacity
and basis edits may retain those unchanged objects. A deleted row explicitly
restored as a new clientId retains its readable literal package facts but drops
old definition authority. Existing food-mapping, content/source guards, human
protection, operation replay and quiet relationship abstention remain in place.
Package numbers do not introduce a new cooking-step evidence grammar.

The existing ingredient options contain the optional package controls. Their exact
drafts survive failure, reload and explicit reconciliation; Cancel and acknowledged
Save retain their existing authority. Package capacity/basis/label differences and
clears appear in both conflict choices and the recovered-original display. Earlier
version-1 drafts lacking these optional controls compare using their saved package
facts, preventing an invented conflict solely from the new editor fields.

An additive optional projection displayText is server-owned presentation of the
exact count and fixed declared qualifier, for example `4 cans tomatoes (400 g /
cans; net)`. OriginalText retains original-basis meaning. Missing basis or bounded
arithmetic failure retains readable originals without inventing a factor. The
shared PWA formatter consumes this string and retains its prior fallback; the
general non-package exact public range/scalar display gap remains a separate
reconciliation item. Quantity-only cooking span formatting must not append a
package caption. EN/FR editor and recovery labels are localized; declared literals
and the current explicit basis qualifier remain readable without a new server
localization subsystem.

Grocery grouping and demand identity include the complete exact declared package
qualifier. Identical declarations aggregate counts; unlike capacities, bases,
labels/definitions and unpackaged purchases stay separate. The qualifier is added
to the final display name after category and normalized-key selection. Captions
never become identity or an extra mass demand. Non-package identity JSON retains
its previous bytes by omitting the new qualifier entirely. Existing contributor,
checked-demand, split/merge, retired-row and stale-write rules remain authoritative.

Serving/refresh semantic hashes use the previous six ingredient line fields in
their existing order plus the existing exact grocery operands. Derived displayText
is not semantic input. Only a sequence containing packages adds the full ordered
package operands, including null positions. This preserves old non-package hashes
and ensures a same-text definition clear still changes purchase-input versions and
enlists the ordinary grocery refresh. A new null presentation member must not
rewrite unaffected historical versions on deployment.

Qualification distinguishes focused units, real PostgreSQL, fixed-origin mocked
production browsers, same-origin native generated-client browsers, exact-image DV
and hosted CI. Native package fixtures explicitly convert the initial recipe and
author package facts only through ordinary human Save; they do not qualify source
package extraction. Current bounded recovery-codec evidence is not operational
full-library recovery or conversion acceptance. No aggregate completion or archive
follows this design checkpoint.
