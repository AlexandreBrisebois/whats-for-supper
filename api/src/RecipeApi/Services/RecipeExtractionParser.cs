using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>
/// Tolerantly parses untrusted extraction output into the canonical recipe instruction shape.
/// </summary>
public static class RecipeExtractionParser
{
    private static readonly JsonSerializerOptions Options = CreateOptions();

    public static RecipeExtractionParseResult ParseAndNormalize(string json)
    {
        var recipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(json, Options);
        return new RecipeExtractionParseResult(recipe, IsSemanticallyComplete(recipe));
    }

    private static JsonSerializerOptions CreateOptions()
    {
        var resolver = new DefaultJsonTypeInfoResolver();
        resolver.Modifiers.Add(info =>
        {
            if (info.Type == typeof(SchemaOrgRecipe))
            {
                var optionalString = new OptionalStringConverter();
                info.Properties.Single(p => p.Name == "recipeYield").CustomConverter = optionalString;
                info.Properties.Single(p => p.Name == "totalTime").CustomConverter = optionalString;
                info.Properties.Single(p => p.Name == "notes").CustomConverter = optionalString;
            }
        });
        var options = new JsonSerializerOptions(JsonDefaults.CaseInsensitive) { TypeInfoResolver = resolver };
        options.Converters.Add(new RecipeInstructionsConverter());
        options.Converters.Add(new TolerantSupplyListConverter());
        options.Converters.Add(new TolerantNutritionConverter());
        return options;
    }

    internal static bool IsSemanticallyComplete(SchemaOrgRecipe? recipe) =>
        !string.IsNullOrWhiteSpace(recipe?.Name) &&
        recipe.RecipeIngredient?.Any(ingredient => !string.IsNullOrWhiteSpace(ingredient)) == true &&
        recipe.RecipeInstructions?
            .SelectMany(section => section.ItemListElement ?? [])
            .Any(step => !string.IsNullOrWhiteSpace(step.Text)) == true;

    private static bool TryGetPropertyIgnoreCase(JsonElement element, string propertyName, out JsonElement value)
    {
        if (element.TryGetProperty(propertyName, out value))
            return true;

        foreach (var prop in element.EnumerateObject())
        {
            if (string.Equals(prop.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = prop.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private sealed class OptionalStringConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String) return reader.GetString();
            using var ignored = JsonDocument.ParseValue(ref reader);
            return null;
        }
        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options) => writer.WriteStringValue(value);
    }

    private sealed class TolerantSupplyListConverter : JsonConverter<List<HowToSupply>>
    {
        public override List<HowToSupply> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using var document = JsonDocument.ParseValue(ref reader);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var supplies = new List<HowToSupply>();
            foreach (var item in document.RootElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var name = item.GetString();
                    if (!string.IsNullOrWhiteSpace(name))
                    {
                        supplies.Add(new HowToSupply { Name = name });
                    }
                    continue;
                }

                if (item.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var supplyName = TryGetPropertyIgnoreCase(item, "name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String
                    ? nameEl.GetString()
                    : null;

                QuantitativeValue? requiredQuantity = null;
                if (TryGetPropertyIgnoreCase(item, "requiredQuantity", out var reqEl))
                {
                    if (reqEl.ValueKind == JsonValueKind.Object)
                    {
                        double? value = TryGetPropertyIgnoreCase(reqEl, "value", out var valEl)
                            ? TryParseQuantityValue(valEl)
                            : null;
                        string? unitText = TryGetPropertyIgnoreCase(reqEl, "unitText", out var unitTextEl) && unitTextEl.ValueKind == JsonValueKind.String
                            ? unitTextEl.GetString()
                            : null;
                        string? unitCode = TryGetPropertyIgnoreCase(reqEl, "unitCode", out var unitCodeEl) && unitCodeEl.ValueKind == JsonValueKind.String
                            ? unitCodeEl.GetString()
                            : null;

                        requiredQuantity = new QuantitativeValue
                        {
                            Value = value,
                            UnitText = unitText,
                            UnitCode = unitCode
                        };
                    }
                    else if (reqEl.ValueKind == JsonValueKind.Number && reqEl.TryGetDouble(out var directValue) && double.IsFinite(directValue))
                    {
                        requiredQuantity = new QuantitativeValue { Value = directValue };
                    }
                }

                supplies.Add(new HowToSupply
                {
                    Name = supplyName,
                    RequiredQuantity = requiredQuantity
                });
            }

            return supplies;
        }

        public override void Write(Utf8JsonWriter writer, List<HowToSupply> value, JsonSerializerOptions options) =>
            throw new NotSupportedException("Recipe extraction supply is read-only at this boundary.");

        private static double? TryParseQuantityValue(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                return element.TryGetDouble(out var number) && double.IsFinite(number) ? number : null;
            }

            if (element.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            var raw = element.GetString()?.Trim();
            if (string.IsNullOrEmpty(raw))
            {
                return null;
            }

            if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var invariantValue) && double.IsFinite(invariantValue))
            {
                return invariantValue;
            }

            // Handle mixed fractions like "1 1/2"
            var spaceParts = raw.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
            if (spaceParts.Length == 2 &&
                double.TryParse(spaceParts[0].Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var whole) &&
                TryParseSimpleFraction(spaceParts[1], out var fractional))
            {
                var combined = whole >= 0 ? whole + fractional : whole - fractional;
                return double.IsFinite(combined) ? combined : null;
            }

            // Handle simple fractions like "1/4" or "1/2"
            if (TryParseSimpleFraction(raw, out var fractionValue) && double.IsFinite(fractionValue))
            {
                return fractionValue;
            }

            // Handle comma-decimal strings like "2,5"
            if (raw.Contains(',', StringComparison.Ordinal) &&
                double.TryParse(raw.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var commaDecimal) &&
                double.IsFinite(commaDecimal))
            {
                return commaDecimal;
            }

            return null;
        }

        private static bool TryParseSimpleFraction(string text, out double value)
        {
            value = 0;
            var parts = text.Split('/');
            if (parts.Length != 2)
            {
                return false;
            }

            if (!double.TryParse(parts[0].Trim().Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var numerator) ||
                !double.TryParse(parts[1].Trim().Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var denominator) ||
                denominator == 0)
            {
                return false;
            }

            value = numerator / denominator;
            return true;
        }
    }

    private sealed class TolerantNutritionConverter : JsonConverter<NutritionInformation>
    {
        public override NutritionInformation? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using var document = JsonDocument.ParseValue(ref reader);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            var root = document.RootElement;
            return new NutritionInformation
            {
                Calories = ReadStringOrNumber(root, "calories"),
                FatContent = ReadStringOrNumber(root, "fatContent"),
                SaturatedFatContent = ReadStringOrNumber(root, "saturatedFatContent"),
                SodiumContent = ReadStringOrNumber(root, "sodiumContent"),
                CarbohydrateContent = ReadStringOrNumber(root, "carbohydrateContent"),
                FiberContent = ReadStringOrNumber(root, "fiberContent"),
                SugarContent = ReadStringOrNumber(root, "sugarContent"),
                ProteinContent = ReadStringOrNumber(root, "proteinContent")
            };
        }

        public override void Write(Utf8JsonWriter writer, NutritionInformation value, JsonSerializerOptions options) =>
            throw new NotSupportedException("Recipe extraction nutrition is read-only at this boundary.");

        private static string? ReadStringOrNumber(JsonElement obj, string propertyName)
        {
            if (!TryGetPropertyIgnoreCase(obj, propertyName, out var el))
            {
                return null;
            }

            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Number => el.GetRawText(),
                _ => null
            };
        }
    }

    private sealed class RecipeInstructionsConverter : JsonConverter<List<HowToSection>>
    {
        public override List<HowToSection> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using var document = JsonDocument.ParseValue(ref reader);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var sections = new List<HowToSection>();
            var looseSteps = new List<HowToStep>();

            foreach (var instruction in document.RootElement.EnumerateArray())
            {
                if (instruction.ValueKind == JsonValueKind.String)
                {
                    AddStep(looseSteps, instruction);
                    continue;
                }

                if (instruction.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                if (IsSection(instruction))
                {
                    FlushLooseSteps(sections, looseSteps);
                    var section = ReadSection(instruction);
                    if (section.ItemListElement is { Count: > 0 })
                    {
                        sections.Add(section);
                    }

                    continue;
                }

                if (instruction.TryGetProperty("text", out var text))
                {
                    AddStep(looseSteps, text);
                }
            }

            FlushLooseSteps(sections, looseSteps);
            return sections;
        }

        public override void Write(Utf8JsonWriter writer, List<HowToSection> value, JsonSerializerOptions options) =>
            throw new NotSupportedException("Recipe extraction instructions are read-only at this boundary.");

        private static bool IsSection(JsonElement instruction) =>
            instruction.TryGetProperty("itemListElement", out _) ||
            instruction.TryGetProperty("@type", out var type) &&
            type.ValueKind == JsonValueKind.String &&
            string.Equals(type.GetString(), "HowToSection", StringComparison.OrdinalIgnoreCase);

        private static HowToSection ReadSection(JsonElement element)
        {
            var section = new HowToSection
            {
                Name = element.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String
                    ? name.GetString()
                    : null,
                ItemListElement = []
            };

            if (element.TryGetProperty("itemListElement", out var steps) && steps.ValueKind == JsonValueKind.Array)
            {
                foreach (var step in steps.EnumerateArray())
                {
                    if (step.ValueKind == JsonValueKind.String)
                    {
                        AddStep(section.ItemListElement, step);
                    }
                    else if (step.ValueKind == JsonValueKind.Object && step.TryGetProperty("text", out var text))
                    {
                        AddStep(section.ItemListElement, text);
                    }
                }
            }

            return section;
        }

        private static void AddStep(List<HowToStep> steps, JsonElement text)
        {
            if (text.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(text.GetString()))
            {
                steps.Add(new HowToStep { Text = text.GetString() });
            }
        }

        private static void FlushLooseSteps(List<HowToSection> sections, List<HowToStep> looseSteps)
        {
            if (looseSteps.Count == 0)
            {
                return;
            }

            sections.Add(new HowToSection { Name = null, ItemListElement = [.. looseSteps] });
            looseSteps.Clear();
        }
    }
}

public sealed record RecipeExtractionParseResult(SchemaOrgRecipe? Recipe, bool IsSemanticallyComplete);

// A semantic content result requiring human review, distinct from acquisition,
// provider transport, image or categorization failures. A fresh URL may retain
// editable review material under a separate failed-extraction receipt.
public sealed class RecipeContentReviewException(string message, IReadOnlyList<string> reasons) : Exception(message)
{
    public IReadOnlyList<string> Reasons { get; } = reasons;
}
