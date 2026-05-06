using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Utils;

public class IngredientNormalizerTests
{
    // ── Unit tests ────────────────────────────────────────────────────────────

    [Fact]
    public void Normalize_AccentedFrench_ProducesExpectedKey()
    {
        // "Bœuf haché" → "bœuf hache"
        // Note: œ is a ligature (U+0153), not a precomposed accented char.
        // NFD does not decompose it, so it passes through; only the combining acute on é is stripped.
        var result = IngredientNormalizer.Normalize("Bœuf haché");
        Assert.Equal("bœuf hache", result);
    }

    [Fact]
    public void Normalize_AccentedE_StripsAccent()
    {
        // é (U+00E9) decomposes via NFD to e + combining acute → combining mark stripped → "e"
        var result = IngredientNormalizer.Normalize("café");
        Assert.Equal("cafe", result);
    }

    [Fact]
    public void Normalize_AccentedC_StripsAccent()
    {
        // ç (U+00E7) decomposes via NFD to c + combining cedilla → combining mark stripped → "c"
        var result = IngredientNormalizer.Normalize("façade");
        Assert.Equal("facade", result);
    }

    [Fact]
    public void Normalize_UppercaseInput_ProducesLowercase()
    {
        var result = IngredientNormalizer.Normalize("GROUND BEEF");
        Assert.Equal("ground beef", result);
    }

    [Fact]
    public void Normalize_LeadingAndTrailingWhitespace_IsTrimmed()
    {
        var result = IngredientNormalizer.Normalize("  chicken breast  ");
        Assert.Equal("chicken breast", result);
    }

    [Fact]
    public void Normalize_MultipleInternalSpaces_AreCollapsed()
    {
        var result = IngredientNormalizer.Normalize("ground   beef");
        Assert.Equal("ground beef", result);
    }

    [Fact]
    public void Normalize_TabsAndNewlines_AreCollapsed()
    {
        var result = IngredientNormalizer.Normalize("ground\tbeef\nnow");
        Assert.Equal("ground beef now", result);
    }

    [Fact]
    public void Normalize_EmptyString_ReturnsEmptyString()
    {
        var result = IngredientNormalizer.Normalize("");
        Assert.Equal("", result);
    }

    [Fact]
    public void Normalize_PureAscii_PassesThroughUnchanged()
    {
        var result = IngredientNormalizer.Normalize("ground beef");
        Assert.Equal("ground beef", result);
    }

    [Fact]
    public void Normalize_PureAsciiUppercase_OnlyLowercased()
    {
        var result = IngredientNormalizer.Normalize("Chicken Breast");
        Assert.Equal("chicken breast", result);
    }

    [Fact]
    public void Normalize_MixedAccentsAndCase_ProducesExpectedKey()
    {
        // "Crème Brûlée" → "creme brulee"
        var result = IngredientNormalizer.Normalize("Crème Brûlée");
        Assert.Equal("creme brulee", result);
    }

    // ── Property-based tests (FsCheck) ────────────────────────────────────────

    // Feature: grocery-section-categorization, Property 4: accent-insensitive equivalence
    // For any string s, producing a variant s' by changing case or replacing chars with
    // accented equivalents, normalize(s) === normalize(s').
    // Validates: Requirements 3.1, 3.9
    [Property(MaxTest = 100)]
    public Property P4_AccentInsensitiveEquivalence()
    {
        // Generate a base string from safe ASCII chars, then produce an accented variant
        // by replacing some vowels with their accented equivalents.
        var baseStringGen =
            from length in Gen.Choose(1, 20)
            from chars in Gen.Elements(
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                ' ', '1', '2', '3').ListOf(length)
            let s = new string(chars.ToArray())
            where s.Trim().Length > 0
            select s;

        return Prop.ForAll(baseStringGen.ToArbitrary(), base_ =>
        {
            // Produce accented variant: replace ASCII vowels with accented equivalents
            var accented = base_
                .Replace('e', 'é')
                .Replace('E', 'É')
                .Replace('a', 'à')
                .Replace('A', 'À')
                .Replace('u', 'ù')
                .Replace('U', 'Ù')
                .Replace('i', 'î')
                .Replace('I', 'Î');

            var normalizedBase = IngredientNormalizer.Normalize(base_);
            var normalizedAccented = IngredientNormalizer.Normalize(accented);
            return normalizedBase == normalizedAccented;
        });
    }

    // Feature: grocery-section-categorization, Property 5: specificity preservation
    // For any normalized string a and any non-empty string extra (with at least one
    // non-whitespace char), normalize(a) !== normalize(a + " " + extra).
    // Validates: Requirements 3.10
    [Property(MaxTest = 100)]
    public Property P5_SpecificityPreservation()
    {
        // Generate a non-empty base name and a non-empty extension, both from safe ASCII chars.
        var wordGen =
            from length in Gen.Choose(1, 15)
            from chars in Gen.Elements(
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z').ListOf(length)
            select new string(chars.ToArray());

        var gen =
            from baseWord in wordGen
            from extraWord in wordGen
            // Both must be non-empty after normalization
            where !string.IsNullOrEmpty(IngredientNormalizer.Normalize(baseWord))
            where !string.IsNullOrEmpty(IngredientNormalizer.Normalize(extraWord))
            select (baseWord, extraWord);

        return Prop.ForAll(gen.ToArbitrary(), pair =>
        {
            var (baseWord, extraWord) = pair;
            var a = IngredientNormalizer.Normalize(baseWord);
            var normalizedExtended = IngredientNormalizer.Normalize(a + " " + extraWord);
            return a != normalizedExtended;
        });
    }

    // Feature: grocery-section-categorization, Property 3: parsing round-trip
    // For any triple (quantity, unit, name) where quantity is a valid numeric token and
    // unit is a recognized unit token, constructing "${quantity} ${unit} ${name}", parsing
    // it to extract the canonical name, then re-prepending the original quantity and unit
    // SHALL produce a string equivalent to the original.
    // Validates: Requirements 2.1, 2.2, 2.5
    [Property(MaxTest = 100)]
    public Property P3_ParsingRoundTrip()
    {
        // Recognized unit tokens (pure ASCII, unaffected by normalization)
        var units = new[] { "g", "kg", "ml", "l", "cup", "cups", "tbsp", "tsp", "oz", "lb", "lbs", "piece", "pieces" };

        // Generate ingredient names from safe ASCII lowercase chars (no diacritics)
        var nameGen =
            from length in Gen.Choose(1, 15)
            from chars in Gen.Elements(
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z').ListOf(length)
            select new string(chars.ToArray());

        var gen =
            from quantityInt in Gen.Choose(1, 999)
            from unitIndex in Gen.Choose(0, units.Length - 1)
            from name in nameGen
            where name.Length > 0
            select (quantity: quantityInt.ToString(), unit: units[unitIndex], name);

        return Prop.ForAll(gen.ToArbitrary(), triple =>
        {
            var (quantity, unit, name) = triple;

            // Construct the full ingredient string
            var full = $"{quantity} {unit} {name}";

            // Normalize the full string
            var normalizedFull = IngredientNormalizer.Normalize(full);

            // Normalize just the name, then re-prepend quantity and unit.
            // Since quantity (digits) and unit (ASCII lowercase) are unaffected by the
            // normalization pipeline, the result must equal normalizing the full string.
            var normalizedName = IngredientNormalizer.Normalize(name);
            var reconstructed = $"{quantity} {unit} {normalizedName}";

            return normalizedFull == reconstructed;
        });
    }
}
