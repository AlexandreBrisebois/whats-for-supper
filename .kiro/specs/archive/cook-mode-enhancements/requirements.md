# Cook's Mode Enhancements - Requirements

## 1. Objective
Enhance the "Cook's Mode" and "Recipe Detail" interfaces to support a high-focus, low-friction cooking experience while maintaining design consistency across the application.

## 2. Key Features
- **In-Place Step Editing**: Allow real-time adjustments to cooking steps directly within Cook's Mode.
- **Editorial Cleanup**: Remove redundant titles and transition to left-aligned text for better legibility during active cooking.
- **High-Focus Header**: Redesign the Cook's Mode header with a larger, more editorial hero image.
- **Bi-directional Navigation**:
    - Tapping the Cook's Mode header image opens the detailed recipe.
    - Adding a prominent "COOK" button on the recipe detail hero image and a shortcut icon beside the time pill.
- **UI Hardening**: Remove distracting elements (Search from Stack Browser, Library from Search) to reduce cognitive load.

## 3. Design Constraints (Mère-Designer)
- **The Toddler Rule**: All primary actions (Start Cooking, Next Step, Save Edit) must be reachable with one thumb.
- **Anxiety Reduction**: Left-aligned Inter typography for scanning; predictable "Sheet" control clusters.
- **Thumb-Zone Priority**: Key triggers located in the most accessible screen areas (Hero image, Right-aligned clusters).

## 4. Technical Constraints
- **Contract Parity**: All updates to cooking steps must flow through the OpenAPI `PATCH /api/recipes/{id}` endpoint via `recipeInstructions`.
- **Zero Drift**: PWA models and API DTOsa and MOC API must remain in perfect sync.
- **Test-First**: Every change must be validated by a Red-then-Green test cycle.
