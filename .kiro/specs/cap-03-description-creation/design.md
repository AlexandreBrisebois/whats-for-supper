# CAP-03 — Description creation design

PWA capture/GOTO clients submit the description-create request; controller/service creates a recipe stub and triggers synthesis workflow. The route's OpenAPI request contains name/description and its accepted response identifies pending work/recipe context. Workflow processors persist eventual recipe state and may publish ready/failed events; client stores own their notification/reconciliation. Evidence: capture/API contract tests, workflow/processor tests, recipe integration tests and stream tests.
