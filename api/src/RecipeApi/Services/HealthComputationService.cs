using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Utils;

namespace RecipeApi.Services;

/// <summary>
/// Service responsible for computing dietary profiles and health-related metadata for recipes.
/// This encapsulates logic previously held in ClassifyDietaryProfileProcessor.
/// </summary>
public class HealthComputationService(
    RecipeDbContext db,
    IChatClient chatClient,
    ILogger<HealthComputationService> logger)
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly HashSet<string> ValidPrimaryFoodGroups = new(StringComparer.Ordinal)
    {
        "VegetablesAndFruits",
        "WholeGrains",
        "ProteinFoods",
        "Mixed"
    };

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

    public async Task ProcessRecipeChangedAsync(Guid recipeId, CancellationToken ct)
    {
        logger.LogInformation("Processing recipe health profile for {RecipeId}", recipeId);
        var recipe = await db.Recipes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == recipeId, ct);
        if (recipe == null)
        {
            logger.LogWarning("Recipe {RecipeId} not found for health computation", recipeId);
            return;
        }

        if (string.IsNullOrWhiteSpace(recipe.RawMetadata))
        {
            logger.LogDebug("Recipe {RecipeId} has no raw_metadata — skipping health computation", recipeId);
            return;
        }

        var (supplyNames, nutrition) = ExtractSupplyAndNutrition(recipe.RawMetadata, recipeId);
        if (supplyNames.Count == 0)
        {
            logger.LogDebug("Recipe {RecipeId} has no supply[] or recipeIngredient[] entries — skipping health computation", recipeId);
            return;
        }

        var llmResult = await CallLlmAsync(recipe.Name, recipe.Description, supplyNames, ct);
        if (llmResult == null)
        {
            throw new InvalidOperationException($"LLM classification failed for recipe {recipeId}");
        }

        if (!ValidateLlmResponse(llmResult, recipeId))
        {
            throw new InvalidOperationException($"LLM returned invalid response shape for recipe {recipeId}");
        }

        // Apply WholeGrain guard: if wholeGrainConfident is false, remove WholeGrains from secondary.
        if (!llmResult.WholeGrainConfident)
        {
            llmResult = llmResult with
            {
                SecondaryFoodGroups = llmResult.SecondaryFoodGroups
                    .Where(g => g != "WholeGrains")
                    .ToArray()
            };
        }

        var fopFlags = NutritionParser.ComputeFopFlags(nutrition);
        var result = llmResult with { FopFlags = fopFlags };

        // Upsert HealthRecipeProfile
        var profile = await db.HealthRecipeProfiles.FirstOrDefaultAsync(p => p.RecipeId == recipeId, ct);
        if (profile == null)
        {
            profile = new HealthRecipeProfile { RecipeId = recipeId };
            db.HealthRecipeProfiles.Add(profile);
        }

        profile.DietaryProfile = JsonSerializer.Serialize(result, _jsonOptions);
        profile.PrimaryFoodGroup = result.PrimaryFoodGroup;
        profile.IsHealthyChoice = recipe.IsHealthyChoice;
        profile.IsVegetarian = recipe.IsVegetarian;
        profile.FopFlags = JsonSerializer.Serialize(result.FopFlags, _jsonOptions);
        profile.LastRecomputedAt = DateTimeOffset.UtcNow;
        profile.Version++;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Updated health recipe profile for {RecipeId}", recipeId);
    }

    public async Task ProcessWeekChangedAsync(DateOnly weekStartDate, CancellationToken ct)
    {
        logger.LogInformation("Recomputing weekly health summary for {WeekStart}", weekStartDate);

        var weekEnd = weekStartDate.AddDays(7);
        var events = await db.CalendarEvents
            .AsNoTracking()
            .Where(e => e.Date >= weekStartDate && e.Date < weekEnd && e.MealSlot == (short)0) // 0 = Dinner
            .OrderBy(e => e.Date)
            .ToListAsync(ct);

        // Map events to profiles (must have 7 slots, even if null)
        var profiles = new List<RecipeDietaryProfile?>();
        for (int i = 0; i < 7; i++)
        {
            var date = weekStartDate.AddDays(i);
            var ev = events.FirstOrDefault(e => e.Date == date);

            if (ev?.RecipeId != null)
            {
                var profile = await db.HealthRecipeProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.RecipeId == ev.RecipeId, ct);

                if (!string.IsNullOrEmpty(profile?.DietaryProfile))
                {
                    profiles.Add(JsonSerializer.Deserialize<RecipeDietaryProfile>(profile.DietaryProfile, _jsonOptions));
                }
                else
                {
                    profiles.Add(null);
                }
            }
            else
            {
                profiles.Add(null);
            }
        }

        var balanceSummary = WeeklyBalanceScorer.Compute(profiles);

        var summary = await db.HealthWeekSummaries.FirstOrDefaultAsync(s => s.WeekStartDate == weekStartDate, ct);
        if (summary == null)
        {
            summary = new HealthWeekSummary { WeekStartDate = weekStartDate };
            db.HealthWeekSummaries.Add(summary);
        }

        summary.BalanceSummary = JsonSerializer.Serialize(balanceSummary, _jsonOptions);
        summary.FopWeekSummary = JsonSerializer.Serialize(balanceSummary.FopWeekSummary, _jsonOptions);
        summary.LastRecomputedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
    }

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
            logger.LogDebug(ex, "Failed to parse raw_metadata for recipe {RecipeId}", recipeId);
            return (supplyNames, nutrition);
        }

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
        else
        {
            var ingredientArray = root?["recipeIngredient"]?.AsArray();
            if (ingredientArray != null)
            {
                foreach (var item in ingredientArray)
                {
                    if (item == null) continue;
                    var text = item.GetValue<string>();
                    if (!string.IsNullOrWhiteSpace(text))
                        supplyNames.Add(text);
                }
            }
        }

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
                logger.LogDebug(ex, "Failed to parse nutrition for recipe {RecipeId}", recipeId);
            }
        }

        return (supplyNames, nutrition);
    }

    private async Task<RecipeDietaryProfile?> CallLlmAsync(
        string? recipeName,
        string? description,
        List<string> ingredientNames,
        CancellationToken ct)
    {
        var truncatedDescription = description != null && description.Length > 150
            ? description[..150]
            : description;

        var requestPayload = new
        {
            name = recipeName,
            description = truncatedDescription,
            ingredients = ingredientNames
        };

        var requestJson = JsonSerializer.Serialize(requestPayload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        var prompt = $"""
            {SystemPrompt}

            Recipe:
            {requestJson}
            """;

        try
        {
            var response = await chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var responseText = response.Text?.Trim() ?? string.Empty;

            if (responseText.StartsWith("```"))
            {
                var firstNewline = responseText.IndexOf('\n');
                var lastFence = responseText.LastIndexOf("```");
                if (firstNewline >= 0 && lastFence > firstNewline)
                    responseText = responseText[(firstNewline + 1)..lastFence].Trim();
            }

            var result = JsonSerializer.Deserialize<RecipeDietaryProfile>(responseText, _jsonOptions);

            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "LLM call failed during health computation");
            return null;
        }
    }

    private bool ValidateLlmResponse(RecipeDietaryProfile profile, Guid recipeId)
    {
        if (!ValidPrimaryFoodGroups.Contains(profile.PrimaryFoodGroup))
        {
            logger.LogWarning(
                "Invalid primaryFoodGroup '{PrimaryFoodGroup}' for recipe {RecipeId}",
                profile.PrimaryFoodGroup, recipeId);
            return false;
        }

        if (!ValidProteinSources.Contains(profile.ProteinSource))
        {
            logger.LogWarning(
                "Invalid proteinSource '{ProteinSource}' for recipe {RecipeId}",
                profile.ProteinSource, recipeId);
            return false;
        }

        return true;
    }
}
