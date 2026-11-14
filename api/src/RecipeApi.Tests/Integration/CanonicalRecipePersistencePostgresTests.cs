using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

/// <summary>Internal persistence qualification; public write activation stays fenced.</summary>
public sealed class CanonicalRecipePersistencePostgresTests(ITestOutputHelper output)
{
    private static readonly Guid Id = TomorrowPushPostgresTests.Selected;
    private static CanonicalRecipeContentStore Store(IServiceProvider services) => new(
        services.GetRequiredService<RecipeDbContext>(), services.GetRequiredService<IClock>(),
        services.GetRequiredService<SupperProjectionInvalidation>(), services.GetRequiredService<FoodVocabularyStore>());

    private static async Task Seed(IServiceProvider services)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.Servings = null;
        recipe.Ingredients = """["⅓ cup flour","mystery garnish","2–3 cloves garlic","salt","salt"]""";
        recipe.RawMetadata = """{"recipeIngredient":["⅓ cup flour","mystery garnish","2–3 cloves garlic","salt","salt"],"supply":[{"name":"garlic","quantity":2,"unitText":"cloves"},{"name":"flour","quantity":0.33,"unitText":"cup"},{"name":"salt","quantity":9}],"recipeInstructions":[{"@type":"HowToStep","text":"Mix."}]}""";
        await db.SaveChangesAsync();
        await db.Entry(recipe).ReloadAsync();
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExplicitConversion_PersistsServerIdentitiesExactNotationUnknownBasisAndReplay()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            await Seed(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var raw = recipe.RawMetadata;
            var content = CanonicalRecipeContentStore.InspectContentRevision(recipe);
            var source = CanonicalRecipeContentStore.InspectSourceRevision(recipe);
            var operation = Guid.NewGuid();
            var result = await Store(scope.ServiceProvider).ConvertAsync(Id, content, source, operation);
            Assert.Equal(2, result.Content.ContentSchemaVersion);
            Assert.Null(result.Content.Servings);
            Assert.Equal(5, result.Content.IngredientLines.Select(x => x.Id).Distinct().Count());
            Assert.DoesNotContain(Guid.Empty, result.Content.IngredientLines.Select(x => x.Id));
            Assert.Equal(new[] { "flour", "mystery garnish", "garlic", "salt", "salt" }, result.Content.IngredientLines.Select(x => x.Description));
            Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), result.Content.IngredientLines[0].Amount);
            Assert.Equal("⅓", result.Content.IngredientLines[0].AmountText);
            Assert.Equal("cup", result.Content.IngredientLines[0].Unit!.Text);
            Assert.Null(result.Content.IngredientLines[0].Unit!.DefinitionId);
            Assert.Equal(LegacyGroceryQuantity.Parse("2–3"), result.Content.IngredientLines[2].Amount);
            Assert.All(result.Content.IngredientLines.Skip(3), x => Assert.Null(x.Amount));
            Assert.All(result.Content.IngredientLines, x => Assert.Contains("amount", x.Provenance.ProtectedFields));
            Assert.Equal(raw, recipe.RawMetadata);
            var repeated = await Store(scope.ServiceProvider).ConvertAsync(Id, content, source, operation);
            Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(repeated));
            using var other = factory.Services.CreateScope();
            var stored = await other.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal(JsonSerializer.Serialize(result.Content), JsonSerializer.Serialize(CanonicalRecipeContentStore.Read(stored)));
            using var client = factory.CreateAuthenticatedClient();
            using var detail = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{Id}"));
            var dto = detail.RootElement.GetProperty("recipe");
            Assert.Equal(result.Content.ContentRevision, dto.GetProperty("contentRevision").GetString());
            Assert.Equal(result.Content.IngredientLines[0].Id, dto.GetProperty("ingredientLines")[0].GetProperty("id").GetGuid());
            Assert.Equal("⅓ cup flour", dto.GetProperty("ingredients")[0].GetString());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task GuardedEdit_ReordersSavedRowsMapsNewIdsAndRejectsStaleAtomicPayload()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            await Seed(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var store = Store(scope.ServiceProvider);
            var initial = await store.ConvertAsync(Id, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            var flour = initial.Content.IngredientLines[0];
            var garlic = initial.Content.IngredientLines[2];
            object Existing(RecipeIngredientLineDto row, string description) => new {
                id = row.Id, description, amount = row.Amount, amountText = row.AmountText, unit = row.Unit,
                scaling = row.Scaling, package = row.Package, shopping = row.Shopping };
            var input = new UpdateRecipeDto {
                ExpectedContentRevision = initial.Content.ContentRevision, Name = "Saved name", Notes = "Saved note", Servings = 4,
                IngredientLines = JsonSerializer.SerializeToElement(new object[] {
                    Existing(garlic, "garlic, peeled"), Existing(flour, "flour"),
                    new { clientId = "new-row", description = "oil", amount = (object?)null, amountText = (string?)null,
                        unit = new { text = "tsp", definitionId = (string?)null }, scaling = "proportional", package = (object?)null,
                        shopping = new { name = "oil", foodId = (string?)null, mappingRevision = (string?)null } } }) };
            var operation = Guid.NewGuid();
            var result = await store.EditAsync(Id, initial.Content.SourceRevision, operation, input);
            Assert.Equal(new[] { garlic.Id, flour.Id, result.CreatedIds["new-row"] }, result.Content.IngredientLines.Select(x => x.Id));
            Assert.NotEqual(initial.Content.ContentRevision, result.Content.ContentRevision);
            Assert.Equal(initial.Content.SourceRevision, result.Content.SourceRevision);
            Assert.Equal("Saved name", recipe.Name);
            Assert.Equal("Saved note", recipe.Notes);
            Assert.Equal("unknown", result.Content.IngredientLines[1].Provenance.Origin);
            Assert.Equal("human", result.Content.IngredientLines[0].Provenance.Origin);
            Assert.Equal(4, recipe.Servings);
            Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(await store.EditAsync(Id, initial.Content.SourceRevision, operation, input)));
            var retainedOperation = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == operation);
            var originalProperty = typeof(CanonicalRecipeOperation).GetProperty("OriginalRequest");
            Assert.NotNull(originalProperty);
            using var originalRequest = JsonDocument.Parse(Assert.IsType<string>(originalProperty.GetValue(retainedOperation)));
            Assert.True(originalRequest.RootElement.GetProperty("hasServings").GetBoolean());
            switch (originalRequest.RootElement.GetProperty("version").GetInt32())
            {
                case 1:
                    Assert.Equal(initial.Content.ContentRevision, originalRequest.RootElement.GetProperty("expectedContentRevision").GetString());
                    Assert.Equal(initial.Content.SourceRevision, originalRequest.RootElement.GetProperty("expectedSourceRevision").GetString());
                    break;
                case 2:
                    using (var submitted = JsonDocument.Parse(originalRequest.RootElement.GetProperty("input").GetString()!))
                        Assert.Equal(initial.Content.ContentRevision, submitted.RootElement.GetProperty("expectedContentRevision").GetString());
                    using (var baseline = JsonDocument.Parse(originalRequest.RootElement.GetProperty("baseline").GetProperty("canonicalContent").GetString()!))
                    {
                        Assert.Equal(initial.Content.ContentRevision, baseline.RootElement.GetProperty("contentRevision").GetString());
                        Assert.Equal(initial.Content.SourceRevision, baseline.RootElement.GetProperty("sourceRevision").GetString());
                    }
                    break;
                default:
                    Assert.Fail("Unsupported retained canonical request version.");
                    break;
            }
            input.Name = "Must not save";
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(Id, initial.Content.SourceRevision, operation, input));
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(Id, initial.Content.SourceRevision, Guid.NewGuid(), input));
            using var client = factory.CreateAuthenticatedClient();
            var rejected = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { name = "Old full editor", notes = "Bad note", ingredients = new[] { "stale" } });
            Assert.Equal(HttpStatusCode.Conflict, rejected.StatusCode);
            using var afterScope = factory.Services.CreateScope();
            var after = await afterScope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal("Saved name", after.Name);
            Assert.Equal("Saved note", after.Notes);
            Assert.Equal(JsonSerializer.Serialize(result.Content), JsonSerializer.Serialize(CanonicalRecipeContentStore.Read(after)));
            Assert.Equal("pending", (await db.RecipeSearchDocuments.SingleAsync(x => x.RecipeId == Id)).IndexStatus);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ChangedLegacySourceOrContent_RejectsConversionBeforeAnyWrite()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            await Seed(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var content = CanonicalRecipeContentStore.InspectContentRevision(recipe);
            var source = CanonicalRecipeContentStore.InspectSourceRevision(recipe);
            recipe.Ingredients = """["changed"]""";
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => Store(scope.ServiceProvider).ConvertAsync(Id, content, source, Guid.NewGuid()));
            Assert.Null(CanonicalRecipeContentStore.Read(recipe));
            Assert.Equal("""["changed"]""", recipe.Ingredients);
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CanonicalOwner_FencesLegacySqlAndBackfillAndHonorsExplicitEmpty()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            await Seed(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var store = Store(scope.ServiceProvider);
            var initial = await store.ConvertAsync(Id, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            foreach (var sql in new[] { "UPDATE recipes SET ingredients='[\"stale\"]'::jsonb WHERE id={0}",
                "UPDATE recipes SET servings=7 WHERE id={0}", "UPDATE recipes SET raw_metadata=NULL WHERE id={0}",
                "UPDATE recipes SET source_url='https://stale.invalid' WHERE id={0}" })
                await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlRawAsync(sql, Id));
            var cleared = await store.EditAsync(Id, initial.Content.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto {
                ExpectedContentRevision = initial.Content.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()) });
            Assert.Empty(cleared.Content.IngredientLines);
            Assert.Empty(SupperIngredientProjection.Read(recipe, 8));
            Assert.NotNull(recipe.RawMetadata);
            using var client = factory.CreateAuthenticatedClient();
            using var detail = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{Id}"));
            Assert.Equal(0, detail.RootElement.GetProperty("recipe").GetProperty("ingredients").GetArrayLength());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Conversion_DefersTrustedButUnrepresentableFactsWithoutSavingAnything()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.Ingredients = "[\"flour\"]";
            recipe.RawMetadata = """{"recipeIngredient":["flour"],"supply":[{"name":"flour","quantity":200,"unitText":"g"}]}""";
            await db.SaveChangesAsync();
            await db.Entry(recipe).ReloadAsync();
            var before = JsonSerializer.Serialize(recipe);
            await Assert.ThrowsAsync<InvalidDataException>(() => Store(scope.ServiceProvider).ConvertAsync(Id,
                CanonicalRecipeContentStore.InspectContentRevision(recipe), CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid()));
            Assert.Equal(before, JsonSerializer.Serialize(recipe));
            Assert.Empty(await db.CanonicalRecipeOperations.ToListAsync());
        });
    }

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Conversion_PreservesExplicitEmptyAndIndependentlyKnownUnit(bool empty)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.Ingredients = empty ? "[]" : "[\"g flour\"]";
            recipe.RawMetadata = """{"recipeIngredient":["g flour"],"supply":[{"name":"flour","unitText":"g"}]}""";
            await db.SaveChangesAsync();
            var result = await Store(scope.ServiceProvider).ConvertAsync(Id, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            if (empty) Assert.Empty(result.Content.IngredientLines);
            else
            {
                var row = Assert.Single(result.Content.IngredientLines);
                Assert.Null(row.Amount);
                Assert.Null(row.AmountText);
                Assert.Equal("g", row.Unit?.Text);
                Assert.Equal("flour", row.Description);
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ConcurrentEdits_OneCurrentRevisionCommitsWithoutChangingSavedIdentitiesOnReinspection()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            await Seed(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var store = Store(scope.ServiceProvider);
            var converted = await store.ConvertAsync(Id, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            var inspected = await store.ConvertAsync(Id, converted.Content.ContentRevision, converted.Content.SourceRevision, Guid.NewGuid());
            Assert.Equal(JsonSerializer.Serialize(converted.Content), JsonSerializer.Serialize(inspected.Content));
            async Task<bool> Save()
            {
                using var writer = factory.Services.CreateScope();
                try
                {
                    await Store(writer.ServiceProvider).EditAsync(Id, converted.Content.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto {
                        ExpectedContentRevision = converted.Content.ContentRevision, Name = "Winning edit", Servings = 3 });
                    return true;
                }
                catch (RecipeContentConflictException) { return false; }
            }
            var results = await Task.WhenAll(Save(), Save());
            Assert.Single(results, x => x);
            db.ChangeTracker.Clear();
            var current = CanonicalRecipeContentStore.Read(await db.Recipes.SingleAsync(x => x.Id == Id))!;
            Assert.Equal(3, current.Servings);
            Assert.Equal(converted.Content.IngredientLines.Select(x => x.Id), current.IngredientLines.Select(x => x.Id));
            Assert.Equal(3, await db.CanonicalRecipeOperations.CountAsync());
        });
    }

}
