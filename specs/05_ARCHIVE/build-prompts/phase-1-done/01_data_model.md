# Task 1: Recipe Import Data Model & Infrastructure

**Context**: We are implementing a CQRS-inspired recipe import pipeline. This task focused on the data layer.

**Requirements**:
1. Create a new model `RecipeImport` in `api/src/RecipeApi/Models/`.
   - `Id`: Guid (PK).
   - `RecipeId`: Guid (FK to `Recipe`).
   - `Status`: Enum (`Pending`, `Processing`, `Failed`).
   - `ErrorMessage`: string? (nullable).
   - `CreatedAt`: DateTimeOffset.
   - `UpdatedAt`: DateTimeOffset.
2. Update `RecipeDbContext` to include the `RecipeImports` DbSet.
3. Configure the `RecipeImport` entity (schema mapping to table `recipe_imports`).
4. Ensure all changes are **non-breaking**:
   - New columns in `recipes` must be nullable.
   - Use a separate table (`recipe_imports`) for transient state.
   - Avoid renaming or deleting existing schema elements.
5. (Optional) Create an EF Core migration or ensure the table is created.

**Acceptance Criteria**:
- The `RecipeImport` model exists.
- The `RecipeDbContext` is updated.
- The system compiles.
