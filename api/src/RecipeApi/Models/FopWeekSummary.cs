namespace RecipeApi.Models;

/// <summary>
/// Count of dinner slots this week that triggered each Health Canada FOP "High in" flag.
/// Computed from recipes' FopFlags (which come from raw_metadata.nutrition).
/// null FopFlags (nutrition not published by source) contribute 0 to all counts.
/// Expect most recipes to have null until Phase 2 CNF integration runs forceReclassify.
/// Phase 2 upgrades accuracy via CNF-sourced FopFlags.
/// </summary>
public record FopWeekSummary(
    int HighInSaturatedFatDays,
    int HighInSugarsDays,
    int HighInSodiumDays
);
