# CAP-05 — Duplicate prevention design

Import services query existing recipe state via approved duplicate fields and expose route-defined results/errors. Recipe controller/search/import DTOs and OpenAPI provide the external shape; persistence/query semantics remain server-owned. Import-report `duplicate` persists on `RecipeImportReports` but does not trigger contextual re-import. Evidence: recipe import and import-report integration tests, recipe API tests, and query/service tests.
