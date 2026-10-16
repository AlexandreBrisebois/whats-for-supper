# Executable entry inventory

Snapshot: 2026-10-16, commit `04a1c4570f9bbb01b47436790d4248635ac3179a` plus pre-existing staged documentation/harness inputs. This is the discovery checklist, not a coverage claim. Coverage and assertion mappings live in coverage-matrix.md and lane reports.

## Browser routes

- `pwa/src/app/(app)/browse-all-stack/page.tsx`
- `pwa/src/app/(app)/capture/confirm/page.tsx`
- `pwa/src/app/(app)/capture/page.tsx`
- `pwa/src/app/(app)/discovery/page.tsx`
- `pwa/src/app/(app)/home/page.tsx`
- `pwa/src/app/(app)/planner/page.tsx`
- `pwa/src/app/(app)/profile/page.tsx`
- `pwa/src/app/(app)/profile/settings/page.tsx`
- `pwa/src/app/(app)/recipes/page.tsx`
- `pwa/src/app/(auth)/invite/page.tsx`
- `pwa/src/app/(auth)/onboarding/page.tsx`
- `pwa/src/app/(auth)/welcome/page.tsx`
- `pwa/src/app/page.tsx`

## API actions

Attribute/action discovery includes operator-only APIs; health belongs to identity access exemption. Generated clients are not treated as additional user journeys.

### CapturesController

- `api/src/RecipeApi/Controllers/CapturesController.cs:12` — `[HttpGet("failures")]`
- `api/src/RecipeApi/Controllers/CapturesController.cs:20` — `[HttpPost("failures/{id:guid}/retry")]`
- `api/src/RecipeApi/Controllers/CapturesController.cs:44` — `[HttpDelete("failures/{id:guid}")]`

### DiscoveryController

- `api/src/RecipeApi/Controllers/DiscoveryController.cs:14` — `[HttpGet("categories")]`
- `api/src/RecipeApi/Controllers/DiscoveryController.cs:25` — `[HttpGet]`
- `api/src/RecipeApi/Controllers/DiscoveryController.cs:38` — `[HttpPost("{id:guid}/vote")]`

### FamilyController

- `api/src/RecipeApi/Controllers/FamilyController.cs:12` — `[HttpGet]`
- `api/src/RecipeApi/Controllers/FamilyController.cs:20` — `[HttpGet("me")]`
- `api/src/RecipeApi/Controllers/FamilyController.cs:35` — `[HttpPost]`
- `api/src/RecipeApi/Controllers/FamilyController.cs:55` — `[HttpPut("{id:guid}")]`
- `api/src/RecipeApi/Controllers/FamilyController.cs:62` — `[HttpPut("{id:guid}/preferences")]`
- `api/src/RecipeApi/Controllers/FamilyController.cs:71` — `[HttpDelete("{id:guid}")]`

### FeatureFlagsController

- `api/src/RecipeApi/Controllers/FeatureFlagsController.cs:12` — `[HttpGet]`
- `api/src/RecipeApi/Controllers/FeatureFlagsController.cs:24` — `[HttpPatch("{key}")]`

### GoToController

- `api/src/RecipeApi/Controllers/GoToController.cs:11` — `[HttpGet]`
- `api/src/RecipeApi/Controllers/GoToController.cs:18` — `[HttpPut]`
- `api/src/RecipeApi/Controllers/GoToController.cs:25` — `[HttpGet("active")]`

### HealthController

- `api/src/RecipeApi/Controllers/HealthController.cs:20` — `[HttpGet]`

### IngredientsController

- `api/src/RecipeApi/Controllers/IngredientsController.cs:17` — `[HttpPatch("{normalizedKey}/category")]`

### ManagementController

- `api/src/RecipeApi/Controllers/ManagementController.cs:32` — `[HttpPost("backup")]`
- `api/src/RecipeApi/Controllers/ManagementController.cs:42` — `[HttpPost("seed")]`
- `api/src/RecipeApi/Controllers/ManagementController.cs:52` — `[HttpPost("disaster-recovery")]`
- `api/src/RecipeApi/Controllers/ManagementController.cs:62` — `[HttpPost("demo-capture")]`
- `api/src/RecipeApi/Controllers/ManagementController.cs:72` — `[HttpPost("demo-restore")]`
- `api/src/RecipeApi/Controllers/ManagementController.cs:82` — `[HttpPost("backfill-search")]`
- `api/src/RecipeApi/Controllers/ManagementController.cs:110` — `[HttpGet("status")]`

### PdfCaptureController

- `api/src/RecipeApi/Controllers/PdfCaptureController.cs:14` — `[HttpPost("capture-pdf")]`

### RecipeController

- `api/src/RecipeApi/Controllers/RecipeController.cs:28` — `[HttpGet("search/filters")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:69` — `[HttpPost]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:86` — `[HttpGet]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:105` — `[HttpGet("library-summary")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:113` — `[HttpGet("{id:guid}")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:122` — `[HttpGet("{id:guid}/share")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:156` — `[HttpPatch("{id:guid}")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:163` — `[HttpPost("{id:guid}/import-report")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:187` — `[HttpDelete("{id:guid}/import-report")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:209` — `[HttpGet("import-status")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:220` — `[HttpPost("imports/bulk")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:232` — `[HttpPost("describe")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:248` — `[HttpGet("{id:guid}/status")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:266` — `[HttpPost("capture-url")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:279` — `[HttpPost("import-bundle")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:303` — `[HttpGet("recommendations")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:338` — `[HttpPost("search")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:359` — `[HttpGet("{recipeId:guid}/original/{photoIndex:int}")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:372` — `[HttpGet("{id:guid}/hero")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:382` — `[HttpPost("{id:guid}/originals")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:397` — `[HttpPost("{id:guid}/hero/regenerate")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:412` — `[HttpDelete("{id:guid}")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:439` — `[HttpGet("trash")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:447` — `[HttpPost("{id:guid}/restore")]`
- `api/src/RecipeApi/Controllers/RecipeController.cs:462` — `[HttpDelete("{id:guid}/purge")]`

### RecipeImportController

- `api/src/RecipeApi/Controllers/RecipeImportController.cs:11` — `[HttpGet("{importId:guid}")]`

### ScheduleController

- `api/src/RecipeApi/Controllers/ScheduleController.cs:13` — `[HttpGet]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:20` — `[HttpPost("lock")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:27` — `[HttpPost("move")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:34` — `[HttpPost("defer")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:52` — `[HttpPost("assign")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:59` — `[HttpGet("fill-the-gap")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:66` — `[HttpGet("{weekOffset}/smart-defaults")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:73` — `[HttpPost("day/{date}/validate")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:95` — `[HttpPost("voting/open")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:102` — `[HttpDelete("day/{date}/remove")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:110` — `[HttpPatch("{weekOffset}/grocery/item")]`
- `api/src/RecipeApi/Controllers/ScheduleController.cs:119` — `[HttpPatch("{weekOffset}/grocery")]`

### SettingsController

- `api/src/RecipeApi/Controllers/SettingsController.cs:14` — `[HttpGet("{key}")]`
- `api/src/RecipeApi/Controllers/SettingsController.cs:24` — `[HttpPost("{key}")]`

### StreamController

- `api/src/RecipeApi/Controllers/StreamController.cs:25` — `[HttpGet]`

### WorkflowController

- `api/src/RecipeApi/Controllers/WorkflowController.cs:22` — `[HttpPost("{workflowId}/trigger")]`
- `api/src/RecipeApi/Controllers/WorkflowController.cs:41` — `[HttpGet("instances/{instanceId:guid}")]`
- `api/src/RecipeApi/Controllers/WorkflowController.cs:61` — `[HttpGet("active")]`
- `api/src/RecipeApi/Controllers/WorkflowController.cs:78` — `[HttpGet("tasks/{taskId:guid}/diagnostics")]`
- `api/src/RecipeApi/Controllers/WorkflowController.cs:97` — `[HttpPost("tasks/{taskId:guid}/reset")]`

## Packaged workflow definitions

- `api/src/RecipeApi/Workflows/classify-recipe-vegetarian.yaml`
- `api/src/RecipeApi/Workflows/db-backup.yaml`
- `api/src/RecipeApi/Workflows/db-disaster-recovery.yaml`
- `api/src/RecipeApi/Workflows/db-restore.yaml`
- `api/src/RecipeApi/Workflows/demo-capture.yaml`
- `api/src/RecipeApi/Workflows/demo-restore.yaml`
- `api/src/RecipeApi/Workflows/dreaming.yaml`
- `api/src/RecipeApi/Workflows/goto-synthesis.yaml`
- `api/src/RecipeApi/Workflows/index-recipe-search.yaml`
- `api/src/RecipeApi/Workflows/recategorize-ingredients.yaml`
- `api/src/RecipeApi/Workflows/recipe-description-regeneration.yaml`
- `api/src/RecipeApi/Workflows/recipe-hero-regeneration.yaml`
- `api/src/RecipeApi/Workflows/recipe-import.yaml`
- `api/src/RecipeApi/Workflows/search-reconciliation.yaml`
- `api/src/RecipeApi/Workflows/url-import.yaml`
- `api/src/RecipeApi/Workflows/vegetarian-classification-backfill.yaml`
- `api/src/RecipeApi/Workflows/vegetarian-classification-status.yaml`
