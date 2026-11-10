using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

/// <summary>Staged-client safety before recovery-qualified canonical write activation.</summary>
public class CanonicalIngredientConversionPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task LegacyGet_DoesNotAllocateIdentitiesOrChangeStoredFacts()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            var id = TomorrowPushPostgresTests.Selected;
            string before;
            using (var scope = factory.Services.CreateScope())
                before = JsonSerializer.Serialize(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                    .Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
            using var client = factory.CreateAuthenticatedClient();
            for (var i = 0; i < 2; i++)
            {
                using var read = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{id}"));
                var recipe = read.RootElement.GetProperty("recipe");
                Assert.True(recipe.TryGetProperty("contentSchemaVersion", out var version), "Reads explicitly identify legacy ownership.");
                Assert.Equal(JsonValueKind.Null, version.ValueKind);
                Assert.Equal(JsonValueKind.Null, recipe.GetProperty("ingredientLines").ValueKind);
                Assert.Equal(JsonValueKind.Null, recipe.GetProperty("instructionSections").ValueKind);
            }
            using var afterScope = factory.Services.CreateScope();
            Assert.Equal(before, JsonSerializer.Serialize(await afterScope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                .Recipes.AsNoTracking().SingleAsync(x => x.Id == id)));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CanonicalPayloadBeforeActivation_IsAtomicUpgradeConflict()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            var id = TomorrowPushPostgresTests.Selected;
            string before;
            using (var scope = factory.Services.CreateScope())
                before = JsonSerializer.Serialize(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                    .Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
            foreach (var collection in new[] { "ingredientLines", "instructionSections" })
            {
            var response = await client.PatchAsJsonAsync($"/api/recipes/{id}", new Dictionary<string, object?>
            {
                ["name"] = "Must not partially save", ["notes"] = "Must not partially save either",
                ["servings"] = 7, ["expectedContentRevision"] = "not-activated", [collection] = Array.Empty<object>()
            });
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            using var error = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("recipe_content_conflict", error.RootElement.GetProperty("code").GetString());
            Assert.True(error.RootElement.GetProperty("upgradeRequired").GetBoolean());
            Assert.False(string.IsNullOrWhiteSpace(error.RootElement.GetProperty("currentContentRevision").GetString()));
            using var afterScope = factory.Services.CreateScope();
            Assert.Equal(before, JsonSerializer.Serialize(await afterScope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                .Recipes.AsNoTracking().SingleAsync(x => x.Id == id)));
            }
            factory.WorkflowOrchestratorMock.VerifyNoOtherCalls();
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ConvertedRecipe_DefaultCompositionEditsGuardedFactsAndRetainsStaleClientFences()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            var id = TomorrowPushPostgresTests.Selected;
            CanonicalRecipeContent converted;
            using (var scope = factory.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
                // Explicit forward conversion sets up saved IDs; neither GET nor
                // the ordinary edit request may silently convert legacy content.
                var store = new CanonicalRecipeContentStore(db, services.GetRequiredService<IClock>(), services.GetRequiredService<SupperProjectionInvalidation>());
                converted = (await store.ConvertAsync(id, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                    CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid())).Content;
            }
            using var client = factory.CreateAuthenticatedClient();
            var old = Assert.Single(converted.IngredientLines);
            var line = new RecipeApi.Dto.RecipeIngredientLineInput { Id = old.Id, Description = old.Description,
                Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2", Unit = new("cup", null),
                Scaling = old.Scaling, Package = old.Package, Shopping = old.Shopping };
            var response = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            { expectedContentRevision = converted.ContentRevision, ingredientLines = new[] { line } });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string before;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var current = CanonicalRecipeContentStore.Read(saved)!;
                Assert.Equal(old.Id, Assert.Single(current.IngredientLines).Id);
                Assert.Equal("2", current.IngredientLines[0].AmountText);
                Assert.NotEqual(converted.ContentRevision, current.ContentRevision);
                before = JsonSerializer.Serialize(saved);
            }
            foreach (var payload in new object[]
            {
                new { name = "Must not save", ingredientLines = new[] { line } },
                new { name = "Must not save", expectedContentRevision = converted.ContentRevision, ingredientLines = new[] { line } },
                new { name = "Must not save", ingredients = new[] { "Old unguarded strings" } },
                new { name = "Must not save", recipeInstructions = "Old unguarded instructions" }
            })
            {
                Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{id}", payload)).StatusCode);
                using var scope = factory.Services.CreateScope();
                Assert.Equal(before, JsonSerializer.Serialize(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == id)));
            }
        });
    }
}
