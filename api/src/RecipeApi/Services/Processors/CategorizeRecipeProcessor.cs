using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.AI;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class CategorizeRecipeProcessor(
    IClock clock,
    RecipeDbContext db,
    IChatClient chatClient,
    ILogger<CategorizeRecipeProcessor> logger,
    VegetarianClassificationPolicy? vegetarianPolicy = null,
    DemoModeOptions? demoMode = null,
    RecipeFilePublicationStore? publications = null) : IWorkflowProcessor
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
        public bool? IsVegetarian { get; set; }
    }

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        // Demo refusal must not fall through to heuristic replacement facts.
        demoMode?.EnsureAiAvailable();
        var recipeId = ReadRecipeId(task.Payload);

        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is null)
        {
            logger.LogWarning("CategorizeRecipe: recipe {RecipeId} not found — skipping", recipeId);
            return new { Message = MissingMessage(recipeId) };
        }

        var capturedWorkflow = task.InstanceId != Guid.Empty && await db.WorkflowInstances.AsNoTracking()
            .AnyAsync(x => x.Id == task.InstanceId && (x.WorkflowId == "url-import" || x.WorkflowId == "recipe-import"), ct);
        if (capturedWorkflow)
        {
            var publisher = publications ?? throw new InvalidOperationException("Captured categorization requires its publication store.");
            var input = ProcessorName + "\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload);
            if (await publisher.TryResumeAsync(recipeId, task.TaskId, input, ct))
                return new { Message = CompletionMessage(recipeId) };
            var capture = await publisher.CaptureForTaskAsync(task, recipeId, ct);
            // Classification observes captured originals, never mutates the tracked row
            // before the publication lock rechecks the complete launch chain.
            var candidate = RecipeFilePublicationStore.RestoreObservation(capture.Fields
                ?? throw new InvalidDataException("Categorization needs captured field observations."));
            await CategorizeAsync(candidate, ct, persist: false);
            await publisher.PublishCategorizationAsync(task, capture, candidate, ct);
            return new { Message = CompletionMessage(recipeId) };
        }

        try
        {
            await CategorizeAsync(recipe, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "CategorizeRecipe: unexpected error for recipe {RecipeId} — workflow continues", recipeId);
        }

        return new { Message = CompletionMessage(recipeId) };
    }

    private static Guid ReadRecipeId(string? payload)
    {
        if (string.IsNullOrEmpty(payload))
            throw new ArgumentException("Task payload is empty.");
        using var doc = JsonDocument.Parse(payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");
        return idProp.GetGuid();
    }

    private static string MissingMessage(Guid recipeId) => $"Recipe {recipeId} not found — skipping";
    private static string CompletionMessage(Guid recipeId) => $"CategorizeRecipe completed for recipe {recipeId}.";

    internal static Guid ValidateOriginalHistory(string? payload, string? returned)
    {
        WorkflowProcessorHistory.ReadObservation<JsonElement>(payload ?? "null");
        var recipeId = ReadRecipeId(payload);
        var result = WorkflowProcessorHistory.ReadObservation<JsonElement>(returned ?? "null");
        if (recipeId == Guid.Empty || result.ValueKind != JsonValueKind.Object
            || !result.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.String
            || message.GetString() is not { } text || (text != MissingMessage(recipeId) && text != CompletionMessage(recipeId)))
            throw new InvalidDataException("Original recipe categorization receipt differs from its invocation.");
        // Completion also follows caught failures and fallback categorization.
        // Neither message certifies historical source, provider or row state.
        // Unknown extensions are preserved without qualifying their meaning.
        return recipeId;
    }

    private async Task CategorizeAsync(Recipe recipe, CancellationToken ct, bool persist = true)
    {
        string? cuisineType = null;
        var mealTypesList = new List<string>();
        string? primaryMeal = null;
        bool? isVegetarian = null;

        // 1. Call LLM
        try
        {
            var prompt = $$"""
                You are a recipe facts categorization assistant. Given a recipe's name, description, and ingredients, identify its cuisine type, applicable meal types, and whether its available ingredients make the prepared recipe vegetarian.

                Cuisine Type: Choose the best-fitting cuisine from these options, or provide free text if none fit:
                Italian, French-Canadian, Canadian, French, American, Mexican, Spanish, Greek, Mediterranean, Middle-Eastern, Indian, Chinese, Japanese, Korean, Thai, Vietnamese, Caribbean, Latin American

                Meal Types: Select all applicable meal slots from:
                Breakfast, Brunch, Snack, Lunch, Supper, Dessert, Appetizer, Beverage
                (Note: Map "Dinner" to "Supper")

                Primary Meal Type: Select the single primary meal slot from the selected meal types.

                Vegetarian: {{vegetarianPolicy?.BuildPromptRules() ?? "Return true only when ingredients establish the recipe is vegetarian. Eggs and ordinary dairy are vegetarian. Use ingredients, never the title alone. Return null when insufficient."}}

                Return a JSON object exactly matching this schema:
                {
                  "cuisineType": "string",
                  "mealTypes": ["string"],
                  "primaryMealType": "string",
                  "isVegetarian": true | false | null
                }

                Return ONLY valid JSON. No markdown. No explanation.

                Recipe Name: {{recipe.Name}}
                Recipe Description: {{recipe.Description}}
                Recipe Ingredients: {{recipe.Ingredients}}
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
                isVegetarian = result.IsVegetarian;

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
        // Only a concrete response changes the WFS-owned fact. A failed or malformed
        // result must not turn unknown into false or overwrite a valid prior result.
        if (isVegetarian is bool classifiedVegetarian)
        {
            recipe.IsVegetarian = classifiedVegetarian;
        }
        recipe.UpdatedAt = clock.UtcNow;

        if (persist) await db.SaveChangesAsync(ct);

        logger.LogInformation("CategorizeRecipe: categorized recipe {RecipeId} (Category: {Category}, CuisineType: {CuisineType}, MealTypes: {MealTypes})",
            recipe.Id, recipe.Category, recipe.CuisineType, string.Join(", ", recipe.MealTypes));

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
