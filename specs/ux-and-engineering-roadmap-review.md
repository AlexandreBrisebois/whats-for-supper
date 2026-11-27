# UX, Product & Engineering Roadmap Review

**Grounded in:** [What's for Supper North Star](../docs/design/creative-direction-north-star.md), [Mission](../.agents/core/mission.md), [Designer Identity](../docs/design/agent-designer-identity.md), and direct inspection of the current codebase (`api/`, `pwa/`, `specs/`, `scripts/`, `release-template/`).

> **Scope note:** This document captures a multi-perspective review and prioritized proposals for future consideration. It does not authorize implementation or alter approved capability specifications.

---

## 1. The Review Panel & Debate

### Panelists

- **UX Researcher** — Focused on task completion, cognitive load, first-run comprehension, interruption recovery, and real household observation.
- **Mère-Designer (Everyday Household Lens)** — Evaluates one-handed use, divided attention, warm Shared Table clarity, and "don't make me think" recognition over recall.
- **Developer** — Focused on domain boundaries, type safety, build/runtime reliability, state synchronization, and maintainability.
- **Tester** — Focused on contract drift, testability, determinism, E2E speed/flakiness, and installation verification.
- **Mom** — Carries the mental load of weekday dinners; wants supper settled quickly without becoming the family's permanent project manager.
- **Son** — Wants fast, fun visual choices, dislikes long forms, and occasionally helps prep or pick Friday night food.
- **Daughter** — Likes contributing on her own terms (passing the phone or tapping favorites), cares about dietary/taste fit, and gets annoyed by nagging.
- **Grandparents (Low-Tech)** — Comfortable with paper recipe cards and clear buttons; easily thrown off by tiny text, hidden gear menus, hex passphrases, or unclear icon-only controls.
- **Brand-New User (No Alex to Ask)** — First time opening a fresh self-hosted install or the demo; has no developer context for `HEARTH_SECRET`, Docker UIDs, empty states, or what "GOTO" vs "Discovery" vs "Planner" means.

---

### Where the Panel Argued — and Converged

1. **First-Run Onboarding & Empty States (Brand-New User + Grandparents vs. Developer + Mère-Designer)**
   - **Brand-New User:** _"After entering a 64-character hex passphrase on `/welcome`, I land on `/onboarding` (`FamilySelector.tsx`) seeing a message that there are no members, yet the 'Add member' form is collapsed behind a secondary button (`showAddForm` defaults to `false`). Once I add myself and reach Home, `TonightPivotCard` says 'Nothing planned for tonight', Discovery is empty, and nobody tells me what to do first."_
   - **Grandparents:** _"And when you ask me for a 'Family passphrase' or put settings behind a tiny gear icon in the top corner of Profile, I'm scared I'll break something."_
   - **Developer:** _"We shouldn't add wizard bloat or fake persistent data to a user's real database."_
   - **Convergence:** Auto-expand member creation when `familyMembers.length === 0`, offer an explicit optional starter trio / guided first recipe capture on empty Home, and replace jargon ("GOTO", hex secrets) with plain language and gentle defaults.

2. **Delight vs. Screen Time (Son + Daughter vs. UX Researcher + Mom)**
   - **Son:** _"Swiping is fun, and I'd love streaks, points, or badges when I vote or help cook!"_
   - **UX Researcher & Mom:** _"The North Star is explicit: success is not more time spent in the app, and no guilt or invented engagement tasks. Kids should feel ownership without turning supper into a chore scoreboard."_
   - **Convergence:** Channel playfulness into low-friction moments that reduce friction—like a gentle **Family Tie-Breaker**, visual **Kid Helper Tasks** inside Cook's Mode, and **tap-to-voice recipe capture** for family stories—never streak counters or nagging reminders.

3. **Real-Life Kitchen Friction (Mom + Grandparents + Mère-Designer)**
   - **Mom:** _"When plans blow up at 5:30 PM, I don't want to browse 120 recipes—I have half a bag of spinach and leftover chicken and 20 minutes. Also, I keep unchecking salt and olive oil on the grocery list every week."_
   - **Grandparents:** _"The step text in Cook's Mode gets small when I set the tablet across the counter, and I wish it could read the step aloud."_
   - **Convergence:** Prioritize kitchen-floor ergonomics (read-aloud / large print mode, leftover/fridge rescue search, and remembered pantry staples) over extra planning controls.

4. **Contract Authoring & Runtime Configuration Boundaries (Developer + Tester)**
   - **Developer:** _"`specs/openapi.yaml` has grown into a 5,593-line single-file contract that exceeds single-read limits and makes reviewing contract edits noisy, while `NEXT_PUBLIC_AISLE_ORDER` is still baked into the PWA image at build time instead of living in runtime household settings."_
   - **Tester:** _"Contract edits are where merge conflicts and build-arg drift still bite self-hosters and agents; pre-built Docker Hub images cannot customize store aisle order via `.env`."_
   - **Convergence:** Shard `specs/openapi.yaml` authoring into domain partials bundled deterministically during client generation, and move `AISLE_ORDER` into `family_settings` exposed via `/api/settings` once contract edits are authorized.

---

## 2. Nine Delightful Features That Advance the Mission & North Star

> Rating scale: **Impact** `High` (moves core emotional anchors: relief, togetherness, belonging, anticipation) · `Medium-High` · `Medium`.

### 1. Blank-Kitchen Rescue: Zero-Jargon First-Run & Optional Starter Trio

- **What it is:** When a fresh household opens `/onboarding` with `0` members, automatically display the "Add your name" input (no extra button click). Allow renaming the auto-generated 64-char hex `HEARTH_SECRET` to a memorable household phrase from Settings (or guided first-run prompt), and when Home/Recipes is empty, offer a one-tap **"Add 3 starter family classics (or scan your first recipe)"** card with clear plain-language next steps.
- **Impact:** **High** (eliminates the #1 abandonment cliff for self-hosters with no developer to ask).
- **User Benefit:** Brand-new users and low-tech relatives understand what to do within 30 seconds instead of hitting empty cards and cryptic terminology.
- **Agent Benefit:** Makes fresh-install acceptance tests and agent-assisted deployments predictable without manual database seeding hacks.
- **Champions:** Brand-New User, Grandparents, UX Researcher.

### 2. "Use What's In The Fridge" Quick Rescue Filter

- **What it is:** A dedicated, lightweight rescue chip on Home & Recipes (_"Use up 2–3 ingredients"_) where a tired cook types `spinach, feta, eggs` and sees matching household recipes ranked by overlap—highlighting which ingredients they already named vs. what else is needed. Explicitly does **not** introduce pantry inventory tracking.
- **Impact:** **High** (directly delivers _"Make room for real life"_ without implying the app tracks your cupboard).
- **User Benefit:** Saves weeknight suppers when groceries run low or produce is about to spoil, avoiding unnecessary takeout when a 15-minute match is hiding in the collection.
- **Agent Benefit:** Reuses existing `StructuredRecipeContent` ingredients and `RecipeSearchService` lexical/vector scoring without adding new database tables.
- **Champions:** Mom, UX Researcher, Developer.

### 3. Remembered Pantry Staples & In-App Store Aisle Reordering

- **What it is:** Let a household mark everyday staples (`salt`, `pepper`, `olive oil`, `water`) as _"Usually on hand"_ so they stay collapsed or pre-acknowledged at the bottom of `GroceryList` unless tapped, and move store aisle ordering (`AISLE_ORDER`) from a build-time `NEXT_PUBLIC_AISLE_ORDER` Docker env var into `family_settings` with drag-to-reorder in Settings.
- **Impact:** **High**.
- **User Benefit:** Stops the weekly frustration of unchecking salt and water every shopping trip, and matches the actual layout of the family's local grocery store without rebuilding containers.
- **Agent Benefit:** Removes a major source of build-time vs runtime config confusion (`NEXT_PUBLIC_AISLE_ORDER` in Compose/Dockerfiles) and simplifies grocery presentation testing.
- **Champions:** Mom, Mère-Designer, Developer.

### 4. Post-Supper Verdict & Living Family Kitchen Notes

- **What it is:** When someone marks a meal **Cooked** (`CookedSuccessCard` / Home), include a gentle, optional, one-tap prompt: _"How was it?"_ (`Hit!` / `Adjust next time` / `Skip`) plus a 1-line note box that appends a dated household memory (`"Alex (Nov 27): doubled the garlic, kids loved it"`) to the recipe's notes.
- **Impact:** **Medium-High** (builds _"Belonging"_ and turns a static collection into a living family cookbook).
- **User Benefit:** Preserves real cooking wisdom across months and gives family members an easy way to refine recipes without opening an editor.
- **Agent Benefit:** Reuses existing recipe `notes` and `PATCH /api/recipes/{id}` mutation paths with minimal new surface area.
- **Champions:** Daughter, Mom, Grandparents, Mère-Designer.

### 5. Grandparent-Friendly "Calm & Large Print" Profile Mode + Read-Aloud Steps

- **What it is:** Extend `Profile` preferences (alongside `LanguageSelection` and `ContrastSelection`) with a **"Large Print & Simple View"** preference per member that scales step/recipe typography, enlarges primary controls, hides secondary gear/reindexing chrome, and adds a **"Read step aloud"** button (`speechSynthesis`) inside `CooksMode`.
- **Impact:** **Medium-High**.
- **User Benefit:** Makes the app genuinely comfortable for grandparents, visually tired evening cooks, or anyone propping a tablet across the kitchen counter.
- **Agent Benefit:** Implemented cleanly via existing `data-*` root token attributes (mirroring `data-contrast="high"`), keeping accessibility testable in Playwright.
- **Champions:** Grandparents, UX Researcher, Mère-Designer.

### 6. Voice-to-Recipe Dictation ("Grandma's Recipe Story")

- **What it is:** Add a microphone / audio-dictation option inside `MinimalCapture`'s `Describe` tab (using Web Speech / browser audio recording into the existing Gemini extraction workflow) so someone can simply speak a recipe aloud—_"Take 4 potatoes, boil them with a bay leaf..."_—while cooking or sitting with a relative.
- **Impact:** **Medium-High** (unlocks cherished unwritten family recipes that otherwise never get typed).
- **User Benefit:** Grandparents and busy parents can preserve heirloom dishes in 30 seconds by talking instead of typing on a phone keyboard.
- **Agent Benefit:** Feeds directly into the existing `goto-synthesis` / `Describe` extraction pipeline without building a new backend workflow.
- **Champions:** Grandparents, Mom, Daughter.

### 7. Gentle "Why This Matched" Context & Playful Family Tie-Breaker

- **What it is:** On Discovery suggestions in Planner (`SmartDefaults`), show concise attribution (_"Unanimous!"_ or _"Loved by Alex & Maya"_) and, when 2–3 top suggestions tie or nobody wants to pick tonight's winner, offer an optional **"Spin to pick"** tie-breaker wheel that picks one fairly (without locking the week or forcing a choice).
- **Impact:** **Medium**.
- **User Benefit:** Gives kids and parents visible credit for their votes (_"We chose this together"_) and turns mealtime deadlocks into a 3-second smile.
- **Agent Benefit:** Lightweight client presentation over data `SmartDefaultsDto` already computes (`unanimousVote`, `likeCount`).
- **Champions:** Son, Daughter, UX Researcher.

### 8. "Kid Helper" Badges & Prep-Friendly Tags on Recipes

- **What it is:** Allow recipes (during AI extraction or manual edit) to highlight simple _"Kid-friendly prep"_ steps (e.g., _"Wash berries"_, _"Whisk dressing"_) and surface subtle badges like `20 min`, `One-pot`, or `Kid helper` when browsing or in Cook's Mode.
- **Impact:** **Medium**.
- **User Benefit:** Invites younger kids (Son/Daughter) into cooking as real helpers and helps tired parents spot low-mess weeknight options faster.
- **Agent Benefit:** Leverages structured recipe steps and search filter metadata already materialized by `MaterializeRecipeSearchFilters`.
- **Champions:** Son, Daughter, Mom.

### 9. "Cook Once, Eat Twice" Batch & Leftover Linking

- **What it is:** When a household bumps a day's portions in Planner (`SupperServings`, e.g., doubling a chili recipe from `4` to `8`), offer a one-tap **"Save leftovers for another night"** action that schedules a linked _"Leftovers: Chili"_ non-cooking slot later that week—with **zero** extra grocery items added.
- **Impact:** **Medium-High**.
- **User Benefit:** Reflects how real families actually cook and stretch budgets, eliminating double-counted groceries and wasted evenings.
- **Agent Benefit:** Combines existing `NonCookingPlanDto` and `SupperServings` boundaries cleanly without inventing complex batch-inventory math.
- **Champions:** Mom, Developer, Mère-Designer.

---

## 3. Remaining Engineering, Contract & Runtime Configuration Improvements

> Impact ratings: **High** (dramatically cuts token cost, regression rate, or build/test cycle time) · **Medium-High** · **Medium**.
>
> **Scope Status:** Deferred pending explicit authorization to modify `specs/openapi.yaml`, `api/database/schema.sql`, and regenerate contract artifacts.

### 1. Author `specs/openapi.yaml` (5,593 lines / 248 KB) as Domain-Split OpenAPI Partials

- **Observation:** `specs/openapi.yaml` exceeds single-read limits and makes merging/reviewing contract edits noisy.
- **Proposal:** Split authoring into `specs/openapi/paths/*.yaml` and `specs/openapi/schemas/*.yaml`, bundling deterministically into `specs/openapi.yaml` inside `task gen:client` / `task prepare`.
- **Status:** Deferred to a dedicated OpenSpec / contract authoring slice.
- **Impact:** **High**
- **Agent Benefit:** Edit and verify one endpoint's schema in ~80 lines without overflowing context or risking accidental edits elsewhere in a 5,593-line YAML file.
- **User / Maintainer Benefit:** Clean, conflict-free PR diffs on API contract changes.

### 2. Move `AISLE_ORDER` & Feature Metadata from Build-Time Env to Runtime Settings

- **Observation:** `NEXT_PUBLIC_AISLE_ORDER` is baked into Next.js at Docker image build time (`pwa/Dockerfile`), meaning self-hosters using pre-built Docker Hub images cannot customize grocery aisle order at all via `.env`.
- **Proposal:** Store household aisle order in `family_settings` (with the current default list as fallback) and expose it via `/api/settings`.
- **Status:** Deferred until `/api/settings` DTO schema changes in `specs/openapi.yaml` and `schema.sql` are scoped in an OpenSpec change.
- **Impact:** **Medium**
- **Agent Benefit:** Removes build-arg plumbing across Dockerfiles, Compose files, `.env.example`, and Playwright build tests.
- **User / Maintainer Benefit:** Self-hosters can customize aisle order immediately without building custom Docker images.

---

## 4. Recommended Next Priorities (Panel Consensus)

If tackling only the highest-leverage items next:

1. **Blank-Kitchen Rescue (#1 Feature)** — Fix `FamilySelector` auto-open on 0 members, plain-language passphrase guidance, and empty-Home starter path so brand-new users never stall.
2. **Use What's In The Fridge + Remembered Pantry Staples (#2 & #3 Features)** — Direct relief for real-life weeknights without adding inventory complexity.
3. **Domain-Split OpenAPI Partials & Runtime `AISLE_ORDER` (#1 & #2 Engineering)** — Next engineering slice once `specs/openapi.yaml` and `schema.sql` contract edits are authorized.
