using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class CategorizeRecipeProcessor(
    RecipeDbContext db,
    IChatClient chatClient,
    IHealthEventPublisher healthPublisher,
    ILogger<CategorizeRecipeProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "CategorizeRecipe";

    private static readonly Regex SidesRegex = new(
        @"\b(side|side-dish|accompagnement|accompagnements|gravy|dressing|condiment|dip|salsa|vinaigrette|pesto)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ProteinRegex = new(
        @"(chicken|beef|pork|salmon)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly HashSet<string> ValidMealTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Breakfast", "Brunch", "Snack", "Lunch", "Supper", "Sides", "Dessert", "Appetizer", "Beverage"
    };

    private sealed class LlmCategorizationResult
    {
        public string? CuisineType { get; set; }
        public string[]? MealTypes { get; set; }
        public string? PrimaryMealType { get; set; }
    }

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();

        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is null)
        {
            logger.LogWarning("CategorizeRecipe: recipe {RecipeId} not found — skipping", recipeId);
            return new { Message = $"Recipe {recipeId} not found — skipping" };
        }

        try
        {
            await CategorizeAsync(recipe, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "CategorizeRecipe: unexpected error for recipe {RecipeId} — workflow continues", recipeId);
        }

        return new { Message = $"CategorizeRecipe completed for recipe {recipeId}." };
    }

    private async Task CategorizeAsync(Recipe recipe, CancellationToken ct)
    {
        string? cuisineType = null;
        var mealTypesList = new List<string>();
        string? primaryMeal = null;

        // 1. Call LLM
        try
        {
            var prompt = $$"""
                You are a recipe categorization assistant. Given a recipe's name and description, identify its cuisine type and applicable meal types.

                Cuisine Type: Choose the best-fitting cuisine from these options, or provide free text if none fit:
                Italian, French-Canadian, Canadian, French, American, Mexican, Spanish, Greek, Mediterranean, Middle-Eastern, Indian, Chinese, Japanese, Korean, Thai, Vietnamese, Caribbean, Latin American

                Meal Types: Select all applicable meal slots from:
                Breakfast, Brunch, Snack, Lunch, Supper, Dessert, Appetizer, Beverage
                (Note: Map "Dinner" to "Supper")

                Primary Meal Type: Select the single primary meal slot from the selected meal types.

                Return a JSON object exactly matching this schema:
                {
                  "cuisineType": "string",
                  "mealTypes": ["string"],
                  "primaryMealType": "string"
                }

                Return ONLY valid JSON. No markdown. No explanation.

                Recipe Name: {{recipe.Name}}
                Recipe Description: {{recipe.Description}}
                """;

            var response = await chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var responseText = response.Text?.Trim() ?? string.Empty;

            if (responseText.StartsWith("```"))
            {
                var firstNewline = responseText.IndexOf('\n');
                var lastFence = responseText.LastIndexOf("```");
                if (firstNewline >= 0 && lastFence > firstNewline)
                    responseText = responseText[(firstNewline + 1)..lastFence].Trim();
            }

            var result = JsonSerializer.Deserialize<LlmCategorizationResult>(responseText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result != null)
            {
                cuisineType = result.CuisineType;
                primaryMeal = result.PrimaryMealType;

                if (result.MealTypes != null)
                {
                    foreach (var mt in result.MealTypes)
                    {
                        var mapped = MapMealType(mt);
                        if (mapped != null && !mealTypesList.Contains(mapped))
                        {
                            mealTypesList.Add(mapped);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "CategorizeRecipe: LLM call failed for recipe {RecipeId}", recipe.Id);
        }

        // 2. Map primary meal type
        primaryMeal = MapMealType(primaryMeal) ?? "Supper";

        // Ensure primaryMeal is in mealTypes
        if (!mealTypesList.Contains(primaryMeal))
        {
            mealTypesList.Add(primaryMeal);
        }

        // 3. Apply Sides Heuristic
        var textToSearch = (recipe.Name ?? "") + " " + (recipe.Description ?? "");
        var hasSidesKeyword = SidesRegex.IsMatch(textToSearch);
        var hasProteinKeyword = ProteinRegex.IsMatch(textToSearch);
        var isSides = hasSidesKeyword && !hasProteinKeyword;

        if (isSides)
        {
            recipe.Category = "Sides";
            if (!mealTypesList.Contains("Sides"))
            {
                mealTypesList.Add("Sides");
            }
        }
        else
        {
            recipe.Category = primaryMeal;
        }

        recipe.CuisineType = cuisineType;
        recipe.MealTypes = mealTypesList.ToArray();
        recipe.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        logger.LogInformation("CategorizeRecipe: categorized recipe {RecipeId} (Category: {Category}, CuisineType: {CuisineType}, MealTypes: {MealTypes})",
            recipe.Id, recipe.Category, recipe.CuisineType, string.Join(", ", recipe.MealTypes));

        // 4. Trigger out-of-band health recomputation
        await healthPublisher.PublishRecipeChangedAsync(recipe.Id, ct);
    }

    private static string? MapMealType(string? mealType)
    {
        if (string.IsNullOrWhiteSpace(mealType))
            return null;

        var clean = mealType.Trim();
        if (clean.Equals("Dinner", StringComparison.OrdinalIgnoreCase))
            return "Supper";

        foreach (var valid in ValidMealTypes)
        {
            if (valid.Equals(clean, StringComparison.OrdinalIgnoreCase))
                return valid;
        }

        return null;
    }
}
