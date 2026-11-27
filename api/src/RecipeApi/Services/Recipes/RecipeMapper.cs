using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services.Recipes;

public static class RecipeMapper
{
    public static RecipeDto MapToDto(Recipe r)
    {
        var sourceType = !string.IsNullOrEmpty(r.SourceUrl) ? "url" : (r.ImageCount > 0 ? "photos" : "synthesized");

        var content = StructuredRecipeContentStore.Read(r);
        return new RecipeDto
        {
            ContentSchemaVersion = content?.ContentSchemaVersion,
            ContentRevision = content?.ContentRevision,
            IngredientLines = content?.IngredientLines.ToList(),
            InstructionSections = content?.InstructionSections.ToList(),
            Id = r.Id,
            Rating = (int)r.Rating,
            Notes = r.Notes,
            AddedBy = r.AddedBy,
            Name = r.Name,
            TotalTime = r.TotalTime,
            SourceUrl = r.SourceUrl,
            Description = r.Description,
            Category = r.Category,
            CuisineType = r.CuisineType,
            MealTypes = r.MealTypes,
            ImageUrl = $"/api/recipes/{r.Id}/hero",
            Images = Enumerable.Range(0, r.ImageCount).ToList(),
            Ingredients = content is null
                ? DeserializeIngredients(r.Ingredients)
                : content.IngredientLines.Select(StructuredRecipeContentStore.Render).ToList(),
            Servings = r.Servings,
            RecipeInstructions = content is null
                ? ExtractRecipeInstructions(r.RawMetadata)
                : RenderStructuredInstructions(content),
            IsVegetarian = r.IsVegetarian ?? false,
            IsDiscoverable = r.IsDiscoverable,
            CreatedAt = r.CreatedAt,
            DeletedAt = r.DeletedAt,
            SourceType = sourceType,
            CanReimport = CanReimport(r),
            ImageCount = r.ImageCount,
            FinishedDishIndex = r.FinishedDishIndex,
            IsReady = r.IsReady
        };
    }

    public static bool CanReimport(Recipe recipe) =>
        !string.IsNullOrEmpty(recipe.SourceUrl) || recipe.ImageCount > 0;

    /// <summary>
    /// Deserializes the ingredients JSON column, tolerating both string arrays
    /// (["flour", "eggs"]) and object arrays ([{"name":"flour",...}]) from legacy data.
    /// </summary>
    public static List<string> DeserializeIngredients(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        var trimmed = json.Trim();
        if (!trimmed.StartsWith('[') || !trimmed.EndsWith(']'))
        {
            // Not an array? Return as single element if not empty, or empty list
            return string.IsNullOrEmpty(trimmed) ? [] : [trimmed];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            try
            {
                // Fallback: ingredients stored as objects — serialize each element back to a string
                // This handles the "StartObject" error when the list contains objects instead of strings
                var elements = JsonSerializer.Deserialize<List<JsonElement>>(json) ?? [];
                return elements.Select(e =>
                {
                    if (e.ValueKind == JsonValueKind.String) return e.GetString() ?? "";
                    if (e.ValueKind == JsonValueKind.Object && e.TryGetProperty("name", out var nameProp))
                    {
                        return nameProp.GetString() ?? e.GetRawText();
                    }
                    return e.GetRawText();
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
            }
            catch
            {
                return [json]; // Total failure? Return raw JSON as single string
            }
        }
    }

    internal static async Task<RecipeDto> MapDetailDtoAsync(RecipeDbContext db, Recipe recipe)
    {
        var report = await db.RecipeImportReports.AsNoTracking()
            .SingleOrDefaultAsync(item => item.RecipeId == recipe.Id);
        Guid? suspectedDuplicateId = null;
        if (report is not null && report.Reasons.Contains("duplicate"))
        {
            var match = await DuplicateRecipeDetector.FindBestMatchAsync(db, recipe);
            suspectedDuplicateId = match?.RecipeId;
        }
        var dto = MapToDto(recipe);
        dto.ImportIssue = RecipeImportReportService.ToPublicDto(report, suspectedDuplicateId);
        return dto;
    }

    internal static RecipeDetailResponseDto MapToDetailResponse(IClock clock, Recipe recipe) =>
        new()
        {
            UpdatedAt = clock.UtcNow,
            Recipe = MapToDto(recipe)
        };

    private static object RenderStructuredInstructions(StructuredRecipeContent content) =>
        content.InstructionSections.Select(section => new Dictionary<string, object?>
        {
            ["@type"] = "HowToSection",
            ["name"] = section.Name,
            ["itemListElement"] = section.Steps.Select(step => new Dictionary<string, object?>
            {
                ["@type"] = "HowToStep",
                ["text"] = step.Text
            }).ToArray()
        }).ToArray();

    private static object? ExtractRecipeInstructions(string? rawMetadataJson)
    {
        if (string.IsNullOrWhiteSpace(rawMetadataJson)) return null;

        try
        {
            using var doc = JsonDocument.Parse(rawMetadataJson);
            if (doc.RootElement.TryGetProperty("recipeInstructions", out var instructions))
            {
                return JsonSerializer.Deserialize<object>(instructions.GetRawText());
            }
        }
        catch
        {
            // Silently return null if parsing fails
        }

        return null;
    }
}
