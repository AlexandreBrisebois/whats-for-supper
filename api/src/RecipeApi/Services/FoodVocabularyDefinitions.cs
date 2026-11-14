using RecipeApi.Dto;
using System.Security.Cryptography;
using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

public sealed record FoodVocabularyReference(string Revision, string Sha256);
public sealed record FoodVocabularyDocument(int Version, string Revision, string SourceRef,
    CurrentRecoveryUnit[] Units, CurrentRecoveryDictionaryRelease[] Releases);
public sealed record FoodVocabularyMatch(string DictionaryRevision, CurrentRecoveryFood Food);

// Raw operation authority is owned, never an alias to provider/storage buffers.
public sealed class FoodVocabularyCapture
{
    private readonly byte[] bytes;
    public FoodVocabularyReference Reference { get; }
    public int ResolverPolicyVersion { get; }
    public byte[] RawBytes => bytes.ToArray();
    [JsonConstructor]
    public FoodVocabularyCapture(FoodVocabularyReference reference, int resolverPolicyVersion, byte[] rawBytes)
    {
        Reference = reference;
        ResolverPolicyVersion = resolverPolicyVersion;
        bytes = rawBytes?.ToArray() ?? throw new InvalidDataException("Vocabulary bytes are absent.");
    }
    public FoodVocabularyDefinitions Definitions()
    {
        FoodVocabularyDefinitions.ValidateReference(Reference);
        if (ResolverPolicyVersion != 1 || FoodVocabularyDefinitions.Sha256(bytes) != Reference.Sha256)
            throw new InvalidDataException("Captured vocabulary policy or raw hash differs.");
        var definitions = FoodVocabularyDefinitions.Read(bytes);
        if (definitions.Revision != Reference.Revision) throw new InvalidDataException("Vocabulary revision differs from its reference.");
        return definitions;
    }
}

public sealed class FoodVocabularyAuthority
{
    private readonly FoodVocabularyCapture[] captures;
    public FoodVocabularyReference? ActiveRef { get; }
    public FoodVocabularyCapture[] Captures => captures.ToArray();
    [JsonConstructor]
    public FoodVocabularyAuthority(FoodVocabularyReference? activeRef, FoodVocabularyCapture[] captures)
    {
        ActiveRef = activeRef;
        this.captures = captures?.ToArray() ?? throw new InvalidDataException("Captured vocabulary documents are absent.");
    }
    public void Validate()
    {
        var seen = new HashSet<FoodVocabularyReference>();
        var revisions = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in Captures)
        {
            if (item is null || !seen.Add(item.Reference)) throw new InvalidDataException("Duplicate vocabulary authority.");
            _ = item.Definitions();
            if (!revisions.Add(item.Reference.Revision)) throw new InvalidDataException("Conflicting vocabulary revision.");
        }
        if (ActiveRef is not null && !seen.Contains(ActiveRef)) throw new InvalidDataException("Active vocabulary document is absent.");
    }
    public FoodVocabularyDefinitions? ActiveDefinitions()
    {
        Validate();
        return ActiveRef is null ? null : Captures.Single(x => x.Reference == ActiveRef).Definitions();
    }
    public FoodVocabularyCapture Find(FoodVocabularyReference reference)
    {
        Validate();
        return Captures.SingleOrDefault(x => x.Reference == reference)
            ?? throw new InvalidDataException("Required retained vocabulary authority is absent.");
    }
}

// The live version1 codec reuses recovery's definition records. Historical
// archive/V1/V3 validators retain their original policy and wire derivation.
public sealed class FoodVocabularyDefinitions
{
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };
    private readonly FoodVocabularyDocument document;
    private readonly Dictionary<string, FoodVocabularyMatch?> aliases = new(StringComparer.Ordinal);
    private readonly Dictionary<(string, Guid), CurrentRecoveryFood> foods = [];
    public string Revision => document.Revision;
    public static string Sha256(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));
    public static string MatchKey(string text) => Regex.Replace(text.Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant(), @"\s+", " ");
    internal static void Require([DoesNotReturnIf(false)] bool valid) { if (!valid) throw new InvalidDataException("Invalid food vocabulary authority."); }
    internal static void ValidateReference(FoodVocabularyReference? reference) => Require(reference is not null
        && Regex.IsMatch(reference.Revision ?? "", @"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$", RegexOptions.CultureInvariant)
        && Regex.IsMatch(reference.Sha256 ?? "", @"^[a-f0-9]{64}$", RegexOptions.CultureInvariant));

    internal static T ReadStrict<T>(string raw)
    {
        try
        {
            using var parsed = JsonDocument.Parse(raw);
            void Unique(JsonElement value)
            {
                if (value.ValueKind == JsonValueKind.Object)
                {
                    var names = new HashSet<string>(StringComparer.Ordinal);
                    foreach (var property in value.EnumerateObject())
                    {
                        Require(names.Add(property.Name));
                        if (property.Name is "id" or "recipeId" or "ingredientLineId" or "foodId" or "operationId" or "decidingOperationId"
                            && property.Value.ValueKind == JsonValueKind.String && Guid.TryParse(property.Value.GetString(), out var id))
                            Require(property.Value.GetString() == id.ToString("D"));
                        Unique(property.Value);
                    }
                }
                else if (value.ValueKind == JsonValueKind.Array) foreach (var item in value.EnumerateArray()) Unique(item);
            }
            Unique(parsed.RootElement);
            return parsed.RootElement.Deserialize<T>(Json) ?? throw new InvalidDataException("Missing food vocabulary facts.");
        }
        catch (JsonException error) { throw new InvalidDataException("Malformed food vocabulary facts.", error); }
    }

    public static FoodVocabularyDefinitions Read(byte[] bytes)
    {
        try { return new(ReadStrict<FoodVocabularyDocument>(new UTF8Encoding(false, true).GetString(bytes))); }
        catch (DecoderFallbackException error) { throw new InvalidDataException("Vocabulary is not valid UTF-8.", error); }
    }

    private FoodVocabularyDefinitions(FoodVocabularyDocument value)
    {
        document = value;
        static bool Text(string? text) => !string.IsNullOrWhiteSpace(text);
        static bool Locale(string? locale) => locale is "en" or "fr";
        ValidateReference(new(value.Revision, new string('0', 64)));
        Require(value.Version == 1 && Text(value.SourceRef) && value.Units is not null && value.Releases is { Length: > 0 });
        var unitIds = new HashSet<string>(StringComparer.Ordinal);
        var unitAliases = new HashSet<(string, string)>();
        foreach (var unit in value.Units!)
        {
            Require(unit is not null && Text(unit.Id) && unitIds.Add(unit.Id) && unit.Aliases is { Length: > 0 }
                && unit.Family is "mass" or "volume" or "count" or "cup" or "tsp" or "tbsp"
                && unit.Factor is not null && unit.Factor.N != "0" && LegacyGroceryQuantity.IsCanonical(new("scalar", unit.Factor))
                && (unit.Family == "count" ? Text(unit.CountKind) : unit.CountKind is null));
            if (unit!.Family is "count" or "cup" or "tsp" or "tbsp") Require(unit.Factor == new GroceryRational("1", "1"));
            foreach (var alias in unit.Aliases)
            {
                Require(alias is not null && Locale(alias.Locale) && Text(alias.Text) && unitAliases.Add((alias.Locale, MatchKey(alias.Text))));
                var known = GroceryUnit.Read(alias!.Text);
                var family = known.Bucket switch { "g" => "mass", "ml" => "volume", "cup" => "cup", "tsp" => "tsp", "tbsp" => "tbsp", _ => null };
                if (family is not null) Require(unit.Family == family && LegacyGroceryQuantity.Parse($"{known.Numerator}/{known.Denominator}") == new GroceryQuantity("scalar", unit.Factor));
            }
        }
        Require(value.Releases!.All(x => x is not null) && value.Releases.Count(x => x.Revision == value.Revision) == 1);
        var releases = new HashSet<string>(StringComparer.Ordinal);
        var revisions = new Dictionary<(Guid, string), string>();
        var qualifiers = new Dictionary<Guid, string>();
        foreach (var release in value.Releases!)
        {
            Require(release is not null && Text(release.Revision) && Text(release.SourceRef) && releases.Add(release.Revision) && release.Foods is not null);
            var ids = new HashSet<Guid>();
            var exact = new Dictionary<(string, string), Guid>();
            foreach (var food in release!.Foods)
            {
                Require(food is not null && food.Id != Guid.Empty && ids.Add(food.Id) && Text(food.Revision) && food.Labels is not null
                    && (food.Labels.En is null || Text(food.Labels.En)) && (food.Labels.Fr is null || Text(food.Labels.Fr))
                    && food.Status is "validated" or "unresolved" or "retired" && food.Qualifiers is not null
                    && food.Qualifiers.All(x => Text(x.Key) && Text(x.Value)) && food.Aliases is not null);
                if (food!.Status == "validated") Require(food.Labels.En is not null || food.Labels.Fr is not null);
                var purchase = CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(food.Qualifiers, Json));
                if (qualifiers.TryGetValue(food.Id, out var prior)) Require(prior == purchase); else qualifiers.Add(food.Id, purchase);
                var content = CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(food, Json));
                if (revisions.TryGetValue((food.Id, food.Revision), out var previous)) Require(content == previous); else revisions.Add((food.Id, food.Revision), content);
                var unique = new HashSet<(string, string)>();
                foreach (var alias in food.Aliases)
                {
                    Require(alias is not null && Locale(alias.Locale) && Text(alias.Text) && alias.MatchKey == MatchKey(alias.Text)
                        && alias.Relation == "exact" && Text(alias.SourceRef) && alias.ReviewedAt != default && unique.Add((alias.Locale, alias.MatchKey)));
                    if (food.Status != "validated" || release.Revision != value.Revision) continue;
                    var key = (alias!.Locale, alias.MatchKey);
                    Require(!exact.TryGetValue(key, out var old) || old == food.Id);
                    exact[key] = food.Id;
                    var match = new FoodVocabularyMatch(release.Revision, food);
                    if (!aliases.TryGetValue(alias.MatchKey, out var existing)) aliases.Add(alias.MatchKey, match);
                    else if (existing?.Food.Id != food.Id) aliases[alias.MatchKey] = null; // Ambiguity never selects an arbitrary food.
                }
                foods.Add((release.Revision, food.Id), food);
            }
        }
    }

    public FoodVocabularyMatch? Resolve(string phrase)
    {
        if (!aliases.TryGetValue(MatchKey(phrase), out var match) || match is null) return null;
        return match with { Food = JsonSerializer.Deserialize<CurrentRecoveryFood>(JsonSerializer.Serialize(match.Food, Json), Json)! };
    }
    internal FoodVocabularyMatch? ResolveInRelease(string phrase, string release)
    {
        var key = MatchKey(phrase);
        var matches = foods.Where(x => x.Key.Item1 == release && x.Value.Status == "validated"
            && x.Value.Aliases.Any(alias => alias.MatchKey == key)).Select(x => x.Value).ToArray();
        return matches.Select(x => x.Id).Distinct().Count() == 1
            ? new(release, JsonSerializer.Deserialize<CurrentRecoveryFood>(JsonSerializer.Serialize(matches[0], Json), Json)!) : null;
    }
    internal CurrentRecoveryFood RequireFood(string release, Guid id, string foodRevision)
    {
        Require(foods.TryGetValue((release, id), out var food) && food.Status == "validated" && food.Revision == foodRevision);
        return food!;
    }
    internal void ValidateCompatible(FoodVocabularyDefinitions previous)
    {
        foreach (var ((release, id), food) in foods)
        {
            foreach (var prior in previous.foods.Values.Where(x => x.Id == id))
            {
                Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(food.Qualifiers, Json))
                    == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(prior.Qualifiers, Json)));
                if (food.Revision == prior.Revision)
                    Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(food, Json))
                        == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(prior, Json)));
            }
            if (previous.foods.TryGetValue((release, id), out var sameRelease))
                Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(food, Json))
                    == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(sameRelease, Json)));
        }
    }
}
