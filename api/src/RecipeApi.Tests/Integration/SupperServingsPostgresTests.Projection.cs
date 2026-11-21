using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    private static readonly JsonSerializerOptions ProjectionWebJson = new(JsonSerializerDefaults.Web);

    private static RecipeIngredientLineDto ProjectionLine(string description, string? amount, string? unit = null, string? shoppingName = null) => new()
    {
        Id = Guid.NewGuid(),
        Description = description,
        Amount = amount is null ? null : QuantityMath.Parse(amount),
        AmountText = amount,
        Unit = unit is null ? null : new(unit, null),
        Scaling = "proportional",
        Package = null,
        Shopping = new(shoppingName ?? description, null, null),
        Provenance = new("source", "source-v1", [])
    };

    private static string BuildProjectionCanonical(int? basis, params RecipeIngredientLineDto[] lines) =>
        JsonSerializer.Serialize(new CanonicalRecipeContent(2, Guid.NewGuid().ToString("N"), "source-v1", basis, lines, []), ProjectionWebJson);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Projection_ProposedDateUsesSavedFourThenSixWithoutWrites()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe
            {
                Name = "Pasta",
                Servings = 2,
                Ingredients = "[\"200 g pasta\",\"Salt to taste\"]",
                RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\",\"Salt to taste\"],\"supply\":[{\"name\":\"pasta\",\"requiredQuantity\":{\"value\":200,\"unitText\":\"g\"}},{\"name\":\"Salt\",\"requiredQuantity\":null}]}",
                CanonicalContent = BuildProjectionCanonical(2, ProjectionLine("pasta", "200", "g"), ProjectionLine("Salt to taste", null))
            };
            db.Recipes.Add(recipe);
            db.FamilySettings.Add(new FamilySetting { Key = "supper_servings_default", Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            db.SupperServings.Add(new SupperServing { Date = Wednesday.AddDays(2), OverrideServings = 6 });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Project(string date)
            {
                var response = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate={date}&context=proposed");
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();
            }
            var four = await Project("2026-10-14");
            Assert.Equal(4, four.GetProperty("targetServings").GetInt32());
            Assert.Equal(400, four.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.Equal("unquantified", four.GetProperty("lines")[1].GetProperty("status").GetString());
            Assert.Equal(0, four.GetProperty("lines")[1].GetProperty("issues").GetArrayLength());
            var six = await Project("2026-10-16");
            Assert.Equal(600, six.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.NotEqual(four.GetProperty("version").GetString(), six.GetProperty("version").GetString());
            db.ChangeTracker.Clear();
            Assert.Empty(await db.CalendarEvents.ToListAsync());
            Assert.Empty(await db.WeeklyPlans.ToListAsync());
            Assert.Empty(await db.WorkflowInstances.ToListAsync());
            Assert.Single(await db.SupperServings.ToListAsync());
            Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings);
            Assert.Equal(new[] { "200 g pasta", "Salt to taste" }, JsonSerializer.Deserialize<string[]>((await db.Recipes.SingleAsync()).Ingredients!));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Projection_ValidatesContextAndCapturedOccurrence()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Pasta", Servings = 2, Ingredients = "[]" };
            var occurrence = new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id };
            db.Recipes.Add(recipe); db.CalendarEvents.Add(occurrence); await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            using var scheduleRead = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12"));
            Assert.Equal(occurrence.Id, scheduleRead.RootElement.GetProperty("data").GetProperty("days")[2].GetProperty("occurrenceId").GetGuid());
            var path = $"/api/recipes/{recipe.Id}/ingredient-projection";
            foreach (var query in new[] { "?context=proposed", "?supperDate=not-a-date&context=proposed", "?supperDate=2026-10-14&context=other", "?supperDate=2026-10-14&context=assigned", "?supperDate=2026-10-14&context=proposed&targetServings=100" })
                Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(path + query)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync(path + $"?supperDate=2026-10-14&context=assigned&occurrenceId={Guid.NewGuid()}")).StatusCode);
            var response = await client.GetAsync(path + $"?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
            Assert.Equal(occurrence.Id, result.GetProperty("occurrenceId").GetGuid());
            Assert.Equal("scaled", result.GetProperty("status").GetString());
            Assert.Equal(1, result.GetProperty("targetServings").GetInt32());
            Assert.Equal(0.5, result.GetProperty("factor").GetDouble());
            db.CalendarEvents.Remove(occurrence);
            var recreated = new CalendarEvent {Date = Wednesday, RecipeId = recipe.Id};
            db.CalendarEvents.Add(recreated); await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync(path + $"?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(path + $"?supperDate=2026-10-14&context=assigned&occurrenceId={recreated.Id}")).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Empty(await db.SupperServings.ToListAsync()); Assert.Empty(await db.WeeklyPlans.ToListAsync());
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Projection_SourceShapesRetainFractionsPackagesAndHonestFallbacks()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.FamilySettings.Add(new FamilySetting { Key = "supper_servings_default", Value = JsonSerializer.SerializeToElement(new { servings = 6 }) });
            var recipes = new[] {
                new Recipe { Name="Fraction", Servings=2, Ingredients="[\"1/2 cup flour\"]", RawMetadata="{\"ingredients\":[\"1/2 cup flour\"],\"supply\":[{\"name\":\"flour\",\"quantity\":0.5,\"unitText\":\"cup\"}]}", CanonicalContent=BuildProjectionCanonical(2, ProjectionLine("flour", "1/2", "cup")) },
                new Recipe { Name="Package", Servings=2, Ingredients="[\"2 cans tomatoes (400 g each)\"]", RawMetadata="{\"recipeIngredient\":[\"2 cans tomatoes (400 g each)\"],\"supply\":[{\"name\":\"tomatoes (400 g each)\",\"requiredQuantity\":{\"value\":2,\"unitText\":\"cans\"}}]}", CanonicalContent=BuildProjectionCanonical(2, ProjectionLine("tomatoes (400 g each)", "2", "cans")) },
                new Recipe { Name="IndependentEdit", Servings=2, Ingredients="[\"300 g current pasta\"]", RawMetadata="{\"recipeIngredient\":[\"200 g old pasta\"],\"supply\":[{\"name\":\"old pasta\",\"quantity\":200,\"unitText\":\"g\"}]}", CanonicalContent=BuildProjectionCanonical(2, ProjectionLine("current pasta", "300", "g")) },
                new Recipe { Name="UnquantifiedLine", Servings=2, Ingredients="[\"pasta\"]", CanonicalContent=BuildProjectionCanonical(2, ProjectionLine("pasta", null)) },
                new Recipe { Name="Unknown basis", Ingredients="[\"200 g pasta\"]", RawMetadata="{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}", CanonicalContent=BuildProjectionCanonical(null, ProjectionLine("pasta", "200", "g")) },
            };
            var populatedV1 = new Recipe { Name = "Populated V1", Servings = 2, Ingredients = "[\"200 g pasta\"]" };
            db.Recipes.AddRange(recipes);
            db.Recipes.Add(populatedV1);
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var results = new List<JsonElement>();
            foreach(var recipe in recipes) {
                var response=await client.GetAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=proposed");
                Assert.Equal(HttpStatusCode.OK,response.StatusCode);
                results.Add(JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone());
            }
            Assert.Equal(1.5,results[0].GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.Equal("cup",results[0].GetProperty("lines")[0].GetProperty("unitText").GetString());
            Assert.Equal(6,results[1].GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.Contains("400 g each",results[1].GetProperty("lines")[0].GetProperty("name").GetString());
            Assert.Equal("300 g current pasta",results[2].GetProperty("lines")[0].GetProperty("originalText").GetString());
            Assert.Equal(900,results[2].GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.Empty(results[2].GetProperty("lines")[0].GetProperty("issues").EnumerateArray());
            Assert.Equal("scaled",results[2].GetProperty("status").GetString());
            Assert.Equal("unquantified",results[3].GetProperty("lines")[0].GetProperty("status").GetString());
            Assert.Equal(JsonValueKind.Null,results[3].GetProperty("lines")[0].GetProperty("quantity").ValueKind);
            Assert.Equal("unresolved",results[4].GetProperty("status").GetString());
            Assert.Equal("missing_basis",results[4].GetProperty("lines")[0].GetProperty("issues")[0].GetString());
            Assert.Equal(JsonValueKind.Null,results[4].GetProperty("lines")[0].GetProperty("quantity").ValueKind);
            var failResponse = await client.GetAsync($"/api/recipes/{populatedV1.Id}/ingredient-projection?supperDate=2026-10-14&context=proposed");
            Assert.Equal(HttpStatusCode.InternalServerError, failResponse.StatusCode);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Projection_MalformedAlignedLineDoesNotDiscardReliableSibling()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Mixed", Servings = 2,
                Ingredients = "[\"200 g pasta\",\"sauce\"]",
                RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\",\"sauce\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"},{\"name\":\"\",\"quantity\":10}]}",
                CanonicalContent = BuildProjectionCanonical(2, ProjectionLine("pasta", "200", "g"), ProjectionLine("sauce", null)) };
            db.Recipes.Add(recipe);
            db.FamilySettings.Add(new FamilySetting { Key = "supper_servings_default", Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=proposed");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
            Assert.Equal("scaled", result.GetProperty("status").GetString());
            Assert.Equal(400, result.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.Equal("sauce", result.GetProperty("lines")[1].GetProperty("originalText").GetString());
            Assert.Equal("unquantified", result.GetProperty("lines")[1].GetProperty("status").GetString());
            Assert.Equal(JsonValueKind.Null, result.GetProperty("lines")[1].GetProperty("quantity").ValueKind);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Projection_RejectsIncompleteCalendarWeek()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Pasta", Servings = 2, Ingredients = "[]" };
            db.Recipes.Add(recipe); await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=9999-12-31&context=proposed");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Projection_GroceriesShareCoherenceAndExposeIncompleteKnownSubtotal()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var known = new Recipe { Name = "Known", Servings = 2, Ingredients = "[\"200 g pasta\",\"Salt to taste\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\",\"Salt to taste\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"},{\"name\":\"salt\"}]}", CanonicalContent = BuildProjectionCanonical(2, ProjectionLine("pasta", "200", "g"), ProjectionLine("Salt to taste", null, shoppingName: "salt")) };
            var unknown = new Recipe { Name = "Unknown", Servings = 2, Ingredients = "[\"pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"pasta\"],\"supply\":[{\"name\":\"pasta\",\"unitText\":\"g\"}]}", CanonicalContent = BuildProjectionCanonical(2, ProjectionLine("pasta", null, "g")) };
            var stale = new Recipe { Name = "Stale", Servings = 2, Ingredients = "[\"current sauce\"]", RawMetadata = "{\"recipeIngredient\":[\"old sauce\"],\"supply\":[{\"name\":\"old sauce\",\"quantity\":100,\"unitText\":\"g\"}]}", CanonicalContent = BuildProjectionCanonical(2, ProjectionLine("current sauce", null)) };
            db.Recipes.AddRange(known, unknown, stale);
            db.CalendarEvents.AddRange(new CalendarEvent { Date = Wednesday, RecipeId = known.Id }, new CalendarEvent { Date = Wednesday.AddDays(1), RecipeId = unknown.Id }, new CalendarEvent { Date = Wednesday.AddDays(2), RecipeId = stale.Id });
            db.FamilySettings.Add(new FamilySetting { Key = "supper_servings_default", Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<RecipeApi.Services.GroceryRecomputeService>().RecomputeForWeekAsync(Wednesday.AddDays(-2), default);
            db.ChangeTracker.Clear();
            var plan = await db.WeeklyPlans.SingleAsync();
            var rows = JsonDocument.Parse(plan.GroceryItems).RootElement.EnumerateArray().ToList();
            var pasta = rows.Single(x => x.GetProperty("normalizedKey").GetString() == "pasta");
            Assert.Equal(400, pasta.GetProperty("quantity").ExactScalar());
            Assert.False(pasta.GetProperty("quantityComplete").GetBoolean());
            Assert.False(rows.Single(x => x.GetProperty("normalizedKey").GetString() == "salt").GetProperty("quantityComplete").GetBoolean());
            Assert.DoesNotContain(rows, x => x.GetProperty("displayName").GetString() == "old sauce");
            var sauce = rows.Single(x => x.GetProperty("displayName").GetString() == "current sauce");
            Assert.Equal(JsonValueKind.Null, sauce.GetProperty("quantity").ValueKind);
            Assert.False(sauce.GetProperty("quantityComplete").GetBoolean());
        });
    }

}
