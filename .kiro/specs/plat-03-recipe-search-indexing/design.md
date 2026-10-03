# Recipe Search Indexing — Design

Recipe writes feed fingerprint/reconciliation services and durable derived search filters. `SearchIndexWorkflow`, `SearchReconciliationWorkflow`, `RecipeSearchFilterMaterializer`, and their processors run through PLAT-02. Search controllers/services expose OpenAPI search DTOs; `useScheduleStream` invalidates search promotion on relevant events. Evidence: search service/fingerprint/materializer tests, workflow tests, search integration tests, and generated client contracts. This packet does not own ranking UI or SSE transport.
