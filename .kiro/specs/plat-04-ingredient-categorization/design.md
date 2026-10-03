# Ingredient Categorization — Design

Normalization → `IngredientCategories` lookup/override → `GroceryRecomputeService` produces weekly grocery sections. `IngredientsController` is the manual route boundary; category processor/workflow is asynchronous ownership. `AisleMapperTests`, normalizer tests, category service/integration tests, grocery recompute tests and OpenAPI are evidence. The API response is `204`; current initiator UI locally updates its current list, while other list refresh is GROC-01/PLAT-01 work.
