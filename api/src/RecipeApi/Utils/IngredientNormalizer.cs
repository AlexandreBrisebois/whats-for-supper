using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace RecipeApi.Utils;

public static class IngredientNormalizer
{
    private static readonly Regex CollapseWhitespace = new(@"\s+", RegexOptions.Compiled);

    /// <summary>
    /// Normalizes a raw ingredient name to a canonical key.
    /// Pipeline: NFD decompose → strip Unicode Mn category chars → lowercase → trim/collapse whitespace.
    /// Examples: "Bœuf haché" → "boeuf hache", "ground beef" → "ground beef".
    /// </summary>
    /// <param name="raw">The raw ingredient name string.</param>
    /// <returns>The normalized key string.</returns>
    public static string Normalize(string raw)
    {
        if (string.IsNullOrEmpty(raw))
            return raw;

        // Step 1: NFD decomposition (decomposes precomposed characters, e.g. é → e + combining acute)
        var decomposed = raw.Normalize(NormalizationForm.FormD);

        // Step 2: Strip all combining diacritical marks (Unicode category Mn)
        var stripped = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                stripped.Append(ch);
        }

        // Step 3: Lowercase
        var lowered = stripped.ToString().ToLowerInvariant();

        // Step 4: Trim and collapse consecutive whitespace to a single space
        var normalized = CollapseWhitespace.Replace(lowered.Trim(), " ");

        return normalized;
    }
}
