# Demo Mode Requirements

## Vision
Demo Mode allows the "What's For Supper" app to be showcased in a controlled, stable, and cost-effective environment. It provides a "frozen" master state that is automatically restored periodically, ensuring every new tester starts with a clean, high-quality library of recipes and family members without the overhead of live AI processing.

## Product Decisions
- **Master Snapshot**: The "source of truth" for the demo is stored in `DATAROOT/demo/`.
- **Filtered Restore**: Only core entities (Recipes, Family Members, Search Indexes) are restored. Dynamic user state (Votes, Weekly Plans, Calendar Events) is erased on every reset to ensure a "fresh" start.
- **AI Preservation**: Recipes in the demo state retain their AI-generated descriptions and search embeddings, allowing semantic browsing without triggering new AI costs.
- **Soft Disable (Workflows)**: Generative AI workflow tasks are accepted and complete with an explicit "Demo Mode Bypass" result, preventing background costs while keeping import and workflow UX stable.
- **Hard Disable (UI)**: Any UI control that would initiate a live LLM call is disabled with a clear notification. Precomputed semantic search over restored embeddings may remain available because it does not call the LLM.
- **Security**: Access is protected by a pre-populated family passphrase "Swipe-Match-Cook".
- **Restriction**: New user creation is disabled while `DEMO_MODE` is active.
- **Scheduling**: Demo reset builds on the existing Dreaming workflow pattern: a workflow schedules itself with a cron expression instead of introducing a separate scheduler.

## Acceptance Criteria
1.  **[AC-1] Demo Capture API**: A management endpoint `POST /api/management/demo-capture` must enqueue capture of the current database state (FamilyMembers, Recipes, RecipeSearchDocuments) and the `recipes/` directory to `DATAROOT/demo/`. It must exclude `RecipeVotes`, `WeeklyPlans`, `CalendarEvents`, `WorkflowInstances`, and `WorkflowTasks`.
2.  **[AC-2] Scheduled Demo Restore**: A new recurring workflow `demo-restore` must trigger automatically when `DEMO_MODE=true`, using `DEMO_RESTORE_CRON_UTC` with default `0 3 * * *`.
3.  **[AC-3] Reset Logic**: The restore workflow must:
    - Truncate `RecipeVotes`, `WeeklyPlans`, and `CalendarEvents`.
    - Restore `FamilyMembers`, `Recipes`, and `RecipeSearchDocuments` from the `demo/` snapshot.
    - Synchronize the `recipes/` directory from the `demo/recipes/` backup.
    - Leave no active workflow history from the previous demo window except the currently running restore workflow and its rescheduled successor.
4.  **[AC-4] AI Soft Disable**: When `DEMO_MODE=true` is set in environment variables, the following processors must return a completed "Demo Mode Bypass" result without calling external AI: `ExtractRecipe`, `GenerateDescription`, `SynthesizeRecipe`, `WebAcquisition`, `CategorizeIngredients`, and `ClassifyDietaryProfile`.
5.  **[AC-5] AI Search Notification**: The PWA search page must disable the Agent/translation mode toggle or show a pop-out message: "Semantic search translation is disabled in Demo Mode" when attempted. Normal lexical search and precomputed embedding search remain enabled.
6.  **[AC-6] Restricted User Creation**: When `DEMO_MODE=true`, `POST /api/family` must return `403 Forbidden` with a message: "New user creation is restricted in Demo Mode."
7.  **[AC-7] Pre-populated Login**: The PWA login/passphrase textbox must be pre-populated with `"Swipe-Match-Cook"` when the app detects it is in demo mode.
8.  **[AC-8] Clean Loops**: Every restoration window must result in core demo state that is identical to the captured master state, with no user-visible side effects from previous sessions.
9.  **[AC-9] Safe Missing Snapshot**: If `DATAROOT/demo/` is missing or incomplete, restore must fail gracefully with a clear workflow failure message and must not erase active data.

## Glossary
- **Demo Mode**: A system state where AI costs are minimized and data is periodically reset.
- **DATAROOT/demo**: The designated subdirectory for the demo snapshot files.
- **Soft Disable**: Allowing a request to succeed but omitting the background processing logic.
- **Master State**: The specific snapshot of recipes and members defined by the administrator for the demo.
