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
                info.Properties.Single(p => p.Name == "recipeYield").CustomConverter = new OptionalYieldConverter();
        });
        var options = new JsonSerializerOptions(JsonDefaults.CaseInsensitive) { TypeInfoResolver = resolver };
        options.Converters.Add(new RecipeInstructionsConverter());
        return options;
    }

    private static bool IsSemanticallyComplete(SchemaOrgRecipe? recipe) =>
        !string.IsNullOrWhiteSpace(recipe?.Name) &&
        recipe.RecipeIngredient?.Any(ingredient => !string.IsNullOrWhiteSpace(ingredient)) == true &&
        recipe.RecipeInstructions?
            .SelectMany(section => section.ItemListElement ?? [])
            .Any(step => !string.IsNullOrWhiteSpace(step.Text)) == true;

    private sealed class OptionalYieldConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String) return reader.GetString();
            using var ignored = JsonDocument.ParseValue(ref reader);
            return null;
        }
        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options) => writer.WriteStringValue(value);
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
