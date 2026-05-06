namespace RecipeApi.Models;

/// <summary>
/// Per-recipe Health Canada FOP "High in" flags.
/// Computed from raw_metadata.nutrition at import time. null is the common case —
/// nutrition is only present when the source URL published structured schema.org nutrition markup.
/// Synthesized recipes, photo imports, and most blog imports produce null.
/// Phase 2 CNF integration fills gaps via forceReclassify.
/// Never inferred or guessed by the LLM.
/// </summary>
public record FopFlags(
    bool HighInSaturatedFat,
    bool HighInSugars,
    bool HighInSodium
);
