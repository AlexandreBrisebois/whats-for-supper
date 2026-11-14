using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class SupperProjectionVersionPackageTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly DateOnly Date = new(2026, 11, 23);
    private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value))));
    private static Recipe Source(bool canonical, RecipePackageDto? package = null)
    {
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Tomatoes", Servings = 4, Ingredients = "[\"2 cans tomatoes\"]",
            RawMetadata = "{\"recipeIngredient\":[\"2 cans tomatoes\"],\"supply\":[{\"name\":\"tomatoes\",\"quantity\":2,\"unitText\":\"cans\"}]}" };
        if (canonical)
        {
            var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "tomatoes", Amount = LegacyGroceryQuantity.Parse("2"),
                AmountText = "2", Unit = new("cans", null), Scaling = "proportional", Package = package,
                Shopping = new("tomatoes", null, null), Provenance = new("human", "source", []) };
            recipe.CanonicalContent = JsonSerializer.Serialize(new CanonicalRecipeContent(2, "content", "source", 4, [row], []), Json);
        }
        return recipe;
    }
    private static RecipePackageDto Package() => new(new("cans", "saved-count-definition"),
        new(LegacyGroceryQuantity.Parse("400")!, new("g", "saved-capacity-definition")), "net");

    private static string OldIngredientVersion(Recipe recipe, IReadOnlyList<IngredientProjectionLineDto> lines) =>
        Hash(new { RecipeId = recipe.Id, Basis = recipe.Servings, Target = 8,
            Lines = lines.Select(line => new { line.OriginalText, line.Name, line.Quantity, line.UnitText, line.Status, line.Issues }),
            GroceryOperands = lines.Select(line => line.GroceryObservation) });

    private static (string Preview, string Dated, string Week) Versions(Recipe recipe, IReadOnlyList<IngredientProjectionLineDto> lines, Guid occurrence)
    {
        var inputs = typeof(SupperIngredientProjection).Assembly.GetType("RecipeApi.Services.SupperProjectionInputs")!;
        string Invoke(string method, params object?[] arguments) => (string)inputs.GetMethod(method, BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, arguments)!;
        var preview = Invoke("PreviewVersion", recipe, 8, lines);
        var dated = Invoke("DatedVersion", recipe, Date, "planned", occurrence, 8, lines);
        var occurrenceType = inputs.GetNestedType("Occurrence", BindingFlags.NonPublic)!;
        var occurrences = Array.CreateInstance(occurrenceType, 1);
        occurrences.SetValue(Activator.CreateInstance(occurrenceType,
            new CalendarEvent { Id = occurrence, Date = Date, RecipeId = recipe.Id }, lines, preview, 4, 8), 0);
        var week = Invoke("WeekVersion", occurrences);
        return (preview, dated, week);
    }

    [Theory]
    [InlineData(false)][InlineData(true)]
    public void NonpackageLegacyAndCanonicalVersionsKeepExactPreviousSixFieldBytes(bool canonical)
    {
        var recipe = Source(canonical); var lines = SupperIngredientProjection.Read(recipe, 8); var occurrence = Guid.NewGuid();
        var expectedIngredient = OldIngredientVersion(recipe, lines);
        var actual = Versions(recipe, lines, occurrence);
        Assert.Equal(expectedIngredient, actual.Preview);
        Assert.Equal(Hash(new { Date, Context = "planned", Occurrence = (Guid?)occurrence, Ingredients = expectedIngredient }), actual.Dated);
        Assert.Equal(Hash(new[] { new { Id = occurrence, Date, Ingredients = expectedIngredient } }), actual.Week);
    }

    [Theory]
    [InlineData(false)][InlineData(true)]
    public void DerivedDisplayTextOnlyChangesNeverChangeSemanticPreviewDatedOrWeekVersion(bool packaged)
    {
        var recipe = Source(true, packaged ? Package() : null); var lines = SupperIngredientProjection.Read(recipe, 8); var occurrence = Guid.NewGuid();
        var before = Versions(recipe, lines, occurrence);
        var changed = lines.Select(line => line with { DisplayText = "A different derived display only" }).ToArray();
        Assert.Equal(before, Versions(recipe, changed, occurrence));
    }

    [Theory]
    [InlineData("clearCountDefinition")][InlineData("clearCapacityDefinition")][InlineData("capacity")]
    [InlineData("capacityRange")][InlineData("capacityUnit")][InlineData("countLabel")][InlineData("basis")][InlineData("clearPackage")]
    public void FullLiteralPackageOperandsChangePreviewDatedAndWeekEvenWhenCaptionStaysTheSame(string change)
    {
        var package = Package(); var recipe = Source(true, package); var lines = SupperIngredientProjection.Read(recipe, 8); var occurrence = Guid.NewGuid();
        var before = Versions(recipe, lines, occurrence);
        RecipePackageDto? next = change switch
        {
            "clearCountDefinition" => package with { CountUnit = package.CountUnit with { DefinitionId = null } },
            "clearCapacityDefinition" => package with { Capacity = package.Capacity with { Unit = package.Capacity.Unit with { DefinitionId = null } } },
            "capacity" => package with { Capacity = package.Capacity with { Amount = LegacyGroceryQuantity.Parse("800")! } },
            "capacityRange" => package with { Capacity = package.Capacity with { Amount = LegacyGroceryQuantity.Parse("350–450")! } },
            "capacityUnit" => package with { Capacity = package.Capacity with { Unit = package.Capacity.Unit with { Text = "ml", DefinitionId = null } } },
            "countLabel" => package with { CountUnit = package.CountUnit with { Text = "boxes", DefinitionId = null } },
            "basis" => package with { Basis = "drained" },
            _ => null
        };
        // Presentation remains deliberately fixed: semantic purchase operands
        // must be recorded directly, never reconstructed from a derived caption.
        var changed = lines.Select(line => line with { GroceryPackage = next }).ToArray();
        var after = Versions(recipe, changed, occurrence);
        Assert.NotEqual(before.Preview, after.Preview);
        Assert.NotEqual(before.Dated, after.Dated);
        Assert.NotEqual(before.Week, after.Week);
    }
}
