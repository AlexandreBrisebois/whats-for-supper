# CAP-04 — Recipe bundle import design

Client bundle submission reaches the recipe import controller/service, which validates bundle version/schema, maps persisted recipe data and returns the documented response. OpenAPI bundle schemas and generated client are the contract authority. Evidence includes recipe import service/controller integration tests and bundle-related API tests. This packet owns interchange boundary only, not workflow synthesis or library presentation.
