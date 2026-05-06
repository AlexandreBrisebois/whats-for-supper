using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Utils;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Workflow processor that categorizes recipe ingredients into grocery sections using an LLM.
/// Checks the <c>ingredient_categories</c> cache first; only uncached names are sent to the LLM
/// in a single batch call. Results are upserted with <c>source='llm'</c>.
/// </summary>
public class CategorizeIngredientsProcessor(
    RecipeDbContext db,
    IChatClient chatClient,
    ILogger<CategorizeIngredientsProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "CategorizeIngredients";

    // The exact section strings sent to the LLM — Meat and Seafood are separate entries.
    // "Dairy & Eggs" maps to DairyAndEggs; all others are direct name matches.
    private static readonly string[] LlmSections =
    [
        "Produce", "Meat", "Seafood", "Dairy & Eggs", "Frozen",
        "Bakery", "Pantry", "Beverages", "Deli", "Grocery"
    ];

    // Maps the string values the LLM returns to GrocerySection enum values.
    // Also accepts "Uncategorized" as a legacy alias for "Grocery".
    private static readonly Dictionary<string, GrocerySection> SectionStringToEnum =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Produce"] = GrocerySection.Produce,
            ["Meat"] = GrocerySection.Meat,
            ["Seafood"] = GrocerySection.Seafood,
            ["Dairy & Eggs"] = GrocerySection.DairyAndEggs,
            ["Frozen"] = GrocerySection.Frozen,
            ["Bakery"] = GrocerySection.Bakery,
            ["Pantry"] = GrocerySection.Pantry,
            ["Beverages"] = GrocerySection.Beverages,
            ["Deli"] = GrocerySection.Deli,
            ["Grocery"] = GrocerySection.Grocery,
            ["Uncategorized"] = GrocerySection.Grocery, // legacy alias
        };

    // Maps GrocerySection enum values back to the canonical display strings stored in the DB.
    private static readonly Dictionary<GrocerySection, string> SectionEnumToString = new()
    {
        [GrocerySection.Produce] = "Produce",
        [GrocerySection.Meat] = "Meat",
        [GrocerySection.Seafood] = "Seafood",
        [GrocerySection.DairyAndEggs] = "Dairy & Eggs",
        [GrocerySection.Frozen] = "Frozen",
        [GrocerySection.Bakery] = "Bakery",
        [GrocerySection.Pantry] = "Pantry",
        [GrocerySection.Beverages] = "Beverages",
        [GrocerySection.Deli] = "Deli",
        [GrocerySection.Grocery] = "Grocery",
    };

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();

        try
        {
            await CategorizeAsync(recipeId, ct);
        }
        catch (Exception ex)
        {
            // Per spec: if LLM call fails, log and complete without throwing — workflow continues.
            logger.LogError(ex, "CategorizeIngredients: unexpected error for recipe {RecipeId} — workflow continues", recipeId);
        }

        return new { Message = $"CategorizeIngredients completed for recipe {recipeId}." };
    }

    private async Task CategorizeAsync(Guid recipeId, CancellationToken ct)
    {
        // 1. Load the recipe and read supply[] from raw_metadata.
        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is null)
        {
            logger.LogWarning("CategorizeIngredients: recipe {RecipeId} not found — skipping", recipeId);
            return;
        }

        if (string.IsNullOrWhiteSpace(recipe.RawMetadata))
        {
            logger.LogDebug("CategorizeIngredients: recipe {RecipeId} has no raw_metadata — skipping", recipeId);
            return;
        }

        var supplyNames = ExtractSupplyNames(recipe.RawMetadata, recipeId);
        if (supplyNames.Count == 0)
        {
            logger.LogDebug("CategorizeIngredients: recipe {RecipeId} has no supply[] entries — skipping", recipeId);
            return;
        }

        // 2. Normalize each name.
        var normalizedNames = supplyNames
            .Select(IngredientNormalizer.Normalize)
            .Where(n => !string.IsNullOrEmpty(n))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (normalizedNames.Count == 0)
            return;

        // 3. Check ingredient_categories for existing entries (cache hit → skip).
        var existingKeys = await db.IngredientCategories
            .Where(ic => normalizedNames.Contains(ic.NormalizedKey))
            .Select(ic => ic.NormalizedKey)
            .ToListAsync(ct);

        var cachedSet = new HashSet<string>(existingKeys, StringComparer.Ordinal);
        var uncachedNames = normalizedNames.Where(n => !cachedSet.Contains(n)).ToList();

        logger.LogInformation(
            "CategorizeIngredients: recipe {RecipeId} — {Total} normalized names, {Cached} cached, {Uncached} to send to LLM",
            recipeId, normalizedNames.Count, cachedSet.Count, uncachedNames.Count);

        if (uncachedNames.Count == 0)
        {
            logger.LogDebug("CategorizeIngredients: all ingredients for recipe {RecipeId} are already cached — no LLM call needed", recipeId);
            return;
        }

        // 4. Send uncached names to LLM in a single batch call.
        var llmResults = await CallLlmAsync(uncachedNames, ct);
        if (llmResults is null || llmResults.Count == 0)
        {
            logger.LogWarning("CategorizeIngredients: LLM returned no results for recipe {RecipeId}", recipeId);
            return;
        }

        // 5. Validate each returned section and upsert valid results.
        var now = DateTimeOffset.UtcNow;
        int upserted = 0;

        foreach (var result in llmResults)
        {
            var normalizedKey = result.NormalizedKey;
            var sectionString = result.Section;

            if (string.IsNullOrWhiteSpace(normalizedKey) || string.IsNullOrWhiteSpace(sectionString))
            {
                logger.LogWarning(
                    "CategorizeIngredients: LLM returned entry with missing normalizedKey or section — discarding");
                continue;
            }

            // Validate section string maps to a known GrocerySection enum value.
            if (!SectionStringToEnum.TryGetValue(sectionString, out var grocerySection))
            {
                logger.LogWarning(
                    "CategorizeIngredients: LLM returned invalid section '{Section}' for '{Key}' — discarding",
                    sectionString, normalizedKey);
                continue;
            }

            // Map enum back to canonical DB string.
            var canonicalSection = SectionEnumToString[grocerySection];

            // Upsert into ingredient_categories with source='llm'.
            var existing = await db.IngredientCategories.FindAsync([normalizedKey], ct);
            if (existing is not null)
            {
                // Only overwrite if source is 'llm' — never overwrite 'manual' entries.
                if (existing.Source == "manual")
                {
                    logger.LogDebug(
                        "CategorizeIngredients: '{Key}' has source='manual' — skipping LLM overwrite",
                        normalizedKey);
                    continue;
                }

                existing.GrocerySection = canonicalSection;
                existing.Confidence = result.Confidence;
                existing.Source = "llm";
                existing.UpdatedAt = now;
            }
            else
            {
                db.IngredientCategories.Add(new IngredientCategory
                {
                    NormalizedKey = normalizedKey,
                    GrocerySection = canonicalSection,
                    Confidence = result.Confidence,
                    Source = "llm",
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            upserted++;
        }

        if (upserted > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation(
                "CategorizeIngredients: upserted {Count} ingredient categories for recipe {RecipeId}",
                upserted, recipeId);
        }
    }

    /// <summary>
    /// Sends a batch of normalized ingredient names to the LLM and returns the categorization results.
    /// Returns null if the LLM call fails.
    /// </summary>
    private async Task<List<LlmCategoryResult>?> CallLlmAsync(List<string> ingredientNames, CancellationToken ct)
    {
        var requestPayload = new
        {
            ingredients = ingredientNames,
            task = "Assign each ingredient to exactly one grocery store section.",
            sections = LlmSections
        };

        var requestJson = JsonSerializer.Serialize(requestPayload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        var prompt = $"""
            You are a grocery categorization assistant. Given a list of ingredient names and a list of grocery store sections, assign each ingredient to exactly one section.

            Return a JSON array where each element has:
            - "normalizedKey": the ingredient name exactly as provided in the input
            - "section": one of the provided section strings
            - "confidence": a float between 0.0 and 1.0

            Return ONLY valid JSON. No markdown. No explanation.

            Input:
            {requestJson}
            """;

        try
        {
            var response = await chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var responseText = response.Text?.Trim() ?? string.Empty;

            // Strip markdown code fences if present.
            if (responseText.StartsWith("```"))
            {
                var firstNewline = responseText.IndexOf('\n');
                var lastFence = responseText.LastIndexOf("```");
                if (firstNewline >= 0 && lastFence > firstNewline)
                    responseText = responseText[(firstNewline + 1)..lastFence].Trim();
            }

            var results = JsonSerializer.Deserialize<List<LlmCategoryResult>>(responseText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            return results;
        }
        catch (Exception ex)
        {
            // Per spec: if LLM call fails, log and return null — workflow continues.
            logger.LogError(ex, "CategorizeIngredients: LLM call failed — ingredients will fall back to AisleMapper at recompute time");
            return null;
        }
    }

    /// <summary>
    /// Extracts the raw supply names from a recipe's <c>raw_metadata</c> JSON string.
    /// </summary>
    private List<string> ExtractSupplyNames(string rawMetadata, Guid recipeId)
    {
        var results = new List<string>();

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(rawMetadata);
        }
        catch (JsonException ex)
        {
            logger.LogDebug(ex, "CategorizeIngredients: failed to parse raw_metadata for recipe {RecipeId}", recipeId);
            return results;
        }

        var supplyArray = root?["supply"]?.AsArray();
        if (supplyArray == null || supplyArray.Count == 0)
        {
            logger.LogDebug("CategorizeIngredients: recipe {RecipeId} raw_metadata has no supply[] — skipping", recipeId);
            return results;
        }

        foreach (var item in supplyArray)
        {
            if (item == null) continue;
            var name = item["name"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(name))
                results.Add(name);
        }

        return results;
    }

    // ── Private DTOs ─────────────────────────────────────────────────────────

    private sealed record LlmCategoryResult(
        string NormalizedKey,
        string Section,
        double Confidence);
}
