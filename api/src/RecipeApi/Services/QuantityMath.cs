using RecipeApi.Dto;
using System.Globalization;
using System.Numerics;
using System.Text;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

/// <summary>Clean exact rational arithmetic and parsing for grocery and portion quantities.</summary>
public static class QuantityMath
{
    public static GroceryQuantity? Scale(GroceryQuantity? value, int target, int basis)
    {
        if (value is null || target < 0 || basis <= 0) return null;
        GroceryRational? Apply(GroceryRational original) => Make(BigInteger.Parse(original.N, CultureInfo.InvariantCulture) * target,
            BigInteger.Parse(original.D, CultureInfo.InvariantCulture) * basis);
        if (value.Kind == "scalar") return Scalar(Apply(value.Value!));
        var min = Apply(value.Min!);
        var max = Apply(value.Max!);
        return min is null || max is null ? null : new("range", Min: min, Max: max);
    }

    public static GroceryQuantity? Add(GroceryQuantity? left, GroceryQuantity? right)
    {
        if (left is null) return right;
        if (right is null) return left;
        var min = AddRational(left.Value ?? left.Min!, right.Value ?? right.Min!);
        var max = AddRational(left.Value ?? left.Max!, right.Value ?? right.Max!);
        return min is null || max is null ? null : left.Kind == "scalar" && right.Kind == "scalar"
            ? new("scalar", min) : new("range", Min: min, Max: max);
    }

    public static GroceryQuantity? Multiply(GroceryQuantity? value, GroceryRational factor)
    {
        if (!IsCanonical(value) || !IsCanonicalRational(factor)) return null;
        GroceryRational? Apply(GroceryRational original) => Make(
            BigInteger.Parse(original.N, CultureInfo.InvariantCulture) * BigInteger.Parse(factor.N, CultureInfo.InvariantCulture),
            BigInteger.Parse(original.D, CultureInfo.InvariantCulture) * BigInteger.Parse(factor.D, CultureInfo.InvariantCulture));
        if (value!.Kind == "scalar") return Scalar(Apply(value.Value!));
        var min = Apply(value.Min!);
        var max = Apply(value.Max!);
        return min is null || max is null ? null : new("range", Min: min, Max: max);
    }

    // Subtract a known scalar from a scalar or a proven correlated range.
    // Callers must establish the relationship; independent ranges are unsupported.
    public static GroceryQuantity? SubtractScalar(GroceryQuantity? value, GroceryQuantity? scalar)
    {
        if (!IsCanonical(value) || !IsCanonical(scalar) || scalar!.Kind != "scalar") return null;
        var right = scalar.Value!;
        GroceryRational? Apply(GroceryRational left) => Make(
            BigInteger.Parse(left.N, CultureInfo.InvariantCulture) * BigInteger.Parse(right.D, CultureInfo.InvariantCulture)
                - BigInteger.Parse(right.N, CultureInfo.InvariantCulture) * BigInteger.Parse(left.D, CultureInfo.InvariantCulture),
            BigInteger.Parse(left.D, CultureInfo.InvariantCulture) * BigInteger.Parse(right.D, CultureInfo.InvariantCulture));
        if (value!.Kind == "scalar") return Scalar(Apply(value.Value!));
        var min = Apply(value.Min!); var max = Apply(value.Max!);
        return min is null || max is null ? null : new("range", Min: min, Max: max);
    }

    public static GroceryQuantity? Parse(string text)
    {
        if (text.Length > 256) return null;
        text = Normalize(text);
        var range = Regex.Match(text, @"^(.+?)(?<![eE])\s*[-–]\s*(.+)$", RegexOptions.CultureInvariant);
        if (range.Success)
        {
            var min = HumanScalar(range.Groups[1].Value);
            var max = HumanScalar(range.Groups[2].Value);
            return min is not null && max is not null && Compare(min, max) <= 0
                ? new("range", Min: min, Max: max) : null;
        }
        return Scalar(HumanScalar(text));
    }

    public static bool IsCanonical(GroceryQuantity? value) => value switch
    {
        { Kind: "scalar", Value: { } scalar, Min: null, Max: null } => IsCanonicalRational(scalar),
        { Kind: "range", Value: null, Min: { } min, Max: { } max } =>
            IsCanonicalRational(min) && IsCanonicalRational(max) && Compare(min, max) <= 0,
        _ => false,
    };

    private static bool IsCanonicalRational(GroceryRational value)
    {
        // Persisted operands are canonical ASCII integer strings, not human amount
        // notation. Validate their bounded spelling before parsing; malformed
        // acknowledgements must remain unprovable rather than abort recompute.
        static bool Digits(string? text) => text is { Length: > 0 and <= 38 }
            && (text.Length == 1 || text[0] != '0') && text.All(c => c is >= '0' and <= '9');
        return Digits(value.N) && Digits(value.D) && value.D != "0"
            && BigInteger.GreatestCommonDivisor(BigInteger.Parse(value.N, CultureInfo.InvariantCulture),
                BigInteger.Parse(value.D, CultureInfo.InvariantCulture)) == BigInteger.One;
    }

    private static GroceryQuantity? Scalar(GroceryRational? value) => value is null ? null : new("scalar", value);

    private static GroceryRational? HumanScalar(string text)
    {
        // Explicit amount grammar only; never scan numbers embedded in prose.
        var fractions = new Dictionary<char, string>
        {
            ['¼'] = "1/4",
            ['½'] = "1/2",
            ['¾'] = "3/4",
            ['⅐'] = "1/7",
            ['⅑'] = "1/9",
            ['⅒'] = "1/10",
            ['⅓'] = "1/3",
            ['⅔'] = "2/3",
            ['⅕'] = "1/5",
            ['⅖'] = "2/5",
            ['⅗'] = "3/5",
            ['⅘'] = "4/5",
            ['⅙'] = "1/6",
            ['⅚'] = "5/6",
            ['⅛'] = "1/8",
            ['⅜'] = "3/8",
            ['⅝'] = "5/8",
            ['⅞'] = "7/8",
        };
        var expanded = new StringBuilder();
        foreach (var c in text)
        {
            if (fractions.TryGetValue(c, out var fraction))
            {
                if (expanded.Length > 0 && char.IsDigit(expanded[^1])) expanded.Append(' ');
                expanded.Append(fraction);
            }
            else expanded.Append(c);
        }
        text = Normalize(expanded.ToString());
        var fractionMatch = Regex.Match(text, @"^(?:([0-9]+) )?([0-9]+)/([0-9]+)$", RegexOptions.CultureInvariant);
        if (fractionMatch.Success)
        {
            var whole = fractionMatch.Groups[1].Success ? BigInteger.Parse(fractionMatch.Groups[1].Value, CultureInfo.InvariantCulture) : BigInteger.Zero;
            var n = BigInteger.Parse(fractionMatch.Groups[2].Value, CultureInfo.InvariantCulture);
            var d = BigInteger.Parse(fractionMatch.Groups[3].Value, CultureInfo.InvariantCulture);
            return Make(whole * d + n, d);
        }
        if (!Regex.IsMatch(text, @"^[0-9]+(?:[.,][0-9]+)?(?:[eE][+-]?[0-9]+)?$", RegexOptions.CultureInvariant)) return null;
        if (Regex.IsMatch(text, @"^[1-9][0-9]*,[0-9]{3}$", RegexOptions.CultureInvariant)) return null;
        return RecordedNumber(text.Replace(',', '.'));
    }

    private static GroceryRational? RecordedNumber(string token)
    {
        if (token.Length > 256) return null;
        var negative = token.StartsWith('-');
        if (negative) token = token[1..];
        var match = Regex.Match(token, @"^([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$", RegexOptions.CultureInvariant);
        if (!match.Success || (match.Groups[3].Success && !int.TryParse(match.Groups[3].Value, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out _))) return null;
        var exponent = match.Groups[3].Success ? int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture) : 0;
        if (exponent is < -76 or > 76) return null;
        var digits = match.Groups[1].Value + match.Groups[2].Value;
        var scale = match.Groups[2].Length - exponent;
        if (scale is < -76 or > 76) return null;
        var n = BigInteger.Parse(digits, CultureInfo.InvariantCulture);
        if (negative && !n.IsZero) return null;
        return scale >= 0 ? Make(n, BigInteger.Pow(10, scale)) : Make(n * BigInteger.Pow(10, -scale), BigInteger.One);
    }

    private static GroceryRational? Make(BigInteger n, BigInteger d)
    {
        if (n < 0 || d <= 0) return null;
        var gcd = BigInteger.GreatestCommonDivisor(n, d);
        n /= gcd;
        d /= gcd;
        var numerator = n.ToString(CultureInfo.InvariantCulture);
        var denominator = d.ToString(CultureInfo.InvariantCulture);
        return numerator.Length <= 38 && denominator.Length <= 38 ? new(numerator, denominator) : null;
    }

    private static GroceryRational? AddRational(GroceryRational left, GroceryRational right) => Make(
        BigInteger.Parse(left.N, CultureInfo.InvariantCulture) * BigInteger.Parse(right.D, CultureInfo.InvariantCulture)
            + BigInteger.Parse(right.N, CultureInfo.InvariantCulture) * BigInteger.Parse(left.D, CultureInfo.InvariantCulture),
        BigInteger.Parse(left.D, CultureInfo.InvariantCulture) * BigInteger.Parse(right.D, CultureInfo.InvariantCulture));

    private static int Compare(GroceryRational left, GroceryRational right) =>
        (BigInteger.Parse(left.N, CultureInfo.InvariantCulture) * BigInteger.Parse(right.D, CultureInfo.InvariantCulture))
            .CompareTo(BigInteger.Parse(right.N, CultureInfo.InvariantCulture) * BigInteger.Parse(left.D, CultureInfo.InvariantCulture));

    private static string Normalize(string value) => Regex.Replace(value.Normalize(NormalizationForm.FormC), @"\s+", " ").Trim();
}
