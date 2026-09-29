using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace RecipeApi.Utils;

public static class IngredientNormalizer
{
    private static readonly Regex CollapseWhitespace = new(@"\s+", RegexOptions.Compiled);
    private static readonly Regex PunctuationSeparators = new(@"[,;:]", RegexOptions.Compiled);
    private static readonly Regex OptionalPluralSuffix = new(@"(?<!\p{L})(?<singular>\p{L}+)\s*\((?:s|es)\)(?!\p{L})", RegexOptions.Compiled);
    private static readonly Regex PitaOptionalPlural = new(@"(?<!\p{L})pita\s*\(s\)(?!\p{L})|(?<!\p{L})pitas(?!\p{L})", RegexOptions.Compiled);
    private static readonly Regex TomatoOptionalPlural = new(@"(?<!\p{L})tomato\s*\(es\)(?!\p{L})|(?<!\p{L})tomatoes(?!\p{L})", RegexOptions.Compiled);
    private static readonly Regex ZucchiniOptionalPlural = new(@"(?<!\p{L})zucchini\s*\(s\)(?!\p{L})|(?<!\p{L})zucchinis(?!\p{L})", RegexOptions.Compiled);
    private static readonly Regex GarlicClovePlural = new(@"(?<!\p{L})garlic\s+cloves(?!\p{L})", RegexOptions.Compiled);
    private static readonly Regex FrenchGarlicClovePlural = new(@"(?<!\p{L})gousses\s+d'ail(?!\p{L})", RegexOptions.Compiled);

    /// <summary>
    /// Normalizes a raw ingredient name to a canonical key.
    /// Pipeline: NFD decompose → strip Unicode Mn category chars → lowercase → normalize approved typography → trim/collapse whitespace.
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

        // Step 4: Normalize only approved typography and token-preserving punctuation.
        var typographyNormalized = NormalizeApprovedTypography(lowered);
        var punctuationNormalized = PunctuationSeparators.Replace(typographyNormalized, " ");

        // Step 5: Trim and collapse consecutive whitespace to a single space.
        var normalized = CollapseWhitespace.Replace(punctuationNormalized.Trim(), " ");

        // Step 6: Parenthesized (s)/(es) is mechanical notation; ordinary written plurals stay explicit.
        normalized = OptionalPluralSuffix.Replace(normalized, "${singular}");
        normalized = PitaOptionalPlural.Replace(normalized, "pita");
        normalized = TomatoOptionalPlural.Replace(normalized, "tomato");
        normalized = ZucchiniOptionalPlural.Replace(normalized, "zucchini");
        normalized = GarlicClovePlural.Replace(normalized, "garlic clove");
        normalized = FrenchGarlicClovePlural.Replace(normalized, "gousse d'ail");

        return normalized;
    }

    private static string NormalizeApprovedTypography(string value)
    {
        var normalized = new StringBuilder(value.Length);

        foreach (var character in value)
        {
            normalized.Append(character switch
            {
                '\u2018' or '\u2019' or '\u201B' or '\u02BC' or '\uFF07' => '\'',
                '\u2010' or '\u2011' or '\u2012' or '\u2013' or '\u2014' or '\u2212' or '\uFE63' or '\uFF0D' => '-',
                '\u00AE' => ' ',
                _ => character,
            });
        }

        return normalized.ToString();
    }
}
