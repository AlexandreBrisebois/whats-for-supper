# Demo Mode Requirements

## Vision
Demo Mode allows the "What's For Supper" app to be showcased in a controlled, stable, and cost-effective environment. It provides a "frozen" master state that is automatically restored periodically, ensuring every new tester starts with a clean, high-quality library of recipes and family members without the overhead of live AI processing.

## Product Decisions
- **Master Snapshot**: The "source of truth" for the demo is stored in `DATAROOT/demo/`.
- **Filtered Restore**: Only core entities (Recipes, Family Members, Search Indexes) are restored. Dynamic user state (Votes, Weekly Plans, Calendar Events) is erased on every reset to ensure a "fresh" start.
- **AI Preservation**: Recipes in the demo state retain their AI-generated descriptions and search embeddings, allowing semantic browsing without triggering new AI costs.
- **Soft Disable (Workflows)**: Generative AI workflows (Extraction, Synthesis) are accepted by the API but never triggered, preventing background costs from trial users.
- **Hard Disable (UI)**: The "Agent Search" (Semantic Translation) is explicitly disabled in the UI with a notification to prevent LLM usage.
- **Security**: Access is protected by a pre-populated family passphrase "Swipe-Match-Cook".
- **Restriction**: New user creation is disabled while `DEMO_MODE` is active.

## Acceptance Criteria
1.  **[AC-1] Demo Capture API**: A management endpoint `POST /api/management/demo-capture` must save the current database state (FamilyMembers, Recipes, SearchDocuments) and the `recipes/` directory to `DATAROOT/demo/`. It must exclude `RecipeVotes`, `WeeklyPlans`, and `CalendarEvents`.
2.  **[AC-2] Scheduled Demo Restore**: A new recurring workflow `demo-restore` must trigger automatically based on `DEMO_RESTORE_TIME` (default: 03:00) and `DEMO_RESTORE_OFFSET`.
3.  **[AC-3] Reset Logic**: The restore workflow must:
    - Truncate `RecipeVotes`, `WeeklyPlans`, and `CalendarEvents`.
    - Restore `FamilyMembers`, `Recipes`, and `RecipeSearchDocuments` from the `demo/` snapshot.
    - Synchronize the `recipes/` directory from the `demo/recipes/` backup.
4.  **[AC-4] AI Soft Disable**: When `DEMO_MODE=true` is set in environment variables, the `WorkflowOrchestrator` must skip execution of tasks using the following processors: `RecipeAgent`, `WebAcquisitionAgent`, `CategorizeIngredientsProcessor`, and `ClassifyDietaryProfileProcessor`.
5.  **[AC-5] AI Search Notification**: The PWA search page must disable the "Agent" mode toggle or show a pop-out message: "Semantic search translation is disabled in Demo Mode" when attempted.
6.  **[AC-6] Restricted User Creation**: When `DEMO_MODE=true`, `POST /api/family` must return `403 Forbidden` with a message: "New user creation is restricted in Demo Mode."
7.  **[AC-7] Pre-populated Login**: The PWA login/passphrase textbox must be pre-populated with `"Swipe-Match-Cook"` when the app detects it is in demo mode.
8.  **[AC-8] Clean Loops**: Every restoration window must result in a system that is identical to the captured master state, with zero side effects from previous sessions.

## Glossary
- **Demo Mode**: A system state where AI costs are minimized and data is periodically reset.
- **DATAROOT/demo**: The designated subdirectory for the demo snapshot files.
- **Soft Disable**: Allowing a request to succeed but omitting the background processing logic.
- **Master State**: The specific snapshot of recipes and members defined by the administrator for the demo.
