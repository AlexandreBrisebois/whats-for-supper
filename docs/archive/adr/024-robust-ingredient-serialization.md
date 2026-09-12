# ADR 024: Robust Ingredient Serialization Fallback

## Status
Accepted

## Context
The "What's For Supper" project contains legacy and partially imported recipe data where the `ingredients` column (stored as JSONB in PostgreSQL) may exist in multiple formats:
1.  **String Array**: `["200g flour", "2 eggs"]` (The current standard).
2.  **Object Array**: `[{"name": "200g flour", "quantity": "200g", ...}]` (Legacy format from early import experiments).
3.  **Invalid/Raw Text**: Cases where the column contains non-JSON text or `null`.

Direct deserialization into `List<string>` using `System.Text.Json` throws a `JsonException` ("Cannot get the value of a token type 'StartObject' as a string") when encountering the object array format, leading to 500 errors on the `GET /api/recipes` list and detail views.

## Decision
We will implement a multi-stage, robust deserialization pattern for the `ingredients` field in `RecipeService`:

1.  **Strict Attempt**: Attempt standard `JsonSerializer.Deserialize<List<string>>`.
2.  **Object Fallback**: If standard deserialization fails, catch the `JsonException` and attempt to deserialize as `List<JsonElement>`.
3.  **Property Plucking**: Iterate through the `JsonElement` list. If an element is an object, attempt to pluck the `"name"` property. If it's a string, use it directly.
4.  **Raw Fallback**: If all JSON parsing fails, return the raw text as a single-element list (or empty if whitespace).

This logic is implemented in a `public static` method `DeserializeIngredients(string? json)` to ensure it can be shared across services (e.g., `RecipeService`, `ScheduleService`).

## Consequences
- **Resilience**: The API can now serve recipes regardless of their historical data format, preventing breaking errors in the PWA.
- **Data Fidelity**: No data is lost or hidden; if an ingredient is an object, at least its name is preserved in the UI.
- **Shared Logic**: Centralizing this logic prevents drift between how recipes are listed and how they appear in the planner/schedule.
