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
    private static StructuredRecipeContentStore Store(IServiceProvider services) => new(
        services.GetRequiredService<RecipeDbContext>(), services.GetRequiredService<IClock>(),
        services.GetRequiredService<SupperProjectionInvalidation>(), services.GetRequiredService<FoodVocabularyStore>());

    private static async Task Seed(IServiceProvider services)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        await TomorrowPushPostgresTests.ResetToLegacyAsync(db, Id, recipe =>
        {
            recipe.Servings = null;
            recipe.Ingredients = """["⅓ cup flour","mystery garnish","2–3 cloves garlic","salt","salt"]""";
            recipe.RawMetadata = """{"recipeIngredient":["⅓ cup flour","mystery garnish","2–3 cloves garlic","salt","salt"],"supply":[{"name":"garlic","quantity":2,"unitText":"cloves"},{"name":"flour","quantity":0.33,"unitText":"cup"},{"name":"salt","quantity":9}],"recipeInstructions":[{"@type":"HowToStep","text":"Mix."}]}""";
        });
    }

    private static async Task<StructuredRecipeContent> SeedStructuredAsync(IServiceProvider services)
    {
        await Seed(services);
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        var (content, _) = StructuredRecipeContentStore.FromSchemaOrg(
            Id,
            recipe.RawMetadata!,
            recipe.SourceUrl,
            authority: null,
            origin: "unknown",
            explicitServings: recipe.Servings,
            overrideIngredientTexts: RecipeService.DeserializeIngredients(recipe.Ingredients));
        recipe.StructuredContent = JsonSerializer.Serialize(content, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        await db.SaveChangesAsync();
        return content;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task GuardedEdit_ReordersSavedRowsMapsNewIdsAndRejectsStaleAtomicPayload()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var initial = await SeedStructuredAsync(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var store = Store(scope.ServiceProvider);
            var flour = initial.IngredientLines[0];
            var garlic = initial.IngredientLines[2];
            object Existing(RecipeIngredientLineDto row, string description) => new {
                id = row.Id, description, amount = row.Amount, amountText = row.AmountText, unit = row.Unit,
                scaling = row.Scaling, package = row.Package, shopping = row.Shopping };
            var input = new UpdateRecipeDto {
                ExpectedContentRevision = initial.ContentRevision, Name = "Saved name", Notes = "Saved note", Servings = 4,
                IngredientLines = JsonSerializer.SerializeToElement(new object[] {
                    Existing(garlic, "garlic, peeled"), Existing(flour, "flour"),
                    new { clientId = "new-row", description = "oil", amount = (object?)null, amountText = (string?)null,
                        unit = new { text = "tsp", definitionId = (string?)null }, scaling = "proportional", package = (object?)null,
                        shopping = new { name = "oil", foodId = (string?)null, mappingRevision = (string?)null } } }) };
            var operation = Guid.NewGuid();
            var result = await store.EditAsync(Id, initial.SourceRevision, operation, input);
            Assert.Equal(new[] { garlic.Id, flour.Id, result.CreatedIds["new-row"] }, result.Content.IngredientLines.Select(x => x.Id));
            Assert.NotEqual(initial.ContentRevision, result.Content.ContentRevision);
            Assert.Equal(initial.SourceRevision, result.Content.SourceRevision);
            Assert.Equal("Saved name", recipe.Name);
            Assert.Equal("Saved note", recipe.Notes);
            Assert.Equal("unknown", result.Content.IngredientLines[1].Provenance.Origin);
            Assert.Equal("human", result.Content.IngredientLines[0].Provenance.Origin);
            Assert.Equal(4, recipe.Servings);
            Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(await store.EditAsync(Id, initial.SourceRevision, operation, input)));
            var retainedOperation = await db.StructuredRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == operation);
            var originalProperty = typeof(StructuredRecipeOperation).GetProperty("OriginalRequest");
            Assert.NotNull(originalProperty);
            using var originalRequest = JsonDocument.Parse(Assert.IsType<string>(originalProperty.GetValue(retainedOperation)));
            Assert.True(originalRequest.RootElement.GetProperty("hasServings").GetBoolean());
            switch (originalRequest.RootElement.GetProperty("version").GetInt32())
            {
                case 1:
                    Assert.Equal(initial.ContentRevision, originalRequest.RootElement.GetProperty("expectedContentRevision").GetString());
                    Assert.Equal(initial.SourceRevision, originalRequest.RootElement.GetProperty("expectedSourceRevision").GetString());
                    break;
                case 2:
                    using (var submitted = JsonDocument.Parse(originalRequest.RootElement.GetProperty("input").GetString()!))
                        Assert.Equal(initial.ContentRevision, submitted.RootElement.GetProperty("expectedContentRevision").GetString());
                    using (var baseline = JsonDocument.Parse(originalRequest.RootElement.GetProperty("baseline").GetProperty("canonicalContent").GetString()!))
                    {
                        Assert.Equal(initial.ContentRevision, baseline.RootElement.GetProperty("contentRevision").GetString());
                        Assert.Equal(initial.SourceRevision, baseline.RootElement.GetProperty("sourceRevision").GetString());
                    }
                    break;
                default:
                    Assert.Fail("Unsupported retained canonical request version.");
                    break;
            }
            input.Name = "Must not save";
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(Id, initial.SourceRevision, operation, input));
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(Id, initial.SourceRevision, Guid.NewGuid(), input));
            using var client = factory.CreateAuthenticatedClient();
            var rejected = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { name = "Old full editor", notes = "Bad note", ingredients = new[] { "stale" } });
            Assert.Equal(HttpStatusCode.Conflict, rejected.StatusCode);
            using var afterScope = factory.Services.CreateScope();
            var after = await afterScope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal("Saved name", after.Name);
            Assert.Equal("Saved note", after.Notes);
            Assert.Equal(JsonSerializer.Serialize(result.Content), JsonSerializer.Serialize(StructuredRecipeContentStore.Read(after)));
            Assert.Equal("pending", (await db.RecipeSearchDocuments.SingleAsync(x => x.RecipeId == Id)).IndexStatus);
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
            var initial = await SeedStructuredAsync(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var store = Store(scope.ServiceProvider);
            foreach (var sql in new[] { "UPDATE recipes SET ingredients='[\"stale\"]'::jsonb WHERE id={0}",
                "UPDATE recipes SET servings=7 WHERE id={0}", "UPDATE recipes SET raw_metadata=NULL WHERE id={0}",
                "UPDATE recipes SET source_url='https://stale.invalid' WHERE id={0}" })
                await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlRawAsync(sql, Id));
            var cleared = await store.EditAsync(Id, initial.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto {
                ExpectedContentRevision = initial.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()) });
            Assert.Empty(cleared.Content.IngredientLines);
            Assert.Empty(SupperIngredientProjection.Read(recipe, 8));
            Assert.NotNull(recipe.RawMetadata);
            using var client = factory.CreateAuthenticatedClient();
            using var detail = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{Id}"));
            Assert.Equal(0, detail.RootElement.GetProperty("recipe").GetProperty("ingredients").GetArrayLength());
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
            var converted = await SeedStructuredAsync(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            async Task<bool> Save()
            {
                using var writer = factory.Services.CreateScope();
                try
                {
                    await Store(writer.ServiceProvider).EditAsync(Id, converted.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto {
                        ExpectedContentRevision = converted.ContentRevision, Name = "Winning edit", Servings = 3 });
                    return true;
                }
                catch (RecipeContentConflictException) { return false; }
            }
            var results = await Task.WhenAll(Save(), Save());
            Assert.Single(results, x => x);
            db.ChangeTracker.Clear();
            var current = StructuredRecipeContentStore.Read(await db.Recipes.SingleAsync(x => x.Id == Id))!;
            Assert.Equal(3, current.Servings);
            Assert.Equal(converted.IngredientLines.Select(x => x.Id), current.IngredientLines.Select(x => x.Id));
            Assert.Equal(1, await db.StructuredRecipeOperations.CountAsync());
        });
    }

}
