# Adversarial acceptance corpus

Planning fixtures, not executed tests. Every row asserts exact original persistence, returned content/context revision, eligible ingredient/step display, demand counted once, row checks and absence of unrelated writes where applicable. Use synthetic EN/FR recipes, fixed deployment clock and isolated nonproduction PostgreSQL/files. Providers are doubles only at their external boundary. Rows with unresolved policy identify a hold rather than an assumed expected implementation.

| ID / owner | Starting state and action | Required result / adversarial oracle |
| --- | --- | --- |
| C01 facts/steps | Basis 4, pasta 200 g, whole-use step; target 6 | 300 g checklist and step, original remains 200; one demand |
| C02 steps | Total oil 2 tbsp; exhaustive uses 1+1; target doubled | 4 tbsp demand and two 2 tbsp uses, never 8 |
| C03 steps | Total 200 g; absolute use 50 g; target factor 1.5 | Use 75 g, not entire 300 g |
| C04 steps | Explicit half of total; change target | Wording remains half; numeric annotation if present equals half projected total |
| C05 steps | Remaining oil after known same-unit sequence | Correct remainder; unknown/incompatible/alternative or cyclic sequence cannot invent a number |
| C06 steps | 1/2 tsp on each 4 pieces; 20 min, 180 °C, 20 cm pan | At double portions count 8, dose 1/2 tsp; time/temp/pan unchanged |
| C07 facts | Two 400 g cans; double then halve | Count scales, capacity fixed; fractional package demand is not rounded purchase quantity |
| C08 facts | 1/3 cup basis 3; repeated preview 5→3 | Exactly 1/3 restored, no persisted or displayed drift from chained rounding |
| C09 facts/identity | 2–3 + 1–2 compatible range contributions | Exact 3–5; unknown extra contribution makes subtotal incomplete without replacing interval by midpoint |
| C10 facts | Zero, null amount, unit-only, amount-only, Fresh basil leaves | Save/reopen independently; no fabricated zero/unit, phrase whitelist or automatic report |
| C11 facts | Known 200 g with unknown basis | Retain original 200 g; no fake factor/default family basis |
| C12 steps | One valid, one stale binding | Valid scales, stale wording remains; one contextual notice, no cooking/completion block |
| C13 facts/steps | Duplicate same-text rows and repeated step phrase; missing middle supply | IDs/occurrence spans prevent quantity shifts or arbitrary replacement |
| C14 facts | Add/remove/reorder one row, clear null/empty | Unrelated IDs/facts/sections survive; cleared values never revive from metadata |
| C15 facts/steps | Concurrent ingredient and instruction saves from one revision | One commits, other atomically 409; unrelated included fields do not partially save; drafts retained |
| C16 facts | Delayed source extraction after human amount/name clear | Content/source guards and protection reject overwrite; report state not automatically resolved |
| C17 steps | Active Cook old revision; remote content/serving change | Explicit coherent refresh only; checks/bookmark/offset/draft survive; late old response ignored |
| C18 steps | Report response includes new semantic recipe content | Report metadata may apply; ingredients/steps refresh together explicitly, no mixed revisions |
| C19 steps | Prepared for 6, recipe corrected, default changes | Current recipe at recorded 6; same receipt/date/history; no historical recipe snapshot or new completion |
| C20 preservation | Inherited 5/usual 4, deliberate 4, six→Reset four, later usual six | Existing cooked-baseline/override protections remain, including current-day Cooked without receipt |
| C21 preservation | Past, prepared, future Cooked and non-cooking dates | Existing portions edit/completion/movement eligibility and frozen counts remain |
| C22 identity | Diced/sliced onion + approved French equivalents | Same food only when validated; source text retained and groceries deterministic without provider |
| C23 identity | Fresh/canned tomato, salted/unsalted, poivron/piment, coriander leaf/seed | Distinct purchase meanings cannot merge on shared roots, accent stripping or AI confidence |
| C24 identity | Null/ambiguous dictionary mapping, missing translation | Source shopping label and conservative fallback remain; no speculative bilingual equivalence |
| C25 identity | Human aisle/name correction then retry/locale/catalogue update/recovery | Protected correction survives; private alias never auto-publishes globally |
| C26 groceries | Three water unit rows + water extra; check/uncheck one | Four independent controls; only selected ID changes; intentionally aggregated compatible demand has one check |
| C27 groceries | Checked 500 g→0.5 kg proven continuing row | Same identity/check; exact conversion before comparison, no rounded false increase |
| C28 groceries | Checked known increase 400→600; then check and recompute | Reset once for that row; later check survives unchanged retry and no repeated explanation |
| C29 groceries | Unknown→known, incompatible units or incomplete contribution | Proven continuing check preserved; no prior-unknown marker, acknowledgement or replacement clutter |
| C30 groceries HOLD | 2–3→4–5 versus 2–3→3–4 | Proposed disjoint-range proof resets first only; settle comparison contract before dependent code |
| C31 groceries HOLD | Semantic split/merge vs pure EN→FR rename | Proposed structural new IDs unchecked; rename preserves ID/check; no inference of purchase intent |
| C32 groceries | Concurrent different-row checks, same-row intents, bulk replacement, recompute | Fresh state preserves unrelated commits; stale versions conflict, identical mutation ID deduplicates, late responses cannot restore old checks |
| C33 groceries | Extra pointer/touch check sorts row or removes future projection | Viewport retained; no Edit/category focus/open; disappearing keyboard target has stable local fallback |
| C34 groceries | EN/FR check with Enter/Space; category tag compare | Exactly one action; stable focus, regular/extra icon/interaction parity; normal food/key vs selected occurrence mutation scopes remain distinct |
| C35 groceries | Prior-unknown flags in loaded/current/restored row | Retired warning and locale equivalents absent in every state; only known subtotal once, no replacement reserved space |
| C36 facts/upgrade | Old apparently name-only full editor sends ingredients/instructions | Atomic upgrade conflict; every draft field survives supported tab refresh; no unauthorized partial mutation |
| C37 migration | In-place conversion stops before/after recipe commit | Prior content usable or exact converted content; retry idempotent with same IDs, resume manifest truthful |
| C38 migration HOLD | One old checked name maps to several rows at idle-shopping upgrade | Inventory actual set; no invented individual historical intent; approved transition once only; extras/history preserved |
| C39 migration | Conditional disk fallback has stale live/disk, absent IDs, database-only recipes | No disk-wins by timestamp, delete-all, soft-delete resurrection or purge; precedence gate blocks divergent content |
| C40 recovery | Current full-fidelity backup → isolated restore → re-export | Exact fractions/ranges/notation, units, steps/spans, revisions, food/row IDs, null/empty/protection, prepared counts, household links and media bytes equivalent |
| C41 recovery | Old backup or missing required current artifact | Clear unsupported/invalid preflight, zero file/DB/household writes; no implicit forward converter |
| C42 recovery | Stale current-format merge; identical token/different content; explicit exact restore | Merge defers divergence, token mismatch invalid, exact restore replaces only after complete preflight and explicit selection |
| C43 repair | Eligible content report + note, matching active/terminal retries, blank note, Duplicate | Existing eligibility/launch/dedup/report state retained; no new candidate workflow or automatic report clearing |
| C44 repair | Repair file published before concurrent protected edit would be detected | Stage first; conflict before live file/DB publication; provider failure/cancel leaves usable prior content and report retry guidance |
| C45 steps HOLD | Total changes 200→250 with absolute 50 g use | Decision required: recommendation retains absolute 50, fractions and proven whole links; contradictions quiet and dependent remainders invalid |
| C46 steps | UTF-16 emoji/combining accents, reordered text, overlapping spans | Validate exact revision/text/surrogate boundaries; no arbitrary replacement, no HTML evaluation |
| C47 units | Unknown cup standard or count clove vs generic piece | No silent 240/15/5 ml or generic count merge; only evidenced supported definitions convert |
| C48 recovery | Crash between media staging, DB commit, activation and fresh backup | Complete committed or prior generation recovered before household use; no success from queued work; pre-cutover rollback pair verified |
| C49 UI | All supported content in EN/FR 320 px, 200%, tablet split view | Quiet preview/Original/Reset, hero/sidebar, controls, drafts, reading offset and touch targets retain approved composition |
| C50 CI | New live scenario, empty test filter, opt-in DB skip, first failure then retry | Inventory assignment does not count as execution; required real DB/live cases have zero skips; outcomes and never-run stages separately reported |

## Existing regression owners and future seam classes

Reuse `RecipeDetailSheet.refinement.test.tsx`, `RecipeDetailSheet.test.tsx`, `ActionGearMenu.test.tsx`, `CooksMode.test.tsx`, `CooksMode.sse.test.tsx`, `GroceryList.test.tsx`, `GroceryList.refinement.test.tsx`, `useSupperServingsEditor.test.tsx`, `useSupperServingsEditor.refinement.test.tsx` and `pwa/src/testing/mock-api.test.ts`.

Browser owners: `recipe-ingredient-preview.spec.ts`, `quiet-portions-layout.spec.ts`, `supper-servings.spec.ts`, `supper-servings-context.spec.ts`, `supper-servings-movement.spec.ts`, `prepared-supper.spec.ts`, `cook-mode-steps.spec.ts`, `cooking-instruction-recovery.spec.ts`, `grocery.spec.ts`, `grocery-recipe-sources.spec.ts`, `recipe-import-reporting.spec.ts`, `online-recovery.spec.ts`. Home coverage must include its actual current assigned-ingredient/Cook journey, not only recipe detail.

API/PostgreSQL owners: `IngredientNormalizerTests`, `IngredientCategoryServiceTests`, `GroceryRecomputeServiceTests`, `GroceryCheckConcurrencyPostgresTests`, `GroceryExtraRecoveryPostgresTests`, `SupperServingsPostgresTests` (including `SupperServings_CurrentCookedInherited`), `SupperIngredientPreviewPostgresTests`, `PreparedSupperPostgresTests`, `RecipeImportReportPostgresTests`, `RecipeImportReportPersistencePostgresTests`, `OnlineRecoveryPostgresTests`. New canonical, allocation, bilingual and conversion/recovery test classes named in tasks are proposed tests to create, never existing evidence.

Useful properties alongside examples: exact basis round-trip without arithmetic overflow, projection independent of preview history, grocery demand independent of binding count, provider-free deterministic recompute under input permutation, idempotent migration/publication and unrelated-row check preservation. Generated cases supplement actual API/PostgreSQL/file/browser acceptance, not replace them. No archived test waiver is carried to these new seams.
