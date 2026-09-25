using System.Text.Json;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Quiet, ingredient-only classifier used by the migration backfill.</summary>
public sealed class ClassifyRecipeVegetarianProcessor(
    RecipeDbContext db,
    IChatClient chatClient,
    VegetarianClassificationPolicy policy,
    VegetarianClassificationWriter writer,
    IClock clock) : IWorkflowProcessor
{
    public string ProcessorName => "ClassifyRecipeVegetarian";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var recipeId = ReadRecipeId(task.Payload);
        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is null) return new { recipeId, outcome = "not-found" };

        var ingredients = ReadIngredients(recipe.Ingredients).ToArray();
        if (ingredients.Length == 0) return new { recipeId, outcome = "unknown-no-ingredients" };

        try
        {
            var prompt = $$"""
                You classify one observable recipe fact. {{policy.BuildPromptRules()}}
                Return only valid JSON exactly matching { "isVegetarian": true | false | null }.
                Ingredients: {{string.Join("\n", ingredients)}}
                """;
            var response = await chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var result = JsonSerializer.Deserialize<Result>(response.Text?.Trim() ?? "", new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (result?.IsVegetarian is not bool isVegetarian)
                return new { recipeId, outcome = "unknown-insufficient-ingredients" };

            writer.ApplySuccess(recipe, isVegetarian, CategorizeRecipeProcessor.VegetarianClassifierVersion, clock.UtcNow);
            recipe.UpdatedAt = clock.UtcNow;
            await db.SaveChangesAsync(ct);
            return new { recipeId, outcome = "classified", isVegetarian };
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            writer.ApplyFailure(recipe, ex.Message, clock.UtcNow);
            await db.SaveChangesAsync(ct);
            throw;
        }
    }

    private static Guid ReadRecipeId(string? payload)
    {
        using var json = JsonDocument.Parse(payload ?? throw new ArgumentException("Task payload is empty."));
        if (!json.RootElement.TryGetProperty("recipeId", out var id) || !id.TryGetGuid(out var recipeId))
            throw new ArgumentException("Task payload does not contain recipeId.");
        return recipeId;
    }

    private static IEnumerable<string> ReadIngredients(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) yield break;
        JsonDocument? document = null;
        try { document = JsonDocument.Parse(value); } catch (JsonException) { yield break; }
        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Array) yield break;
            foreach (var item in document.RootElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(item.GetString())) yield return item.GetString()!;
                else if (item.ValueKind == JsonValueKind.Object && item.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(name.GetString())) yield return name.GetString()!;
            }
        }
    }

    private sealed class Result { public bool? IsVegetarian { get; set; } }
}
