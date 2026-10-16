# Cooking baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **26 requirements / 58 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

The user’s 2026-10-16 “promote” instruction accepts and authorizes promotion of
all four previously presented cooking drafts (C06). The supported ordinary-household
baseline is now promoted to [the main cooking spec](../../openspec/specs/cooking/spec.md):
26 requirements / 58 scenarios. Discovery is reconciled with U-cooking-01–09;
those exclusions remain non-normative and unaccepted as guarantees.
Artifact status: promoted documentation baseline; human acceptance: 2026-10-16,
selected supported scope only. The four change directories remain active and
unarchived. No application changes or runtime qualification. Runtime evidence
remains not-run/deferred under A34; documentary acceptance does not qualify the app.

Read [AGENT.md](../../AGENT.md) and [workflow](workflow.md) for shared authority.
The original capability map is discovery guidance; the evidence below is the
source-supported baseline at the recorded content identity.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 26 requirements / 58 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `1d6baff148cfea08eb741d0d2a72fa00e97a9a5d2710645eeebf0b717807ce94`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Authorization and settled decisions

- **C01 (2026-10-16, current user authorization):** Discover, reconcile and generate
  all documentation-only drafts needed for ordinary-household cooking, using
  bounded slices sequentially until the scope is accounted for. Stop at validated,
  evidence-mapped drafts ready for human review. Do not accept, promote, archive,
  implement, qualify runtime, stage, commit, publish or deploy. This supersedes
  this plan’s historical default review-only prompt and one-slice stopping point.
- **C02:** Preserve A01–A05/A07/A09–A12/A34 from the shared workflow. This request
  explicitly includes both focused and effective-flag-enabled single-page cooking;
  it does not select the broader preview-settings, demo or Synology variants.
- **C03:** Use one durable `cooking` capability with four disjoint ADDED deltas,
  reviewed in the order below. No main cooking spec or scaffolded cooking change
  existed at entry. The pre-existing untracked quality cooking-feedback proposal
  is preserved; do not create a competing quality change or assume it accepted.
  Concurrent work subsequently scaffolded its remaining artifacts and narrowed
  it to shared contextual reason/note initialization, explicitly leaving cooking
  entry/local return/acknowledgement to this sequence.
- **C04:** Optional design documents are deliberately omitted under the installed
  `design` instruction’s “create only if” rule: this is extraction with no new
  architecture, dependency, data model, migration or technical coding decision.
  Proposals and this plan carry the current trace and ownership decisions.
- **C05:** Withhold disputed/defective behavior as normative desired behavior.
  The uncertainty register accounts for its discovery without claiming that the
  withheld scope is specified or accepted. No consequential product decision was
  needed to draft the supported independent subset; resolving exclusions later
  requires separate human decisions.

- **C06 (2026-10-16, user “promote”):** Accept the supported 26-requirement /
  58-scenario subset presented in the preceding turn and sync the four selected
  deltas to main `cooking`, in dependency order. This supersedes C01’s earlier
  no-acceptance/no-promotion boundary only for these drafts. No archival,
  implementation, runtime qualification, staging, commit, publication or deployment
  is authorized. U-cooking-01–09 remain excluded/uncertain; no additional behavior
  is accepted by this instruction.

## Ten discovery fields

| Field | Reconciled discovery |
| --- | --- |
| Name | Cooking: prepare, read and request recording the viewed recipe |
| Business purpose | Let a household member follow a specific recipe and record cooking it independently of whether it matches tonight’s meal |
| Existing capabilities | Home/detail entry, detail loading, ingredient checks, legacy/flat/section instructions, focused/list reading, in-memory bookmark, source-step edit, quality handoff, awaited completion and local retry |
| Important workflows | Enter → load → prepare → read → optionally edit/report/detail → Cooked → await → celebrate/dismiss; failure remains in cooking; list Ingredients/Resume returns to current reading |
| Business rules | Viewed recipe ID is retained; preparation does not require all checks; effective flag selects mode; submission uses browser-local current date; only matching confirmed Today recipe changes locally; calendar matching stays server-owned |
| Source files | Linked ordered traces in BSL-cooking-001–012 and content digests below |
| Tests | CooksMode.test.tsx, stepParser.test.ts, instructionPresentation.test.ts, todayStore.test.ts and RecipeCookingIntegrationTests.cs; actual assertions/substitutions inspected, none executed |
| Dependencies | Household identity, recipe library, meal planning/calendar, recipe quality, household live updates; member preferences for effective settings/language (no main preferences spec exists) |
| Uncertainties | U-cooking-01–09 below; no durable/offline, exactly-once, transactional, cross-device or complete accessibility/language guarantees |
| Confidence | High for aligned source plus meaningful isolated assertions; medium for source-only failures, browser/device/layout behavior and substituted cross-layer seams. All normative behavior is implementation-supported, not runtime verified |

## Shared ownership reconciliation

Accepted owner references identify actual current requirement names, not invented IDs.
The current main owner specs include pre-existing dirty input; see identity record.

| Owner | Existing requirement / cooking-local consequence |
| --- | --- |
| [Household identity](../../openspec/specs/household-identity/spec.md) | “Apply member context after household access”, “Authenticate protected API requests independently”, and “Carry browser member context on shared SDK requests”. Cooking inherits protected entry and the shared client’s selected-member header/cookie fallback; it adds no personal cooking log or separate member gate |
| [Recipe library](../../openspec/specs/recipe-library/spec.md) | “Read stored array instructions through recipe detail”, “Mark search-derived recipe state pending with supported updates”, “Attempt one index dispatch after saving a supported recipe update”, “Write the supported recipe-info projection after the database save”. Cooking consumes recipe data and PATCH success; it does not own readiness/deletion, provenance, lifecycle, indexing or file/DB consistency |
| [Meal planning](../../openspec/specs/meal-planning/spec.md) | “Validate recipe-specific cooking without completing another assignment”, “Retain status-only day-validation compatibility”, “Publish supported changed-day validation after saving”. Cooking uses explicit recipeId/status two, not the legacy status-only path; unrelated supper is unchanged; overdue automatic cooking is referenced, not extracted again |
| [Recipe quality](../../openspec/specs/recipe-quality/spec.md) | “Merge contextual issue reasons with loaded saved feedback”, “Select issue reasons and an optional note”, “Validate report input at submission”, “Persist recipe-level feedback before attempting re-import”, “Let the server decide whether feedback requests contextual processing”, “Reuse active feedback and avoid unchanged terminal retries”, “Remove saved feedback through repeatable manual resolution”. Cooking only offers context and applies returned local state; detail polling requirements do not imply cooking polling |
| [Household live updates](../../openspec/specs/household-live-updates/spec.md) | “Attempt invalidation at supported schedule publication boundaries”, “Attempt incremental schedule publication after supported saves”, “Use connection identity only for immediate echo exclusion”, “Bound delivery to current process registrations”. Cooking success is not proof of another client’s receipt or even refresh of its own planner/library |
| [Member preferences](../../openspec/specs/member-preferences/spec.md) | “Resolve language for the selected loaded member” and “Select consumer experience using effective preview enablement”. Cooking consumes the resolved locale and effective cooking mode; preference persistence and preview policy remain with that owner. |

## Promoted artifacts and coverage

All four changes target `specs/cooking/spec.md` with disjoint ADDED requirement
names. Each carries the same Purpose because cooking main is absent; promotion under C06 reconciles the combined capability in this dependency order.
C06 supplies documentary acceptance; CLI artifact readiness (including a missing
optional design) does not establish acceptance or runtime verification by itself.

1. **entry-preparation** — [proposal](../../openspec/changes/archive/2026-10-16-baseline-cooking-entry-preparation/proposal.md), [delta](../../openspec/changes/archive/2026-10-16-baseline-cooking-entry-preparation/specs/cooking/spec.md), [tasks](../../openspec/changes/archive/2026-10-16-baseline-cooking-entry-preparation/tasks.md). Accepted/promoted 2026-10-16 under C06; selected strict validation passed; change retained unarchived.
2. **instruction-reading** — [proposal](../../openspec/changes/archive/2026-10-16-baseline-cooking-instruction-reading/proposal.md), [delta](../../openspec/changes/archive/2026-10-16-baseline-cooking-instruction-reading/specs/cooking/spec.md), [tasks](../../openspec/changes/archive/2026-10-16-baseline-cooking-instruction-reading/tasks.md). Accepted/promoted 2026-10-16 under C06; selected strict validation passed; change retained unarchived.
3. **edit-report-handoffs** — [proposal](../../openspec/changes/archive/2026-10-16-baseline-cooking-edit-report-handoffs/proposal.md), [delta](../../openspec/changes/archive/2026-10-16-baseline-cooking-edit-report-handoffs/specs/cooking/spec.md), [tasks](../../openspec/changes/archive/2026-10-16-baseline-cooking-edit-report-handoffs/tasks.md). Accepted/promoted 2026-10-16 under C06; selected strict validation passed; change retained unarchived.
4. **completion-recovery** — [proposal](../../openspec/changes/archive/2026-10-16-baseline-cooking-completion-recovery/proposal.md), [delta](../../openspec/changes/archive/2026-10-16-baseline-cooking-completion-recovery/specs/cooking/spec.md), [tasks](../../openspec/changes/archive/2026-10-16-baseline-cooking-completion-recovery/tasks.md). Accepted/promoted 2026-10-16 under C06; selected strict validation passed; change retained unarchived.

| Requested/discovered scope | Disposition |
| --- | --- |
| Entry, displayed recipe and member context | Promoted slice 1; identity owner referenced, BSL-001 |
| Detail loading and preparation | Promoted slice 1, BSL-002; generic fallback/no retry withheld U-01 |
| Hero/detail/similar navigation and ordinary close | Promoted slice 1, BSL-003; pending-request cancellation withheld U-06 |
| Legacy, flat structured and section steps | Promoted slice 2, BSL-004; arbitrary malformed/mixed parsing withheld U-02 |
| Focused and single-page reading/presentation | Promoted slice 2, BSL-005; effective flag consumed, full preference/preview setup remains owner scope |
| Navigation, client-held position and Ingredients/Resume | Promoted slice 2, BSL-006; durable/member-isolated/offline progress and stale bookmarks withheld U-03 |
| Language, accessibility and device boundaries | Evidenced controls promoted in slice 2, BSL-007; complete translation, focus/keyboard/device compliance withheld U-08 |
| Step edit Save/Cancel, success and single-page failure/retry | Promoted slice 3, BSL-008; focused feedback, fallback editing, stale concurrent saves withheld U-04/U-05 |
| Report entry, local result and recovery | Promoted slice 3, BSL-009; policy referenced to quality; active replacement/polling withheld U-07; existing quality proposal preserved |
| Completion, failure, retry and callbacks | Promoted slice 4, BSL-010; completion cancellation/idempotency withheld U-06 |
| Viewed/cooked recipe versus matching tonight | Promoted slice 4 local response behavior, BSL-011; server matching/history and publication referenced to accepted owners |
| History-driven rotation/summary and overdue finalization | Existing library/meal-planning owners referenced through BSL-011; no recency/eligibility extraction or client reimplementation |
| Concurrency, persistence, runtime and cross-client recovery | Source/test boundaries recorded in BSL-012 and U-03/U-05/U-06/U-09; no positive unsupported guarantees |
| Demo, broad preview-management, Synology, API-only arbitrary status validation | Explicitly excluded from ordinary cooking request under A09/A11; their presence is not a cooking UI capability |

## Non-normative uncertainty and excluded assertions

All entries are open qualifications, not future implementation tasks. They do not
prevent review of the supported subset. Their dependent guarantees are withheld,
not complete specifications of the excluded behavior.

| ID | Current evidence and reason | Withheld assertion / disposition |
| --- | --- | --- |
| U-cooking-01 | CooksMode fetch catch or empty parser result installs four generic English fallback steps; missing ingredients shows Extraction in progress regardless of cause. No load-error alert/refetch control exists. Synthetic content can be mistaken for recipe instructions | Do not normatively require these as correct recipe steps or claim successful recovery/retry; observed fallback is excluded pending human treatment |
| U-cooking-02 | stepParser selects its branch from the first element, ignores incompatible later entries, catches malformed nested values and returns empty on exception; type tags are not validated. OpenAPI array items are unconstrained although description lists strings/HowToStep | Only supported homogeneous strings/flat objects/section-child shapes drafted. No arbitrary JSON/mixed-array robustness or structured schema validation; section shape is permitted by the broad contract, not a promised complete parser |
| U-cooking-03 | plannerStore uses plain Zustand create with recipe-keyed cookProgress and no persist; gathered is component state keyed by ingredient text. No resetCookProgress call on completion/member switch, no bookmark clamp when steps change | No reload/durable/offline/cross-device or member-isolated progress, automatic reset after completion, independent duplicate-ingredient checks, or safe out-of-range recovery. Duplicate ingredient text shares one key and can distort the count; not desired behavior |
| U-cooking-04 | handleSaveEdit updates the source path, but fallback steps lack source mapping; unchanged branch and missing details can close editor without persistence. Focused failures set editError but render no alert; focused Save/Cancel and navigation are not equivalently guarded | Edit assertions limited to supported real source instructions; no universal edit success/retry feedback, blank-content validation or guarded focused editor guarantee |
| U-cooking-05 | Whole instruction array is PATCHed without version token; RecipeService saves DB then attempts indexing and writes recipe.info separately. Concurrent saves may overwrite another writer; storage failure can follow save | No conflict detection, merge guarantee, file/DB transaction or rollback on rejected request. Library owner retains persistence boundary; client success is only after request resolves |
| U-cooking-06 | completionInFlight protects one mounted view only; ScheduleService rewrites LastCookedDate from server clock for each recipe-specific request. Close is available during request; no abort or timeout cleanup; delayed callbacks are not cancelled on unmount | No exactly-once, idempotent retry, cancellation of a pending save, durable queued completion or guaranteed callback behavior after unmount. A rejected response may follow persistence/publication failure; retry is another request |
| U-cooking-07 | report result replaces recipeDetails but does not reparse parsedSteps. Cooking does not poll an import ID or subscribe locally to recipe-ready events. Acknowledgement is local and not auto-cleared | No automatic replacement of mounted instructions, completion polling/recovery, ready guarantee, or freshness across nested detail edits. Shared quality/background owners govern processing |
| U-cooking-08 | CooksMode uses t for some controls but generated Step headings, list labels, edit/report messages and celebration retain English. locales reads browser override/default; recipe GET does not request translation. Hero is a clickable div with no keyboard handler; ingredient buttons have aria-checked without checkbox role; outer cooking surface lacks dialog/focus-trap semantics | No fully translated cooking, member-language content translation, universal keyboard/focus accessibility, screen-reader compliance, device/browser rendering, wake lock or orientation guarantee. Responsive classes and safe-area padding are source evidence only |
| U-cooking-09 | RecipeCookingIntegrationTests uses CreateAsync with in-memory EF/storage, mocked orchestration and disabled auth; CooksMode mocks API, Today, router, animation and translations; single-page geometry is stubbed. No tests run this session | No real DB/filesystem transaction, auth, browser layout, network, service-worker/offline, multi-client delivery or device qualification. A34 and shared U10–U12 remain open |

## Behavior evidence entries

All BSL-cooking entries below are **implementation-supported**. “High” means
source and inspected meaningful assertions align, not current execution. Every
entry’s check outcome is **not-run** for behavior under A34; documentation check
results are recorded separately. Source paths are relative to this repository.

### BSL-cooking-001 — Entry and household context

- **Behavior and actor:** Entry and household context; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Household member opens Home cooking or loaded detail View steps; the entry recipe identity/name/image are passed to cooking.
- **Business rule and eligibility:** Home TonightMenuCard requires current id/name and not skipped/cooked/sessionDone; compact cooked badge can reopen. Detail action hidden during Edit and disabled while saving. Shared access/member gates remain identity-owned.
- **Failure / cancellation / recovery behavior:** Ordinary close uses caller callback; no entry completion. No distinct live planner cooking render was found: planner page imports CooksMode but has no JSX invocation.
- **Configuration and time assumptions:** Ordinary household; no demo/preview deployment assumptions.
- **Ordered trace:** HomeCommandCenter / RecipeDetailSheet → CooksMode → recipes.getRecipe → shared generated GET /api/recipes/{id} → RecipeController.Detail → RecipeService.GetRecipeDetail → RecipeDbContext.
- **Relevant source files and symbols:** pwa/src/components/home/HomeCommandCenter.tsx (handleCookMode and conditional CooksMode); pwa/src/components/recipes/RecipeDetailSheet.tsx (time-cook-btn and showCooksMode); pwa/src/lib/api/api-client.ts (HearthAuthProvider).
- **Relevant test assertions and substitutions:** CooksMode.test.tsx passes a specific recipe ID and asserts completion uses it; hero assertion uses mocked detail. Home/card gate is source-only.
- **API/implementation/test/documentation agreement or mismatch:** GET RecipeDetailResponse.recipe agrees with getRecipe; shared member header is transported, but completion has no per-member history field.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** No independent planner entry or member-isolated cooking state claim; U-cooking-03.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 1 entry; shared identity references.

### BSL-cooking-002 — Loading and preparation

- **Behavior and actor:** Loading and preparation; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Cooking requests detail; loader remains until finally. Success uses ingredients; Check & Prep at bookmark zero, count/toggles and Let’s Cook.
- **Business rule and eligibility:** Ingredient checks are keyed by text in component state; preparation is not a checklist-completion gate. Successful adapter maps absent ingredients to [].
- **Failure / cancellation / recovery behavior:** Failed fetch/empty parse uses fallback, not recovery of actual recipe; absent ingredients show extraction message. Exclude synthetic correctness U-01.
- **Configuration and time assumptions:** Local mounted state, recipe-keyed initial position; no network/offline guarantee.
- **Ordered trace:** CooksMode fetchDetails → getRecipe/mapToRecipe/unwrapUntypedNode → generated GET → RecipeController.Detail → RecipeService.MapToDto/ExtractRecipeInstructions → recipe Ingredients/RawMetadata + issue projection → prep.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.tsx (fetchDetails, gathered, nextStep); pwa/src/lib/api/recipes.ts (getRecipe,mapToRecipe); api/src/RecipeApi/Services/RecipeService.cs (GetRecipeDetail,MapToDto,ExtractRecipeInstructions).
- **Relevant test assertions and substitutions:** CooksMode.test.tsx “ingredient checklist toggles aria-checked on tap” asserts false/true/false; “keeps check and prep focused…” asserts preparation then first instruction; Ingredients-return test asserts checked state/count/bookmark retention. API read mocked.
- **API/implementation/test/documentation agreement or mismatch:** Approved RecipeDto has ingredients array/null and instructions array/null; service reads persisted values, adapter unwraps untyped nodes. No load retry operation.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** Duplicate text counting and fallback excluded U-01/U-03.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 1 loading and prep requirements.

### BSL-cooking-003 — Nested detail and ordinary exit

- **Behavior and actor:** Nested detail and ordinary exit; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Tap hero → same-ID detail without planning day; close returns; similar closes both and requests recipes?similarTo=id. Close control calls onClose.
- **Business rule and eligibility:** Body overflow is hidden during mount and restored on cleanup; nested detail suppresses cooking close control.
- **Failure / cancellation / recovery behavior:** Unmount resets component ingredient/edit/report state; recipe bookmark remains in store. Close does not abort requests.
- **Configuration and time assumptions:** Mounted client only; body restoration is source-only, not universal nested-overlay guarantee.
- **Ordered trace:** CooksMode showDetailId → RecipeDetailSheet props/callbacks → router.push; ordinary close → parent showCooksMode false. No API on close.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.tsx (body effect, hero, showDetailId, close-cooks-mode); pwa/src/components/recipes/RecipeDetailSheet.tsx.
- **Relevant test assertions and substitutions:** CooksMode.test.tsx “renders a large editorial hero image and opens detail sheet on tap” asserts detail mount with mocked detail; close/similar handlers source-inspected, not exercised here.
- **API/implementation/test/documentation agreement or mismatch:** Local callbacks agree; nested sheet’s source/edit/lifecycle policies stay recipe-library-owned.
- **Evidence class and confidence:** Implementation-supported / medium.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** Keyboard hero access and pending cancellation not guaranteed U-06/U-08.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 1 detail and close.

### BSL-cooking-004 — Supported instruction parsing

- **Behavior and actor:** Supported instruction parsing; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Loaded homogeneous string, flat object or section array becomes consecutive cooking steps in source order.
- **Business rule and eligibility:** Trim text; string blanks ignored; objects prefer text then name; supplied names become titles. Sections suppress generic English/French prefixes, retain other section context; sourcePath retains original index even skipped content.
- **Failure / cancellation / recovery behavior:** Falsy/nonarray/empty input returns []; malformed mixed/nested inputs are not guaranteed U-02.
- **Configuration and time assumptions:** No language translation; generic names include preparation/instructions/steps/directions/method/préparation/étapes.
- **Ordered trace:** Recipe RawMetadata → RecipeService.ExtractRecipeInstructions → RecipeDto → recipes.unwrapUntypedNode → parseRecipeSteps → CooksMode.
- **Relevant source files and symbols:** pwa/src/lib/cooking/stepParser.ts (parseRecipeSteps,isHowToSection,GENERIC_SECTION_NAMES); specs/openapi.yaml (RecipeDto.recipeInstructions and UpdateRecipeDto.recipeInstructions).
- **Relevant test assertions and substitutions:** stepParser.test.ts asserts trimmed string fields/sourcePath, flat heading fallbacks, 3 section steps with Cooking prefix and [1,0] sourcePath, real 8-step example, empty results, string/object preservation properties. Direct pure parser tests, no transport.
- **API/implementation/test/documentation agreement or mismatch:** Broad array items {} permits sections despite narrower prose; no schema mismatch justifying contract edits. No arbitrary JSON guarantee.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-02; fallback correctness U-01.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 2 legacy/flat and section requirements.

### BSL-cooking-005 — Focused and list presentation

- **Behavior and actor:** Focused and list presentation; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Effective false/unavailable flag uses one heading/instruction with Next/Back; effective true uses one ordered list after prep with Cooked.
- **Business rule and eligibility:** List suppresses generic Step N/redundant titles; section label appears on section change; paragraphs split only explicit blank lines.
- **Failure / cancellation / recovery behavior:** Focused scroll does not navigate; list reading never submits completion by scrolling.
- **Configuration and time assumptions:** useFeatureFlag reads effective enabled, default false; FeatureFlagService.Resolve owns On/OptIn/Off resolution; cooking does not calculate member eligibility.
- **Ordered trace:** FeatureFlagService snapshot → featureFlagStore.useFeatureFlag → CooksMode presentation; parseRecipeSteps → instructionPresentation.formatCookingInstruction → list paragraphs.
- **Relevant source files and symbols:** pwa/src/store/featureFlagStore.ts; api/src/RecipeApi/Services/FeatureFlagService.cs; pwa/src/lib/cooking/instructionPresentation.ts; pwa/src/components/planner/CooksMode.tsx.
- **Relevant test assertions and substitutions:** CooksMode tests “keeps preparation and then renders every editable step…” asserts both instructions; focused-mode assertion checks Next/Back and scroll; section test asserts French text content/heading/paragraph count and exact edit value. instructionPresentation.test.ts asserts join equals original, decimals, blank lines and CRLF. Flags are injected, layout not real.
- **API/implementation/test/documentation agreement or mismatch:** Consumer uses effective flag as intended; full preference setup and translation not extracted.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-08 language/device; mode changes during edit not qualified.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 2 modes and paragraph requirements.

### BSL-cooking-006 — Client bookmark and Ingredients/Resume

- **Behavior and actor:** Client bookmark and Ingredients/Resume; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Current step comes from recipe-keyed cookProgress; focused buttons set it; list scroll chooses row at reading edge or last row at bottom.
- **Business rule and eligibility:** Opening list uses held bookmark; scroll keeps same row/editor DOM. Ingredients stores scroll offset in a ref, preserves bookmark/checks, Resume restores offset.
- **Failure / cancellation / recovery behavior:** No persisted storage; no completion reset call or out-of-range clamp found. Reopening same client store can resume; new browser session cannot be promised.
- **Configuration and time assumptions:** Geometry-based edge +32px/bottom tolerance; references are component-local. Not a durable exact pixel bookmark across mounts.
- **Ordered trace:** CooksMode nextStep/prevStep/trackReadingPosition/useLayoutEffect/openIngredients → plannerStore.setCookProgress → view; no contract/API/persistence operation for position.
- **Relevant source files and symbols:** pwa/src/store/plannerStore.ts (create,cookProgress,setCookProgress,resetCookProgress); pwa/src/components/planner/CooksMode.tsx.
- **Relevant test assertions and substitutions:** CooksMode test “tracks single-page reading position…” stubs bounding rectangles, asserts 2/2 then 1/2, same row/editor/draft, store bookmark and remount; “returns to ingredients…” sets scrollTop 137, asserts retained checks/bookmark and restored offset.
- **API/implementation/test/documentation agreement or mismatch:** Source and mock geometry assertions agree for current client lifetime, not durable progress or real device scroll.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-03 stale/member state; pending completion separate U-06.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 2 memory position and Resume.

### BSL-cooking-007 — Language, flags, accessibility and device limits

- **Behavior and actor:** Language, flags, accessibility and device limits; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Cooking exposes labels, ingredient checked attributes, ordered list, progressbar and named completion/edit/close controls; styling has responsive hero/read columns and safe-area control padding.
- **Business rule and eligibility:** Flag enabled defaults false; cooked aria-label distinct from visual Cooked; list Ingredients disabled while editing.
- **Failure / cancellation / recovery behavior:** Some strings are t lookups, others hardcoded English; loaded recipe content is not translated. Clickable hero lacks keyboard button semantics.
- **Configuration and time assumptions:** locales.getLocale uses browser localStorage en/fr override then DEFAULT_LOCALE; member preference policy is not redefined. No screen wake lock or offline branch traced.
- **Ordered trace:** CooksMode → locales.t/getLocale and featureFlagStore; recipe GET has no translation parameter; responsive CSS/control attributes → browser presentation.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.tsx; pwa/src/locales/index.ts; pwa/src/lib/imageUtils.ts; pwa/src/store/featureFlagStore.ts.
- **Relevant test assertions and substitutions:** CooksMode tests assert aria-checked, Mark recipe as cooked accessible name, progressbar aria-valuenow, row labels and classes. Translation t mocked to fallback; motion simplified; no browser/device/screen reader execution.
- **API/implementation/test/documentation agreement or mismatch:** Static attributes support bounded semantics, not universal accessibility or deployment/device qualification.
- **Evidence class and confidence:** Implementation-supported / medium.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-08 excluded full localization/keyboard/device guarantees.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 2 exposed semantics; other language/device claims excluded.

### BSL-cooking-008 — Source-mapped edit and feedback

- **Behavior and actor:** Source-mapped edit and feedback; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Open focused or row editor → explicit Save builds whole instruction-array update at sourcePath → updateRecipe → local reparse/announce on resolution; Cancel discards.
- **Business rule and eligibility:** String replacement preserves other array entries; object uses text when present else name; section child retains wrapper. Unchanged real source instruction closes without PATCH.
- **Failure / cancellation / recovery behavior:** List pending disables Save/Cancel/other row editors; rejection retains draft and shows alert/Try again. Focused failure is not visibly rendered.
- **Configuration and time assumptions:** No version/merge token; only supported real source instructions, not fallback.
- **Ordered trace:** CooksMode.handleSaveEdit/updateInstructionValue → recipes.updateRecipe → generated PATCH → RecipeController.Update → RecipeService.UpdateRecipe RawMetadata/sidecar/EF save → index trigger attempt → ImageService.UpdateRecipeInfo → IRecipeStore/LocalRecipeStore.WriteInfoAsync → local recipe snapshot.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.tsx; pwa/src/lib/api/recipes.ts; api/src/RecipeApi/Services/RecipeService.cs; api/src/RecipeApi/Services/ImageService.cs; api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs.
- **Relevant test assertions and substitutions:** CooksMode explicit Save test asserts [Updated Step 1,Original Step 2] payload/local display; Cancel asserts no update/original display; list test asserts second-string payload; section test asserts raw editable text and Ingredients lock. Save rejection/focus-return/nested replacement are source-only here. API update mocked.
- **API/implementation/test/documentation agreement or mismatch:** OpenAPI UpdateRecipeDto array items {} and generated PATCH agree; return response ignored by void adapter, so local display is submitted snapshot, not authoritative reread. Library owns save/index/file boundaries.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-04 focused/fallback behavior and U-05 concurrent/partial persistence excluded.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 3 edit/Save/Cancel/retry requirements.

### BSL-cooking-009 — Quality context and local return

- **Behavior and actor:** Quality context and local return; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Eligible report control passes ingredients at prep or steps at reading to shared quality form with loaded issue; close preserves cooking state; success applies returned recipe and closes.
- **Business rule and eligibility:** canReimport gates entry; report hidden during edit. Shared sheet merges context with reasons/note; quality owns validation and server retry policy.
- **Failure / cancellation / recovery behavior:** Submission launch failure applies recipe then throws to form feedback; ordinary rejection keeps form. Resolution applies returned recipe/closes. reimportStarted produces local status acknowledgement.
- **Configuration and time assumptions:** No import polling or local ready subscription in CooksMode; parsedSteps is not reparsed after report.
- **Ordered trace:** CooksMode → RecipeImportIssueSheet → recipes.saveRecipeImportIssue/resolveRecipeImportIssue → generated POST/DELETE /api/recipes/{id}/import-report → RecipeController/RecipeImportReportService → RecipeImportReports/RecipeDbContext/workflow launch → returned DTO → local recipe/context.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.tsx (handleSaveImportIssue,handleResolveImportIssue); pwa/src/components/recipes/RecipeImportIssueSheet.tsx (mergeReasons,save,resolve); pwa/src/lib/api/recipes.ts; existing recipe-quality main spec and preserved cooking-feedback proposal.
- **Relevant test assertions and substitutions:** CooksMode Ingredients test asserts context/payload/reasons/checks and prep; Steps test asserts existing note/reasons merged, dismiss/reopen and bookmark retained; ineligible test asserts absent report action. API mocked; no workflow execution.
- **API/implementation/test/documentation agreement or mismatch:** POST/DELETE shape mapped by existing quality adapter; no new server policy. Existing quality proposal was unscaffolded at entry, then scaffolded/revised by concurrent work; it remains unaccepted input, not normative authority or an artifact edited here.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-07 no ready freshness/polling; broader quality policy referenced.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 3 report/local-result requirements.

### BSL-cooking-010 — Awaited completion and retry

- **Behavior and actor:** Awaited completion and retry; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Cooked from final focused step or list calls markCooked(entry ID); await resolves → celebration → 600ms timeout callbacks; rejection shows alert and retains position/view.
- **Business rule and eligibility:** Ref suppresses repeated submission within mounted view; forward disabled during pending; optional onCooked not required for recording.
- **Failure / cancellation / recovery behavior:** Failure resets ref/pending and clears error on next attempt. Close has no abort; callback timeout not cleaned up.
- **Configuration and time assumptions:** Browser-local date selected inside markCooked at request time; delayed callback requires view still mounted for bounded normative scenario.
- **Ordered trace:** CooksMode.finishCooking → todayStore.markCooked → generated POST /api/schedule/day/{date}/validate → response/exception → local celebration/error and caller close.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.tsx (finishCooking,nextStep); pwa/src/store/todayStore.ts (markCooked); pwa/src/lib/imageUtils.ts (getTodayString).
- **Relevant test assertions and substitutions:** CooksMode it.each(false,true) asserts viewed ID and close even without callback; completion failure asserts alert/no close; in-place test uses fake timers 600ms and asserts both callbacks once/no router push. Today mocked, no network.
- **API/implementation/test/documentation agreement or mismatch:** Source has awaited request before feedback; no exactly-once or cancellation contract.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** U-06 pending close, duplicate across views and post-save failures excluded.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 4 request, pending/success and failure/retry.

### BSL-cooking-011 — Viewed recipe, calendar match and local Today confirmation

- **Behavior and actor:** Viewed recipe, calendar match and local Today confirmation; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** markCooked submits status 2/recipeId for browser-local current date; only response true plus current local matching ID sets status 2 and clears nonCooking.
- **Business rule and eligibility:** Server available recipe lookup filters deletion; sets LastCookedDate server UTC. Different/no event saves recipe then invalidates fill-the-gap/returns false; match also updates event status and clears nonCooking before save/slot publication.
- **Failure / cancellation / recovery behavior:** Unavailable recipe throws KeyNotFound → 404; post-save publication failure can reject response. No invented per-member event log.
- **Configuration and time assumptions:** Browser local date and server clock UTC timestamp are distinct. No selected planner week/date is passed by cooking.
- **Ordered trace:** todayStore → generated DateOnly builder/ValidationDto serialization → ScheduleController.ValidateDay → ScheduleService.ValidateDayAsync → Recipe/CalendarEvent EF save → fill-gap invalidation or slot publication → data.mealMarkedCooked → local Today guard.
- **Relevant source files and symbols:** pwa/src/store/todayStore.ts; pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts; specs/openapi.yaml (ValidationDto/validate); api/src/RecipeApi/Controllers/ScheduleController.cs; api/src/RecipeApi/Services/ScheduleService.cs; api/src/RecipeApi/Models/Recipe.cs; api/src/RecipeApi/Data/RecipeDbContext.cs.
- **Relevant test assertions and substitutions:** todayStore tests assert lunch payload/unmodified supper, confirmed matching update, stale false no update, absent supper and rejection; client post mocked. RecipeCookingIntegrationTests theory seeds lunch/supper and event, asserts only cooked recipe timestamp, matching/unchanged calendar status, neverCooked=1 and explore order; missing test asserts 404 only (does not seed an existing supper).
- **API/implementation/test/documentation agreement or mismatch:** Contract explicitly permits recipe-specific history without assignment; generated envelope maps mealMarkedCooked. Accepted meal-planning owns server matching, library summary/rotation owns timestamp consumption.
- **Evidence class and confidence:** Implementation-supported / high.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** Missing-test title is not proof of existing-event preservation; no transaction/exactly-once or local week refresh U-05/U-06/U-09.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Slice 4 Today guard/separate success; accepted shared-owner references.

### BSL-cooking-012 — Assertion/substitution and reconciliation limits

- **Behavior and actor:** Assertion/substitution and reconciliation limits; ordinary household member (test-boundary entry covers the reviewer).
- **Entry state / trigger / observable outcome:** Documentation discovery inspects executable source and test assertions, not a running application.
- **Business rule and eligibility:** No application/test/contract/configuration edits or runtime qualification. Each normative scenario maps below to a trace entry; check outcome and confidence remain separate.
- **Failure / cancellation / recovery behavior:** In-memory tests cannot establish relational transaction/storage behavior; mock UI cannot prove actual client/server integration or device rendering.
- **Configuration and time assumptions:** Branch/commit/digests below; A34 intentionally not-run.
- **Ordered trace:** CooksMode unit substitutions and pure parser assertions; todayStore mocked generated POST; RecipeCookingIntegrationTests → TestWebApplicationFactory.CreateAsync → in-memory EF/storage + mocked orchestration + auth disabled.
- **Relevant source files and symbols:** pwa/src/components/planner/CooksMode.test.tsx; pwa/src/lib/cooking/stepParser.test.ts; pwa/src/lib/cooking/instructionPresentation.test.ts; pwa/src/store/todayStore.test.ts; api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs; api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs.
- **Relevant test assertions and substitutions:** Inspected values/payloads/state changes enumerated above. Factory defaults use InMemoryRecipeStore and UseInMemoryDatabase; no Tests:PostgresConnectionString supplied by these cooking tests.
- **API/implementation/test/documentation agreement or mismatch:** No claimed live contract parity, authorization or PostgreSQL qualification; current docs/contract/source agree only on the bounded assertions extracted.
- **Evidence class and confidence:** Implementation-supported / medium.
- **Check command / outcome / environment / content identity:** Behavior checks not-run under A34; static discovery at recorded branch/commit/digests. No running services/database/device. Documentation outcomes in session record.
- **Open question or explicit limitation:** A34 and U-cooking-09 retained.
- **Disposition:** Accepted/promoted supported subset under C06; excluded assertions remain in the uncertainty register.
- **Requirement/scenario mapping:** Applies to every drafted scenario as an evidence limitation.

## Requirement and scenario evidence mapping

Every scenario listed in a row inherits all evidence and limitations of that row.
There are no normative assertions outside the mapped requirement/scenario blocks.

| Slice / requirement | All scenarios | Evidence |
| --- | --- | --- |
| entry-preparation: Enter cooking with the displayed recipe identity | Open from detail; Open from Home | BSL-cooking-001, BSL-cooking-012 |
| entry-preparation: Load recipe content for the cooking view | Detail request pending; Recipe detail available | BSL-cooking-002, BSL-cooking-012 |
| entry-preparation: Prepare ingredients before starting an unbookmarked recipe | Toggle an ingredient; Start without all checks | BSL-cooking-002, BSL-cooking-012 |
| entry-preparation: Retain preparation checks within the mounted cooking view | Return during the same view; Open a new view | BSL-cooking-002, BSL-cooking-012 |
| entry-preparation: Open recipe detail from the cooking hero | Inspect the viewed recipe; Dismiss detail; Find similar from nested detail | BSL-cooking-003, BSL-cooking-012 |
| entry-preparation: Close cooking without submitting a new completion | Leave before completion | BSL-cooking-003, BSL-cooking-012 |
| instruction-reading: Read supported legacy and flat structured instructions | Legacy strings; Flat objects; Name supplies instruction | BSL-cooking-004, BSL-cooking-012 |
| instruction-reading: Read supported section instructions in source order | Named sections; Generic preparation | BSL-cooking-004, BSL-cooking-012 |
| instruction-reading: Navigate one focused instruction at a time | Read focused steps; Back to preparation; Scroll focused content | BSL-cooking-005, BSL-cooking-012 |
| instruction-reading: Read all instructions under the effective single-page flag | Read the full recipe; Avoid redundant headings | BSL-cooking-005, BSL-cooking-012 |
| instruction-reading: Preserve instruction text when presenting paragraphs | Measurements remain together; Explicit paragraphs | BSL-cooking-005, BSL-cooking-012 |
| instruction-reading: Hold recipe reading position within client memory | Reopen the same recipe; Scroll during editing | BSL-cooking-006, BSL-cooking-012 |
| instruction-reading: Return to ingredients and resume single-page reading | Consult ingredients mid-recipe; Resume the list; Editor is active | BSL-cooking-006, BSL-cooking-012 |
| instruction-reading: Expose cooking reading and control semantics | Reading position is exposed; Find step controls | BSL-cooking-007, BSL-cooking-012 |
| edit-report-handoffs: Edit a supported cooking instruction explicitly | Edit a legacy instruction; Edit a section child; Edit section content | BSL-cooking-008, BSL-cooking-012 |
| edit-report-handoffs: Apply a successful step edit locally | Save a changed step; Save unchanged text | BSL-cooking-008, BSL-cooking-012 |
| edit-report-handoffs: Cancel an unsubmitted cooking edit | Cancel a draft; Return focus to row | BSL-cooking-008, BSL-cooking-012 |
| edit-report-handoffs: Retain single-page edit failure and retry controls | Save pending; Save rejects | BSL-cooking-008, BSL-cooking-012 |
| edit-report-handoffs: Hand cooking content issues to the quality form | Report ingredients; Report steps; Reporting unavailable | BSL-cooking-009, BSL-cooking-012 |
| edit-report-handoffs: Return from quality reporting to the mounted cooking context | Dismiss a report draft; Report or resolve succeeds; Launch fails after report save | BSL-cooking-009, BSL-cooking-012 |
| edit-report-handoffs: Acknowledge cooking report background launch locally | Background launch acknowledged | BSL-cooking-009, BSL-cooking-012 |
| completion-recovery: Submit completion for the viewed recipe and current local date | Cook another recipe; Finish from either reading mode | BSL-cooking-010, BSL-cooking-012 |
| completion-recovery: Wait for cooking completion before success feedback | Request pending; Repeated activation during request; Completion resolves | BSL-cooking-010, BSL-cooking-012 |
| completion-recovery: Keep failed cooking completion open for retry | Completion rejects; Retry completion | BSL-cooking-010, BSL-cooking-012 |
| completion-recovery: Confirm local supper completion only for a matching confirmed result | Matching supper confirmed; Different or unconfirmed supper | BSL-cooking-011, BSL-cooking-012 |
| completion-recovery: Keep cooking feedback separate from calendar matching | Unscheduled recipe recorded; Recipe unavailable | BSL-cooking-011, BSL-cooking-012 |

## Historical draft-generation session identity, preservation and verification record

- **Session/date:** 2026-10-16; ordinary-household cooking draft sequence C01.
- **Branch/commit:** `moving-to-openspec` / `04a1c4570f9bbb01b47436790d4248635ac3179a`.
- **Relevant dirty inputs:** cooking plan and named cooking source/tests/contracts
  were clean at entry. Many baseline plans, existing deltas and main owner specs
  were already staged/unstaged/untracked, including identity, library, meal
  planning and live-updates main specs, and the untracked quality cooking-feedback
  proposal. They were read as current working content, not attributed to this
  task or represented as clean commit evidence. Existing deleted navigation spec
  and all other unrelated work remain outside ownership. Before-images include
  staged/unstaged binary diffs, status and recursive untracked file digests in the
  session’s private `/tmp/wfs-cooking-baseline` directory.
- **CLI/root:** installed spec-driven schema resolved by context/list to
  `/Users/alex/Code/whats-for-supper`; no store selection or initialization.
  Existing changes/main inventory inspected; no duplicate cooking change found.
  All new change metadata scaffolded by CLI. Proposal/spec/design/tasks
  instructions obtained; proposal → specs → tasks written with dependency reads.
- **Completed evidence:** BSL-cooking-001–012; all ten fields, full scope coverage,
  shared ownership and every normative requirement/scenario mapped above.
- **Human decisions:** C01–C05; no acceptance or promotion. Excluded claims remain
  in U-cooking-01–09; no question blocks the independent drafted subset.
- **Passed:** four selected `openspec validate <change> --strict --no-interactive`
  calls; `openspec validate --all --strict --no-interactive`: 69 passed, 0 failed.
  Final preservation and bounded harness outcomes are recorded below.
- **Concurrent input reconciliation:** final comparison detected external edits
  to the baseline index and existing quality cooking-feedback proposal. Neither
  was reverted; the quality proposal now explicitly assigns cooking entry/local
  return/acknowledgement to this sequence and only drafts shared reason/note
  initialization. It remains outside this task’s acceptance. Its updated content
  digest below supersedes the entry snapshot. The index’s unrelated content is
  preserved around the single Cooking-row edit.
- **Failed:** first `task verify` invocation (all 18 owned documentation paths)
  passed documentation checks but failed `content` because repository-wide identity
  mutated during concurrent work; `spec:check` was not-run in that attempt. Cooking
  artifacts, evidence digests and index overlap still matched the reviewed content.
- **Blocked:** none in source discovery or selected/all OpenSpec validation.
- **Final repository checks:** rerun `task verify` with the exact 18-file selection
  (this plan, the baseline index, and four metadata/proposal/delta/tasks sets).
  The authoritative result for its tested identity is
  [.task/agent-finish/last-run.json](../../.task/agent-finish/last-run.json).
  Shared last-run records can be overwritten by another concurrent task; confirm
  `changed_paths` includes all four `baseline-cooking-*` sets before attributing it.
  Final outcomes are also reported directly at handoff; a later rerun does not
  erase the failed first attempt.
- **Scope review:** 26 unique requirements / 58 mapped scenarios; all source links
  and shared-owner names resolved. Read-only source digests and staged patch are
  unchanged; original dirty file bytes are preserved except the explicitly
  reconciled concurrent quality proposal and the exact Cooking-row index update.
  No task-owned application, test, contract, generated-client, SQL, configuration,
  dependency or workflow-instruction edits.
- **Not-run:** runtime, live API/client parity, browser/device/screen reader,
  PostgreSQL/filesystem and deployment qualification, intentionally deferred A34.
- **Not-applicable:** behavior red/green cycle, code generation, lint/type/build,
  application tests for documentation-only edits; acceptance/promotion/archive
  are outside authorization, not performed checks.
- **Index:** only the Cooking summary row changed to four drafts 26/58, human
  review pending. The index already had staged/unstaged and concurrent unrelated
  edits; an immediate before-image and exact single-row comparison preserve them.
- **Exact next action:** Human review the four linked deltas in order and their
  evidence/exclusions. Record requested documentation revisions or explicit
  acceptance separately. No automatic sync, archive, implementation or A34 work.

### Read-only evidence content identity — SHA-256

These hashes identify current evidence, including dirty shared-owner documents;
no behavioral execution is implied. Recheck affected claims if these inputs change.

| Repository-relative input | SHA-256 |
| --- | --- |
| [pwa/src/components/planner/CooksMode.tsx](../../pwa/src/components/planner/CooksMode.tsx) | `daddc803a112db04791b202e546021e86d3985acf11dbdc3e4e15e60c211d91a` |
| [pwa/src/components/planner/CooksMode.test.tsx](../../pwa/src/components/planner/CooksMode.test.tsx) | `2509bef1abf8a7c5a45d96820269b7debd6112a3f52fee3e0f14b2d9b3c2c026` |
| [pwa/src/lib/cooking/stepParser.ts](../../pwa/src/lib/cooking/stepParser.ts) | `769d04ca7a0ae894de6a8185b952853682abf80a1b8c65b08871a64070ecbdb6` |
| [pwa/src/lib/cooking/stepParser.test.ts](../../pwa/src/lib/cooking/stepParser.test.ts) | `13974978771d3c85d497aa1e8cb28646c799f70d6fa0fd60274c2780a391ab19` |
| [pwa/src/lib/cooking/instructionPresentation.ts](../../pwa/src/lib/cooking/instructionPresentation.ts) | `4a7e1abaf60bf7d8a7b2cff4d612465d375f2fd343a5d61a9597797c899c635e` |
| [pwa/src/lib/cooking/instructionPresentation.test.ts](../../pwa/src/lib/cooking/instructionPresentation.test.ts) | `93745fc9ee0b66e6bb57986e9679eab53c8ba4ee6fef70d082bf0dfb5ef00581` |
| [pwa/src/store/plannerStore.ts](../../pwa/src/store/plannerStore.ts) | `0058c7adf697f243c08ef18b89492ecdd3622fde24688930c1ebca0dce178f31` |
| [pwa/src/store/todayStore.ts](../../pwa/src/store/todayStore.ts) | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| [pwa/src/store/todayStore.test.ts](../../pwa/src/store/todayStore.test.ts) | `a049df21755c4270f588d9b40989669bbdcaf2bb48a7dff3c40b2d63379555ae` |
| [pwa/src/components/home/HomeCommandCenter.tsx](../../pwa/src/components/home/HomeCommandCenter.tsx) | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| [pwa/src/components/recipes/RecipeDetailSheet.tsx](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| [pwa/src/components/recipes/RecipeImportIssueSheet.tsx](../../pwa/src/components/recipes/RecipeImportIssueSheet.tsx) | `e7c8376cf97f3f9c642fc874a892d461aac9da72e2abc82f70ad09c56a4c9ae3` |
| [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| [pwa/src/lib/api/api-client.ts](../../pwa/src/lib/api/api-client.ts) | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| [pwa/src/lib/api/generated/api/recipes/item/index.ts](../../pwa/src/lib/api/generated/api/recipes/item/index.ts) | `687fbde658edd62de7455ec634b1d36e8c8b67ee508c689b2ae9de9f8ff4ba2d` |
| [pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts](../../pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts) | `00af096baa1fe530bed2f5a50a412bb2315d600081944dd7b6760e959acb311e` |
| [pwa/src/lib/api/generated/api/recipes/item/importReport/index.ts](../../pwa/src/lib/api/generated/api/recipes/item/importReport/index.ts) | `da2d1d8454fa6a1e64e9d82b7e5a8ae965f0d02272d5b48941aabbef60c86930` |
| [pwa/src/lib/api/generated/models/index.ts](../../pwa/src/lib/api/generated/models/index.ts) | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| [pwa/src/store/featureFlagStore.ts](../../pwa/src/store/featureFlagStore.ts) | `55d05273679b5be4b77458a437e69e8011eadf652aad2df6a4e703125f8780b2` |
| [pwa/src/locales/index.ts](../../pwa/src/locales/index.ts) | `898e7367a9d83aec4e5673b5cc541fe7e6ea29211d7a2b14ed23e9b4a5a2c5ae` |
| [pwa/src/lib/imageUtils.ts](../../pwa/src/lib/imageUtils.ts) | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| [specs/openapi.yaml](../../specs/openapi.yaml) | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| [api/src/RecipeApi/Services/RecipeService.cs](../../api/src/RecipeApi/Services/RecipeService.cs) | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| [api/src/RecipeApi/Services/ImageService.cs](../../api/src/RecipeApi/Services/ImageService.cs) | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| [api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs](../../api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs) | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| [api/src/RecipeApi/Controllers/ScheduleController.cs](../../api/src/RecipeApi/Controllers/ScheduleController.cs) | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| [api/src/RecipeApi/Services/ScheduleService.cs](../../api/src/RecipeApi/Services/ScheduleService.cs) | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| [api/src/RecipeApi/Services/FeatureFlagService.cs](../../api/src/RecipeApi/Services/FeatureFlagService.cs) | `53af415c59cea86b2dc34e5f665e2fc75d8f6d9645c21e62198016bb2098a534` |
| [api/src/RecipeApi/Models/Recipe.cs](../../api/src/RecipeApi/Models/Recipe.cs) | `810b9ddb9bdcacdb894d713680952f5a32c89256070366dff99b3c16f82bbe82` |
| [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| [api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs) | `aa0e6600531310559d1804fb9c72ca28e8143b04598e4d36d15f9964bdd49b4a` |
| [api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| [openspec/specs/household-identity/spec.md](../../openspec/specs/household-identity/spec.md) | `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749` |
| [openspec/specs/recipe-library/spec.md](../../openspec/specs/recipe-library/spec.md) | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |
| [openspec/specs/meal-planning/spec.md](../../openspec/specs/meal-planning/spec.md) | `96467d593b80c53d6582502c1f798caa741a22ca13e374265a03f8a0360df9f6` |
| [openspec/specs/recipe-quality/spec.md](../../openspec/specs/recipe-quality/spec.md) | `8e564c9f00e9ee157cfff812c90d8d23c343d0a99a529143c9512c2d751f61c9` |
| [openspec/specs/household-live-updates/spec.md](../../openspec/specs/household-live-updates/spec.md) | `1c1c906831ca1770e2afd8174bdd31f5447b67d48b0325fc52e353c12ce28de6` |
| [openspec/changes/baseline-recipe-quality-cooking-feedback/proposal.md](../../openspec/changes/archive/2026-10-16-baseline-recipe-quality-cooking-feedback/proposal.md) | `f7303c5fbd7073cf9b860bafac3aae0870dad119c22d58be58bbf8ebae037b16` |
| [api/src/RecipeApi/Services/RecipeImportReportService.cs](../../api/src/RecipeApi/Services/RecipeImportReportService.cs) | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |

## Promotion session — 2026-10-16

- **Authority:** C06, user “promote” following the four validated drafts. Accepted
  scope is exactly their supported requirements/scenarios, not the uncertainties.
- **Identity:** branch `moving-to-openspec`, commit
  `04a1c4570f9bbb01b47436790d4248635ac3179a`; dirty work at entry includes the
  cooking plan/index, all four untracked cooking change directories and unrelated
  staged/unstaged/untracked/deleted documents. A fresh recursive file-digest and
  staged-diff snapshot is held privately in `/tmp/wfs-cooking-promotion`.
- **Evidence reconciliation:** every recorded source/test/contract/shared-owner
  digest matched the generation snapshot before sync; no application evidence
  drift. BSL-cooking-001–012 and the existing all-scenario mapping are retained.
- **Selected operations:** installed OpenSpec sync workflow, repo-local resolved
  root; current status and specs instructions obtained for each selected change.
  Only their reported `specs.existingOutputPaths` were consumed. New main cooking
  Purpose matches the first delta verbatim; subsequent matching Purpose bodies
  are not duplicated. ADDED blocks are reconciled in entry/preparation → reading
  → handoffs → completion order with 26 unique requirement names and 58 scenarios.
  Main format has one Purpose and Requirements section, no delta operation headers.
- **Artifacts:** [main cooking](../../openspec/specs/cooking/spec.md) promoted;
  all four deltas/proposals/tasks/metadata retained byte-for-byte and unarchived.
  Only the baseline index’s Cooking summary row changes alongside this plan.
- **Passed:** `openspec validate cooking --type spec --strict --no-interactive`;
  `openspec validate --specs --strict --no-interactive`: 10 passed, 0 failed.
- **Failed:** `openspec validate --all --strict --no-interactive`: 70 passed,
  1 failed in the concurrently created, unrelated
  `baseline-grocery-shopping-scheduled-needs`. No cooking validation failure and
  no authorization to repair that other change. This global result is not a clean
  repository reconciliation result.
- **Concurrent work:** recipe-quality plan and three quality extraction task
  records and the index’s Recipe quality row changed externally during promotion.
  Its main spec then received seven requirements. Reconciliation inspected the
  additions, including “Merge contextual issue reasons with loaded saved feedback”:
  quality explicitly retains form initialization and leaves cooking entry, return
  and acknowledgement here. No competing cooking assertions were introduced.
  The quality-main digest above is refreshed to this reconciled revision. These
  external edits were preserved; application source/test/contract evidence did
  not drift.
- **First promotion harness attempt:** documentation passed, content identity
  failed on repository-wide concurrent mutation, `spec:check` not-run. This was
  a new promotion attempt, distinct from the historical generation failure.
  A final rerun follows the updated record; retain both outcomes honestly.
- **Verification:** selected/main/all OpenSpec validation and final bounded
  `task verify -- docs/openspec-baseline/cooking.md docs/openspec-baseline-plan.md openspec/specs/cooking/spec.md`
  are the promotion checks. The final tested identity and exact results live in
  [.task/agent-finish/last-run.json](../../.task/agent-finish/last-run.json); confirm
  its selected paths before attributing a shared record. Final results are also
  reported directly at handoff. The prior generation session’s failed first
  verification remains historical evidence, not a failure of this promotion.
- **Not-run:** A34 runtime/API/database/browser/device qualification, intentionally
  deferred. **Not-applicable:** behavior TDD, application tests/build/client
  generation for this documentation-only sync. No code, contract or test changed.
- **Next action:** No further cooking specification extraction or lifecycle action
  is selected. Retain the recorded exclusions; await a separately authorized
  revision, archival or runtime-qualification task. Do not infer implementation.
