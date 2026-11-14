using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

// Isolated store admission feedback. Actual PostgreSQL/HTTP behavior has its
// separately recorded ordinary-PATCH intended-red owner.
public sealed class CanonicalPackageAdmissionTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static RecipePackageDto Package(string capacity = "400", bool definitions = false, string basis = "net") =>
        new(new("cans", definitions ? "saved-count-definition" : null),
            new(LegacyGroceryQuantity.Parse(capacity)!, new("g", definitions ? "saved-capacity-definition" : null)), basis);

    private sealed class Fixture : IAsyncDisposable
    {
        internal readonly RecipeDbContext Db = new(new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        internal readonly CanonicalRecipeContentStore Store;
        internal readonly Recipe Recipe;
        internal readonly CanonicalRecipeContent Before;
        internal Fixture(RecipePackageDto? package = null, bool definitions = false, bool noLineUnit = false)
        {
            var clock = new SystemClock();
            Store = new(Db, clock, new SupperProjectionInvalidation(Db, clock, new DeploymentCalendar(new ConfigurationManager())), TestPublicationStore.Vocabulary(Db, new InMemoryStorageProvider(), clock));
            var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "tomatoes",
                Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2", Unit = noLineUnit ? null : new("cans", definitions ? "saved-line-definition" : null),
                Scaling = "proportional", Package = package, Shopping = new("tomatoes", null, null), Provenance = new("source", "source", []) };
            Before = new(2, "before", "source", 4, [row], []);
            Recipe = new() { Id = Guid.NewGuid(), Name = "Tomatoes", Servings = 4, IsReady = true,
                SourceUrl = "https://example.test/retained", RawMetadata = "{\"recipeIngredient\":[\"2 cans tomatoes\"]}",
                Ingredients = "[\"2 cans tomatoes\"]", CanonicalContent = JsonSerializer.Serialize(Before, Json), CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow };
        }
        internal async Task Seed() { Db.Recipes.Add(Recipe); await Db.SaveChangesAsync(); }
        internal RecipeIngredientLineInput Row() => new() { Id = Before.IngredientLines[0].Id,
            Description = Before.IngredientLines[0].Description, Amount = Before.IngredientLines[0].Amount,
            AmountText = Before.IngredientLines[0].AmountText, Unit = Before.IngredientLines[0].Unit,
            Scaling = Before.IngredientLines[0].Scaling, Package = Before.IngredientLines[0].Package, Shopping = Before.IngredientLines[0].Shopping };
        internal Task<CanonicalRecipeWriteResult> Save(RecipeIngredientLineInput row) => Store.EditAsync(Recipe.Id, Before.SourceRevision, Guid.NewGuid(),
            new UpdateRecipeDto { ExpectedContentRevision = Before.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(new[] { row }, Json) });
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    [Theory]
    [InlineData("400", false)] [InlineData("350–450", false)] [InlineData("0", false)]
    [InlineData("400", true)] [InlineData("350–450", true)] [InlineData("0", true)]
    public async Task LiteralPackageSaveAdmitsExactCapacityWithIndependentNullableLineUnit(string capacity, bool noLineUnit)
    {
        await using var fixture = new Fixture(noLineUnit: noLineUnit); await fixture.Seed();
        var originalSource = fixture.Recipe.RawMetadata;
        var input = fixture.Row() with { Package = Package(capacity) };
        var saved = await fixture.Save(input);
        var row = Assert.Single(saved.Content.IngredientLines);
        Assert.Equal(input.Package, row.Package);
        Assert.Equal(input.Unit, row.Unit);
        Assert.Equal(input.Amount, row.Amount);
        Assert.Equal(fixture.Before.IngredientLines[0].Id, row.Id);
        Assert.Equal("human", row.Provenance.Origin);
        Assert.Contains("package", row.Provenance.ProtectedFields);
        Assert.Equal(originalSource, fixture.Recipe.RawMetadata);
        Assert.Equal(fixture.Before.SourceRevision, saved.Content.SourceRevision);
        Assert.Single(await fixture.Db.CanonicalRecipeOperations.ToArrayAsync());
    }

    [Theory]
    [InlineData("0")][InlineData(null)]
    public async Task LiteralPackageSaveDoesNotRequirePositiveOrKnownLineCount(string? count)
    {
        await using var fixture = new Fixture(); await fixture.Seed();
        var saved = await fixture.Save(fixture.Row() with { Amount = count is null ? null : LegacyGroceryQuantity.Parse(count), AmountText = count, Package = Package() });
        Assert.Equal(count, Assert.Single(saved.Content.IngredientLines).AmountText);
        Assert.Equal(Package(), saved.Content.IngredientLines[0].Package);
    }

    [Fact]
    public async Task ExistingNestedDefinitionsRemainUsableWhenOnlyLiteralCapacityAndBasisChange()
    {
        var old = Package(definitions: true);
        await using var fixture = new Fixture(old, definitions: true); await fixture.Seed();
        var changed = old with { Capacity = old.Capacity with { Amount = LegacyGroceryQuantity.Parse("500")! }, Basis = "drained" };
        var saved = await fixture.Save(fixture.Row() with { Package = changed });
        Assert.Equal(changed, Assert.Single(saved.Content.IngredientLines).Package);
        Assert.Equal(fixture.Before.IngredientLines[0].Unit, saved.Content.IngredientLines[0].Unit);
    }

    [Theory]
    [InlineData("lineId")][InlineData("lineText")][InlineData("countId")][InlineData("countText")]
    [InlineData("capacityId")][InlineData("capacityText")][InlineData("movedDefinition")]
    public async Task NewOrChangedDefinitionAtEachExactPathRejectsBeforeAnyMutation(string change)
    {
        await using var fixture = new Fixture(Package(definitions: true), definitions: true); await fixture.Seed();
        var before = JsonSerializer.Serialize(fixture.Recipe, Json); var row = fixture.Row(); var package = row.Package!;
        row = change switch
        {
            "lineId" => row with { Unit = row.Unit! with { DefinitionId = "new-definition" } },
            "lineText" => row with { Unit = row.Unit! with { Text = "pieces" } },
            "countId" => row with { Package = package with { CountUnit = package.CountUnit with { DefinitionId = "new-definition" } } },
            "countText" => row with { Package = package with { CountUnit = package.CountUnit with { Text = "pieces" } } },
            "capacityId" => row with { Package = package with { Capacity = package.Capacity with { Unit = package.Capacity.Unit with { DefinitionId = "new-definition" } } } },
            "capacityText" => row with { Package = package with { Capacity = package.Capacity with { Unit = package.Capacity.Unit with { Text = "kg" } } } },
            _ => row with { Package = package with { CountUnit = package.CountUnit with { DefinitionId = row.Unit!.DefinitionId } } }
        };
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Save(row));
        Assert.Equal(before, JsonSerializer.Serialize(fixture.Recipe, Json));
        Assert.Empty(await fixture.Db.CanonicalRecipeOperations.ToArrayAsync());
        Assert.Empty(await fixture.Db.RecipeSearchDocuments.ToArrayAsync());
    }

    [Theory]
    [InlineData("count")][InlineData("capacity")]
    public async Task NewLiteralPackageCannotIntroduceNestedRegistryDefinitions(string path)
    {
        await using var fixture = new Fixture(); await fixture.Seed(); var package = Package();
        package = path == "count" ? package with { CountUnit = package.CountUnit with { DefinitionId = "unqualified" } }
            : package with { Capacity = package.Capacity with { Unit = package.Capacity.Unit with { DefinitionId = "unqualified" } } };
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Save(fixture.Row() with { Package = package }));
        Assert.Equal(JsonSerializer.Serialize(fixture.Before, Json), JsonSerializer.Serialize(CanonicalRecipeContentStore.Read(fixture.Recipe), Json));
        Assert.Empty(await fixture.Db.CanonicalRecipeOperations.ToArrayAsync());
    }

    [Fact]
    public async Task PackageClearAndFoodMappingGuardKeepTheirExistingBoundaries()
    {
        await using var fixture = new Fixture(Package(definitions: true), definitions: true); await fixture.Seed();
        var saved = await fixture.Save(fixture.Row() with { Package = null });
        Assert.Null(Assert.Single(saved.Content.IngredientLines).Package);
        Assert.Equal(fixture.Before.IngredientLines[0].Unit, saved.Content.IngredientLines[0].Unit);
        await using var other = new Fixture(); await other.Seed();
        var before = JsonSerializer.Serialize(other.Recipe, Json);
        await Assert.ThrowsAsync<ArgumentException>(() => other.Save(other.Row() with { Package = Package(), Shopping = new("tomatoes", Guid.NewGuid(), "unqualified") }));
        Assert.Equal(before, JsonSerializer.Serialize(other.Recipe, Json));
        Assert.Empty(await other.Db.CanonicalRecipeOperations.ToArrayAsync());
    }
}
