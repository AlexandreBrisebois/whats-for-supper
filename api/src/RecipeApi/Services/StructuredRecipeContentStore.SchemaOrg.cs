using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class StructuredRecipeContentStore
{
    private static readonly JsonSerializerOptions IndentedCamelJson = new(JsonDefaults.CamelCase)
    {
        WriteIndented = true
    };

    private const string TolerantScalarPattern =
        @"(?:[0-9]+\s+[0-9]+/[0-9]+|[0-9]+\s*[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[0-9]+/[0-9]+|[0-9]+(?:[.,][0-9]+)?|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])";

    private const string TolerantUnitPattern =
        @"cuillères?\s+à\s+(?:soupe|thé|café)|cuillerées?\s+à\s+(?:soupe|thé|café)|" +
        @"c\.\s*à\s*(?:soupe|thé|café|s\.?|t\.?)|c\s+à\s+(?:soupe|thé|café|s|t)|" +
        @"tablespoons?|teaspoons?|tbsp\.?|tbsps|tsp\.?|tsps|tasses?|tasse\(s\)|cups?|cup\(s\)|" +
        @"millilit(?:er|re)s?|kilogram(?:me)?s?|milligram(?:me)?s?|decilit(?:er|re)s?|centilit(?:er|re)s?|" +
        @"gram(?:me)?s?|lit(?:er|re)s?|ounces?|pounds?|kg|mg|ml|cl|dl|oz|lbs?|g|l|" +
        @"boîtes?|cans?|sachets?|packets?|pincées?|pinche?s?|units?";

    [GeneratedRegex(
        @"^\s*(?<amt>" + TolerantScalarPattern + @"(?:\s*(?:[-–]|à|to)\s*" + TolerantScalarPattern + @")?)" +
        @"(?:\s*(?<unit>" + TolerantUnitPattern + @")(?![\p{L}\p{M}])(?:\s*\([^)]*\))?)?" +
        @"\s*(?:(?:of|de|du|des)\s+|d['’]\s*)?(?<rest>.+?)\s*$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex TolerantIngredientLineRegex();

    [GeneratedRegex(@"\s+(?:à|to)\s+", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex TolerantRangeConnectorRegex();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex TolerantWhitespaceRegex();

    internal static void RejectRetiredRecipeWrapper(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            throw new InvalidDataException("Recipe content must be a JSON object.");
        if (root.TryGetProperty("backupContentVersion", out _) || root.TryGetProperty("format", out _))
            throw new InvalidDataException("Unsupported or retired recipe wrapper envelope.");
    }

    public static void ValidateContent(StructuredRecipeContent content, bool retainedHistory = false, string? rawMetadata = null)
    {
        static InvalidDataException Invalid() => new("Unsupported or malformed structured recipe content.");

        try
        {
            if (content.ContentSchemaVersion != 2 || string.IsNullOrWhiteSpace(content.ContentRevision)
                || string.IsNullOrWhiteSpace(content.SourceRevision) || content.Servings is <= 0
                || content.IngredientLines is null || content.InstructionSections is null) throw Invalid();

            var ids = new HashSet<Guid>();
            void Identity(Guid id) { if (id == Guid.Empty || !ids.Add(id)) throw Invalid(); }

            foreach (var line in content.IngredientLines)
            {
                if (line is null) throw Invalid();
                Identity(line.Id);
                RecipeContentInput.Facts(line);
                if (line.Provenance is not { Origin: "human" or "source" or "legacy_unknown" or "unknown", ProtectedFields: { } fields }
                    || line.Provenance.SourceRef is { } source && string.IsNullOrWhiteSpace(source)
                    || fields.Any(x => x is not ("description" or "amount" or "amountText" or "unit" or "scaling" or "package" or "shopping"))
                    || fields.Distinct(StringComparer.Ordinal).Count() != fields.Count) throw Invalid();
            }

            foreach (var section in content.InstructionSections)
            {
                if (section is null || section.Steps is null) throw Invalid();
                Identity(section.Id);
                foreach (var step in section.Steps)
                {
                    if (step is null || step.Text is null || string.IsNullOrWhiteSpace(step.TextRevision)
                        || step.Bindings is null) throw Invalid();
                    Identity(step.Id);
                }
            }

            var ingredients = content.IngredientLines.Select(x => x.Id).ToHashSet();
            foreach (var step in content.InstructionSections.SelectMany(x => x.Steps))
            {
                var spans = new List<(int Start, int End, string TextRevision)>();
                foreach (var binding in step.Bindings)
                {
                    if (binding.ValueKind != JsonValueKind.Object) throw Invalid();
                    Identity(binding.GetProperty("id").GetGuid());
                    var ingredientId = binding.GetProperty("ingredientLineId").GetGuid();
                    var contentRevision = binding.GetProperty("validatedContentRevision").GetString();
                    var textRevision = binding.GetProperty("validatedTextRevision").GetString();
                    var current = contentRevision == content.ContentRevision && textRevision == step.TextRevision;
                    var inert = retainedHistory && !current;
                    if (ingredientId == Guid.Empty || !inert && !ingredients.Contains(ingredientId)
                        || binding.GetProperty("stepId").GetGuid() != step.Id
                        || string.IsNullOrWhiteSpace(contentRevision) || string.IsNullOrWhiteSpace(textRevision)
                        || !retainedHistory && !current) throw Invalid();
                    var span = binding.GetProperty("span");
                    var start = span.GetProperty("start").GetInt32();
                    var end = span.GetProperty("end").GetInt32();
                    var expectedText = span.GetProperty("expectedText").GetString();
                    if (start < 0 || end <= start || expectedText is null || expectedText.Length != end - start
                        || !inert && (end > step.Text.Length || !Utf16Boundary(step.Text, start) || !Utf16Boundary(step.Text, end)
                            || expectedText != step.Text[start..end])
                        || spans.Any(x => x.TextRevision == textRevision && start < x.End && end > x.Start)) throw Invalid();
                    spans.Add((start, end, textRevision!));
                    if (binding.GetProperty("role").GetString() is not ("mention" or "whole" or "absolute" or "fraction" or "remainder" or "fixed" or "perItem")
                        || binding.GetProperty("payload").ValueKind != JsonValueKind.Object
                        || string.IsNullOrWhiteSpace(binding.GetProperty("status").GetString())) throw Invalid();
                }
            }

            if (rawMetadata is not null) using (JsonDocument.Parse(rawMetadata)) { }
        }
        catch (Exception ex) when (ex is JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException or FormatException or OverflowException)
        {
            throw Invalid();
        }
    }

    private static bool Utf16Boundary(string text, int offset) => offset == 0 || offset == text.Length
        || !char.IsHighSurrogate(text[offset - 1]) || !char.IsLowSurrogate(text[offset]);

    public static (StructuredRecipeContent Content, string? Evidence) FromSchemaOrg(
        Guid recipeId,
        string schemaOrgJson,
        string? sourceUrl = null,
        FoodVocabularyAuthority? authority = null,
        Guid? operationId = null,
        string origin = "source",
        int? explicitServings = null,
        IReadOnlyList<string>? overrideIngredientTexts = null)
    {
        var source = new Recipe
        {
            Id = recipeId,
            SourceUrl = sourceUrl,
            RawMetadata = schemaOrgJson,
            Ingredients = overrideIngredientTexts is not null
                ? JsonSerializer.Serialize(overrideIngredientTexts, Json)
                : null
        };
        var sourceRevision = InspectSourceRevision(source);
        var servings = explicitServings is > 0 ? explicitServings : RecipeServings.FromMetadata(schemaOrgJson);

        var (ingredientTexts, supplyNames) = ReadIngredientsAndSupplyNames(schemaOrgJson, overrideIngredientTexts);
        var protectedFields = origin == "source" ? Array.Empty<string>() : ProtectedFacts;
        var sourceRef = origin == "source" ? sourceRevision : null;

        var lines = new List<RecipeIngredientLineDto>(ingredientTexts.Count);
        for (var i = 0; i < ingredientTexts.Count; i++)
        {
            var rawText = ingredientTexts[i];
            if (string.IsNullOrWhiteSpace(rawText)) continue;
            var supplyName = i < supplyNames.Count ? supplyNames[i] : null;
            lines.Add(ParseTolerantIngredientLine(rawText, sourceRef, origin, protectedFields, supplyName, Guid.NewGuid));
        }

        var sections = ConvertInstructions(schemaOrgJson, Guid.NewGuid, Guid.NewGuid, NewRevision);
        var content = new StructuredRecipeContent(2, NewRevision(), sourceRevision, servings, lines.ToArray(), sections);
        content = CookingStepRelationshipProducer.Discover(content);

        string? evidence = null;
        if (authority is not null)
        {
            var prepared = FoodMappingQualification.Prepare(
                new StructuredRecipeExport(recipeId, content, schemaOrgJson),
                authority,
                operationId ?? Guid.NewGuid());
            content = prepared.Export.Content;
            evidence = prepared.Evidence;
        }

        ValidateContent(content);
        return (content, evidence);
    }

    public static string ToSchemaOrgJson(
        StructuredRecipeContent content,
        string? existingRawMetadata = null,
        string? name = null,
        string? description = null,
        string? sourceName = null)
    {
        SchemaOrgRecipe? recipe = null;
        if (!string.IsNullOrWhiteSpace(existingRawMetadata))
        {
            try
            {
                recipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(existingRawMetadata, JsonDefaults.CaseInsensitive);
            }
            catch (JsonException)
            {
                recipe = null;
            }
        }

        recipe ??= new SchemaOrgRecipe();
        recipe.Context = "https://schema.org/";
        recipe.Type = "Recipe";

        if (!string.IsNullOrWhiteSpace(name))
            recipe.Name = name;
        if (description is not null)
            recipe.Description = string.IsNullOrWhiteSpace(description) ? null : description;

        if (!string.IsNullOrWhiteSpace(sourceName))
        {
            recipe.AdditionalProperties ??= new Dictionary<string, JsonElement>(StringComparer.Ordinal);
            recipe.AdditionalProperties["sourceName"] = JsonSerializer.SerializeToElement(sourceName);
        }

        if (content.Servings is null)
        {
            recipe.RecipeYield = null;
        }
        else
        {
            var existingCount = RecipeServings.FromMetadata(
                recipe.RecipeYield is null ? null : JsonSerializer.Serialize(new { recipeYield = recipe.RecipeYield }));
            if (existingCount != content.Servings)
                recipe.RecipeYield = $"{content.Servings} portions";
        }

        recipe.RecipeIngredient = content.IngredientLines.Select(Render).ToList();
        recipe.Supply = content.IngredientLines.Select(line =>
        {
            QuantitativeValue? quantity = null;
            if (line.Amount is { Kind: "scalar", Value: { } rational }
                && long.TryParse(rational.N, out var n) && long.TryParse(rational.D, out var d) && d > 0)
            {
                quantity = new QuantitativeValue
                {
                    Value = Math.Round((double)n / d, 4),
                    UnitText = line.Unit?.Text
                };
            }
            else if (line.Unit is not null)
            {
                quantity = new QuantitativeValue { UnitText = line.Unit.Text };
            }

            return new HowToSupply
            {
                Name = line.Shopping.Name,
                RequiredQuantity = quantity
            };
        }).ToList();

        recipe.RecipeInstructions = content.InstructionSections.Select(section => new HowToSection
        {
            Name = section.Name,
            ItemListElement = section.Steps.Select(step => new HowToStep { Text = step.Text }).ToList()
        }).ToList();

        return JsonSerializer.Serialize(recipe, IndentedCamelJson);
    }

    internal static RecipeIngredientLineDto ParseTolerantIngredientLine(
        string rawText,
        string? sourceRef,
        string origin,
        string[] protectedFields,
        string? supplyNameHint,
        Func<Guid> newId)
    {
        var trimmed = rawText.Trim();
        var match = TolerantIngredientLineRegex().Match(trimmed);
        if (match.Success)
        {
            var rawAmount = match.Groups["amt"].Value.Trim();
            var normalizedAmount = TolerantRangeConnectorRegex().Replace(rawAmount, "–");
            var amount = QuantityMath.Parse(normalizedAmount);
            var description = match.Groups["rest"].Value.Trim();
            if (amount is not null && QuantityMath.IsCanonical(amount) && !string.IsNullOrWhiteSpace(description))
            {
                var unit = NormalizeTolerantUnit(match.Groups["unit"].Success ? match.Groups["unit"].Value : null);
                var rawMatches = string.Equals(normalizedAmount, rawAmount, StringComparison.Ordinal)
                    || QuantityMath.Parse(rawAmount) == amount;
                var amountText = rawMatches ? rawAmount : null;
                var shoppingName = !string.IsNullOrWhiteSpace(supplyNameHint) ? supplyNameHint.Trim() : description;
                return new RecipeIngredientLineDto
                {
                    Id = newId(),
                    Description = description,
                    Amount = amount,
                    AmountText = amountText,
                    Unit = unit,
                    Scaling = "proportional",
                    Package = null,
                    Shopping = new RecipeShoppingAssociationDto(shoppingName, null, null),
                    Provenance = new RecipeIngredientProvenanceDto(origin, sourceRef, protectedFields)
                };
            }
        }

        var fallbackShopping = !string.IsNullOrWhiteSpace(supplyNameHint) ? supplyNameHint.Trim() : trimmed;
        return new RecipeIngredientLineDto
        {
            Id = newId(),
            Description = trimmed,
            Amount = null,
            AmountText = null,
            Unit = null,
            Scaling = "proportional",
            Package = null,
            Shopping = new RecipeShoppingAssociationDto(fallbackShopping, null, null),
            Provenance = new RecipeIngredientProvenanceDto(origin, sourceRef, protectedFields)
        };
    }

    private static RecipeUnitDto? NormalizeTolerantUnit(string? rawUnit)
    {
        if (string.IsNullOrWhiteSpace(rawUnit))
            return null;

        var key = TolerantWhitespaceRegex().Replace(rawUnit.Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant(), " ");
        return key switch
        {
            "unit" or "units" => null,
            "c. à s." or "c. à s" or "c à s" or "c. à soupe" or "c à soupe" => new("c. à soupe", null),
            "c. à t." or "c. à t" or "c à t" or "c. à thé" or "c à thé" or "cuillère à café" or "cuillères à café" => new("c. à thé", null),
            "cup(s)" => new("cup", null),
            "tasse(s)" => new("tasse", null),
            _ => new(rawUnit.Trim(), null)
        };
    }

    private static (List<string> Ingredients, List<string?> SupplyNames) ReadIngredientsAndSupplyNames(
        string? rawMetadata,
        IReadOnlyList<string>? overrideIngredientTexts)
    {
        var ingredients = overrideIngredientTexts is not null
            ? overrideIngredientTexts.ToList()
            : new List<string>();
        var supplyNames = new List<string?>();

        using var doc = Metadata(rawMetadata);
        if (doc?.RootElement is not { ValueKind: JsonValueKind.Object } root)
        {
            for (var i = 0; i < ingredients.Count; i++) supplyNames.Add(null);
            return (ingredients, supplyNames);
        }

        if (overrideIngredientTexts is null)
        {
            if ((root.TryGetProperty("recipeIngredient", out var raw) || root.TryGetProperty("ingredients", out raw))
                && raw.ValueKind == JsonValueKind.Array)
            {
                ingredients = raw.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString() ?? string.Empty)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToList();
            }
        }

        var supply = root.TryGetProperty("supply", out var supplies) && supplies.ValueKind == JsonValueKind.Array
            ? supplies
            : default;

        if (ingredients.Count == 0 && supply.ValueKind == JsonValueKind.Array)
        {
            ingredients = supply.EnumerateArray()
                .Select(x => Text(x, "name"))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .ToList();
        }

        if (supply.ValueKind == JsonValueKind.Array && supply.GetArrayLength() == ingredients.Count)
        {
            foreach (var entry in supply.EnumerateArray())
                supplyNames.Add(Text(entry, "name"));
        }
        else if (supply.ValueKind == JsonValueKind.Array)
        {
            var bindings = BindSupplies(ingredients, supply);
            for (var i = 0; i < ingredients.Count; i++)
                supplyNames.Add(bindings.TryGetValue(i, out var item) ? Text(item, "name") : null);
        }
        else
        {
            for (var i = 0; i < ingredients.Count; i++) supplyNames.Add(null);
        }

        return (ingredients, supplyNames);
    }
}
