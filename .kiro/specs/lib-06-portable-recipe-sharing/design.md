# LIB-06 — Portable recipe sharing: design

`RecipeDetailSheet` calls `getRecipeShareBundle` and `downloadRecipeBundleFile` from `recipes.ts`, with local sharing/toast/error state. `MinimalCapture` parses file/text input, maps portable image/base64 data, presents a read-only preview, then calls `importRecipeShareBundle` after user confirmation.

`RecipeController` exports through recipe service and imports with a required family member ID; import returns Created on success and BadRequest for format/operation failures. The bundle DTO/OpenAPI are the cross-household contract; `RecipeShareIntegrationTests` and sharing E2E tests cover fidelity seams.

Evidence: `RecipeDetailSheet.tsx`, `MinimalCapture.tsx`, `recipes.ts`, `RecipeController.cs`, `RecipeService.cs`, `RecipeShareIntegrationTests.cs`, `recipe-share.spec.ts`, `sharing-fidelity.spec.ts`, and OpenAPI.
