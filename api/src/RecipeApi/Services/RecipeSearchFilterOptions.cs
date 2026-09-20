using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RecipeApi.Services;

/// <summary>Configuration-owned Main vocabulary and Search rediscovery interval.</summary>
public sealed class RecipeSearchFilterOptions
{
    public const string SectionName = "RecipeSearchFilters";
    public const int DefaultRediscoveryIntervalDays = 28;

    private static readonly HashSet<string> BuiltInMainIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "beef", "poultry", "pork", "fish", "pasta", "vegetarian"
    };

    private static readonly IReadOnlyList<RecipeSearchMainDefinition> DefaultMain =
    [
        new("beef", "beef", null),
        new("poultry", "poultry", null),
        new("pork", "pork", null),
        new("fish", "fish", null),
        new("pasta", "pasta", null),
        new("vegetarian", "vegetarian", null)
    ];

    public IReadOnlyList<RecipeSearchMainDefinition> Main { get; }
    public int RediscoveryIntervalDays { get; }

    public RecipeSearchFilterOptions(IConfiguration configuration, ILogger<RecipeSearchFilterOptions>? logger = null)
    {
        RecipeSearchFilterOptionsConfiguration? configured;
        try
        {
            configured = configuration.GetSection(SectionName).Get<RecipeSearchFilterOptionsConfiguration>();
        }
        catch (InvalidOperationException)
        {
            configured = null;
            logger?.LogWarning("Invalid {SectionName} configuration. Falling back to built-in defaults.", SectionName);
        }
        if (!TryNormalizeMain(configured?.Main, out var main))
        {
            main = DefaultMain;
            if (configured?.Main is { Count: > 0 })
                logger?.LogWarning("Invalid {SectionName}:Main configuration. Falling back to built-in Main definitions.", SectionName);
        }

        Main = main;
        var interval = configured?.RediscoveryIntervalDays;
        RediscoveryIntervalDays = interval is >= 7 and <= 365
            ? interval.Value
            : DefaultRediscoveryIntervalDays;
    }

    private static bool TryNormalizeMain(
        List<RecipeSearchMainDefinitionConfiguration>? configured,
        out IReadOnlyList<RecipeSearchMainDefinition> main)
    {
        main = DefaultMain;
        if (configured is not { Count: > 0 }) return false;

        var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var normalized = new List<RecipeSearchMainDefinition>(configured.Count);
        foreach (var entry in configured)
        {
            var id = entry.Id?.Trim();
            var concept = entry.Concept?.Trim();
            var label = string.IsNullOrWhiteSpace(entry.Label) ? null : entry.Label.Trim();
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(concept) || !seenIds.Add(id)) return false;
            if (!BuiltInMainIds.Contains(id) && label is null) return false;

            normalized.Add(new RecipeSearchMainDefinition(id, concept, BuiltInMainIds.Contains(id) ? null : label));
        }

        main = normalized;
        return true;
    }
}

public sealed class RecipeSearchFilterOptionsConfiguration
{
    public List<RecipeSearchMainDefinitionConfiguration>? Main { get; set; }
    public int? RediscoveryIntervalDays { get; set; }
}

public sealed class RecipeSearchMainDefinitionConfiguration
{
    public string? Id { get; set; }
    public string? Concept { get; set; }
    public string? Label { get; set; }
}

public sealed record RecipeSearchMainDefinition(string Id, string Concept, string? Label);
