using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Utils;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Workflow processor that classifies recipes into dietary profiles using an LLM.
/// This is the only place in the feature that calls the LLM.
/// Classification is idempotent: if a recipe already has a dietary_profile, it is skipped
/// unless forceReclassify is true in the payload.
/// </summary>
public class ClassifyDietaryProfileProcessor(
    RecipeDbContext db,
    IChatClient chatClient,
    ILogger<ClassifyDietaryProfileProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "ClassifyDietaryProfile";

    // Valid values for primaryFoodGroup
    private static readonly HashSet<string> ValidPrimaryFoodGroups = new(StringComparer.Ordinal)
    {
        "VegetablesAndFruits",
        "WholeGrains",
        "ProteinFoods",
        "Mixed"
    };

    // Valid values for proteinSource
    private static readonly HashSet<string> ValidProteinSources = new(StringComparer.Ordinal)
    {
        "RedMeat",
        "Poultry",
        "Seafood",
        "PlantProtein",
        "Dairy",
        "Mixed",
        "None"
    };

    // System prompt for the LLM
    private const string SystemPrompt = """
        You are a culinary dietitian. Classify the recipe using Canada's 2019 Food Guide.

        Rules:
        - primaryFoodGroup: the food group that contributes most calories/nutrition.
          Must be exactly one of: VegetablesAndFruits, WholeGrains, ProteinFoods, Mixed.
        - secondaryFoodGroups: other food groups meaningfully present. Never include primaryFoodGroup.
          Omit WholeGrains unless wholeGrainConfident is true.
        - wholeGrainConfident: true ONLY when the ingredient list contains an explicit whole-grain
          name: brown rice, whole wheat, quinoa, oats, barley, spelt, farro, bulgur.
          pasta, linguine, noodles, rice (without qualifier), flour = false.
        - proteinSource: must be exactly one of:
          RedMeat (beef/lamb/pork/veal/venison),
          Poultry (chicken/turkey/duck),
          Seafood (fish/shrimp/salmon/cod/tuna/scallop/crab/lobster),
          PlantProtein (legumes/tofu/tempeh/lentils/beans/chickpeas),
          Dairy (cheese/eggs/milk-dominant),
          Mixed (two or more of the above in meaningful quantity),
          None (no significant protein source).
        - cuisineType: the culinary tradition. Use common names such as:
          Italian, French-Canadian, Canadian, Asian, Mexican, Mediterranean,
          Middle-Eastern, Indian, American, Japanese, Thai, Greek. Free text if none match.
        - mealTypes: all applicable from [Breakfast, Lunch, Dinner, Snack, Dessert].
        - primaryMealType: the single most likely meal slot.
        - confidence: your confidence 0.0 to 1.0.
        - source: always "llm".

        Respond with JSON only. No explanation. No markdown.
        """;

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();

        // Parse optional forceReclassify flag (default false)
        var forceReclassify = false;
        if (doc.RootElement.TryGetProperty("forceReclassify", out var forceProp))
        {
            forceReclassify = forceProp.GetBoolean();
        }

        try
        {
            await ClassifyAsync(recipeId, forceReclassify, ct);
        }
        catch (Exception ex)
        {
            // Per spec: if any error occurs, log and complete without throwing — workflow continues.
            logger.LogError(ex, "ClassifyDietaryProfile: unexpected error for recipe {RecipeId} — workflow continues", recipeId);
        }

        return new { Message = $"ClassifyDietaryProfile completed for recipe {recipeId}." };
    }

    private async Task ClassifyAsync(Guid recipeId, bool forceReclassify, CancellationToken ct)
    {
        // 1. Load the recipe from DB.
        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is null)
        {
            logger.LogWarning("ClassifyDietaryProfile: recipe {RecipeId} not found — skipping", recipeId);
            return;
        }

        // 2. Check idempotence: if dietary_profile is already set and forceReclassify is false, skip.
        if (recipe.DietaryProfile != null && !forceReclassify)
        {
            logger.LogDebug("ClassifyDietaryProfile: recipe {RecipeId} already classified — skipping", recipeId);
            return;
        }

        // 3. If forceReclassify is true, clear the existing profile to force re-classification.
        if (forceReclassify)
        {
            recipe.DietaryProfile = null;
        }

        // 4. Read raw_metadata.
        if (string.IsNullOrWhiteSpace(recipe.RawMetadata))
        {
            logger.LogDebug("ClassifyDietaryProfile: recipe {RecipeId} has no raw_metadata — skipping", recipeId);
            return;
        }

        // 5. Extract supply names and nutrition from raw_metadata.
        var (supplyNames, nutrition) = ExtractSupplyAndNutrition(recipe.RawMetadata, recipeId);
        if (supplyNames.Count == 0)
        {
            logger.LogDebug("ClassifyDietaryProfile: recipe {RecipeId} has no supply[] entries — skipping", recipeId);
            return;
        }

        // 6. Call LLM with structured payload.
        var llmResult = await CallLlmAsync(recipe.Name, recipe.Description, supplyNames, ct);
        if (llmResult is null)
        {
            logger.LogWarning("ClassifyDietaryProfile: LLM returned no result for recipe {RecipeId}", recipeId);
            return;
        }

        // 7. Validate response shape.
        if (!ValidateLlmResponse(llmResult, recipeId))
        {
            return;
        }

        // 8. Apply WholeGrain guard: if wholeGrainConfident is false, remove WholeGrains from secondary.
        if (!llmResult.WholeGrainConfident)
        {
            llmResult = llmResult with
            {
                SecondaryFoodGroups = llmResult.SecondaryFoodGroups
                    .Where(g => g != "WholeGrains")
                    .ToArray()
            };
        }

        // 9. Compute FOP flags from nutrition (deterministic, no LLM involved).
        var fopFlags = NutritionParser.ComputeFopFlags(nutrition);

        // 10. Attach FOP flags to the profile.
        var profile = llmResult with { FopFlags = fopFlags };

        // 11. Serialize and write to recipe.
        recipe.DietaryProfile = JsonSerializer.Serialize(profile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        recipe.Category = profile.PrimaryFoodGroup;

        // 12. Save changes.
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "ClassifyDietaryProfile: recipe {RecipeId} classified as {PrimaryFoodGroup}",
            recipeId, profile.PrimaryFoodGroup);
    }

    /// <summary>
    /// Extracts supply names and nutrition information from raw_metadata JSON.
    /// </summary>
    private (List<string> supplyNames, NutritionInformation? nutrition) ExtractSupplyAndNutrition(
        string rawMetadata, Guid recipeId)
    {
        var supplyNames = new List<string>();
        NutritionInformation? nutrition = null;

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(rawMetadata);
        }
        catch (JsonException ex)
        {
            logger.LogDebug(ex, "ClassifyDietaryProfile: failed to parse raw_metadata for recipe {RecipeId}", recipeId);
            return (supplyNames, nutrition);
        }

        // Extract supply array
        var supplyArray = root?["supply"]?.AsArray();
        if (supplyArray != null && supplyArray.Count > 0)
        {
            foreach (var item in supplyArray)
            {
                if (item == null) continue;
                var name = item["name"]?.GetValue<string>();
                if (!string.IsNullOrWhiteSpace(name))
                    supplyNames.Add(name);
            }
        }

        // Extract nutrition information
        var nutritionNode = root?["nutrition"];
        if (nutritionNode != null)
        {
            try
            {
                var nutritionJson = nutritionNode.ToJsonString();
                nutrition = JsonSerializer.Deserialize<NutritionInformation>(nutritionJson, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }
            catch (JsonException ex)
            {
                logger.LogDebug(ex, "ClassifyDietaryProfile: failed to parse nutrition for recipe {RecipeId}", recipeId);
            }
        }

        return (supplyNames, nutrition);
    }

    /// <summary>
    /// Calls the LLM with the recipe information and returns the parsed response.
    /// Returns null if the LLM call fails.
    /// </summary>
    private async Task<RecipeDietaryProfile?> CallLlmAsync(
        string? recipeName,
        string? description,
        List<string> ingredientNames,
        CancellationToken ct)
    {
        // Truncate description to first 150 characters
        var truncatedDescription = description != null && description.Length > 150
            ? description[..150]
            : description;

        var requestPayload = new
        {
            name = recipeName,
            description = truncatedDescription,
            ingredients = ingredientNames
        };

        var requestJson = JsonSerializer.Serialize(requestPayload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        var prompt = $"""
            {SystemPrompt}

            Recipe:
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

            var result = JsonSerializer.Deserialize<RecipeDietaryProfile>(responseText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            return result;
        }
        catch (Exception ex)
        {
            // Per spec: if LLM call fails, log and return null — workflow continues.
            logger.LogError(ex, "ClassifyDietaryProfile: LLM call failed");
            return null;
        }
    }

    /// <summary>
    /// Validates the LLM response shape. Returns true if valid, false otherwise.
    /// </summary>
    private bool ValidateLlmResponse(RecipeDietaryProfile profile, Guid recipeId)
    {
        // Validate primaryFoodGroup
        if (!ValidPrimaryFoodGroups.Contains(profile.PrimaryFoodGroup))
        {
            logger.LogWarning(
                "ClassifyDietaryProfile: LLM returned invalid primaryFoodGroup '{PrimaryFoodGroup}' for recipe {RecipeId}",
                profile.PrimaryFoodGroup, recipeId);
            return false;
        }

        // Validate proteinSource
        if (!ValidProteinSources.Contains(profile.ProteinSource))
        {
            logger.LogWarning(
                "ClassifyDietaryProfile: LLM returned invalid proteinSource '{ProteinSource}' for recipe {RecipeId}",
                profile.ProteinSource, recipeId);
            return false;
        }

        return true;
    }
}
