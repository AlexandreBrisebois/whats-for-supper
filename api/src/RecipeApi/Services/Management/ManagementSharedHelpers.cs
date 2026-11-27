using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal static class ManagementSharedHelpers
{
    private static readonly HashSet<string> RetiredRecipeBackupFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "isHealthyChoice",
        "dietaryProfile",
        "fopFlags",
        "fopClassification",
        "healthProfile",
        "healthEvent",
        "balanceSummary"
    };

    internal static readonly JsonSerializerOptions CycleIgnoreOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    internal static async Task WriteJsonAsync<T>(string path, T value, CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var json = JsonSerializer.Serialize(value, JsonDefaults.CamelCase);
        await File.WriteAllTextAsync(path, json, ct);
    }

    internal static async Task<T?> ReadJsonAsync<T>(string path, CancellationToken ct)
    {
        var json = await File.ReadAllTextAsync(path, ct);
        return JsonSerializer.Deserialize<T>(json, JsonDefaults.CamelCase);
    }

    internal static string SerializeRecipeBackup(Recipe recipe)
    {
        if (StructuredRecipeContentStore.Read(recipe) is { } content)
            return StructuredRecipeContentStore.ToSchemaOrgJson(content, recipe.RawMetadata, recipe.Name, recipe.Description);

        if (!string.IsNullOrWhiteSpace(recipe.RawMetadata))
        {
            var cleaned = RemoveRetiredRecipeFields(recipe.RawMetadata);
            try
            {
                using var doc = JsonDocument.Parse(cleaned);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                {
                    var node = JsonNode.Parse(cleaned)!.AsObject();
                    node["@context"] ??= "https://schema.org/";
                    node["@type"] ??= "Recipe";
                    if (!string.IsNullOrWhiteSpace(recipe.Name) && node["name"] is null) node["name"] = recipe.Name;
                    if (!string.IsNullOrWhiteSpace(recipe.Description) && node["description"] is null) node["description"] = recipe.Description;
                    if (recipe.Servings is > 0) node["recipeYield"] = $"{recipe.Servings} portions";
                    if (node["recipeIngredient"] is null && !string.IsNullOrWhiteSpace(recipe.Ingredients))
                    {
                        var list = RecipeService.DeserializeIngredients(recipe.Ingredients);
                        if (list.Count > 0) node["recipeIngredient"] = JsonSerializer.SerializeToNode(list);
                    }
                    return node.ToJsonString(new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });
                }
            }
            catch (JsonException) { }
        }

        var fallback = new SchemaOrgRecipe
        {
            Context = "https://schema.org/",
            Type = "Recipe",
            Name = recipe.Name ?? string.Empty,
            Description = recipe.Description,
            RecipeYield = recipe.Servings is > 0 ? $"{recipe.Servings} portions" : null,
            TotalTime = recipe.TotalTime,
            RecipeIngredient = RecipeService.DeserializeIngredients(recipe.Ingredients)
        };
        return JsonSerializer.Serialize(fallback, new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });
    }

    internal static string RemoveRetiredRecipeFields(string json)
    {
        var root = JsonNode.Parse(json);
        if (root is not JsonObject recipe)
            return json;
        var retiredFields = recipe.Select(property => property.Key).Where(RetiredRecipeBackupFields.Contains).ToArray();
        if (retiredFields.Length == 0)
            return json;
        foreach (var field in retiredFields)
            recipe.Remove(field);
        return recipe.ToJsonString(CycleIgnoreOptions);
    }

    internal static bool IsJsonArray(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        try
        {
            using var document = JsonDocument.Parse(value);
            return document.RootElement.ValueKind == JsonValueKind.Array;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    /// <summary>
    /// Escapes a CSV field value. If the value contains a comma, double-quote, or newline,
    /// it is wrapped in double-quotes with any internal double-quotes doubled.
    /// </summary>
    internal static string EscapeCsvField(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    internal static async Task<List<string[]>> ReadCsvRecordsAsync(string path, CancellationToken ct)
    {
        var text = await File.ReadAllTextAsync(path, ct);
        using var parser = new Microsoft.VisualBasic.FileIO.TextFieldParser(new StringReader(text))
        {
            HasFieldsEnclosedInQuotes = true,
            TrimWhiteSpace = false
        };
        parser.SetDelimiters(",");
        var records = new List<string[]>();
        while (!parser.EndOfData)
        {
            ct.ThrowIfCancellationRequested();
            try { records.Add(parser.ReadFields() ?? []); }
            catch (Microsoft.VisualBasic.FileIO.MalformedLineException)
            {
                // Preserve the existing merge policy: report/skip a malformed record.
                records.Add([parser.ErrorLine]);
            }
        }
        return records;
    }

    internal static void FillMissingMemberTimestamps(IEnumerable<FamilyMember> members, DateTimeOffset now)
    {
        foreach (var member in members)
        {
            if (member.CreatedAt == default) member.CreatedAt = now;
            if (member.UpdatedAt == default) member.UpdatedAt = now;
        }
    }
}

internal sealed record RecipeImportReportBackup(
    Guid RecipeId,
    string[] Reasons,
    string? Note,
    RecipeImportReportStatus Status,
    Guid? ReportedBy,
    Guid? UpdatedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    Guid? LastWorkflowInstanceId,
    DateTimeOffset? LastAttemptAt,
    DateTimeOffset? ReimportedAt,
    string? LastError)
{
    public static RecipeImportReportBackup FromEntity(RecipeImportReport report) => new(
        report.RecipeId,
        report.Reasons,
        report.Note,
        report.Status,
        report.ReportedBy,
        report.UpdatedBy,
        report.CreatedAt,
        report.UpdatedAt,
        report.LastWorkflowInstanceId,
        report.LastAttemptAt,
        report.ReimportedAt,
        report.LastError);
}
