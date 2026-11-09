using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;
using Microsoft.AspNetCore.Builder;

namespace RecipeApi.Tests.Integration;

// Explicit test-only composition. Production has no canonical store registration.
public sealed partial class CanonicalIngredientEditPostgresTests(ITestOutputHelper output)
{
    private static readonly Guid Id = TomorrowPushPostgresTests.Selected;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    internal async Task WithEditor(Func<TestWebApplicationFactory, CanonicalRecipeContent, Task> check,
        Action<WebApplication>? configureApplication = null, string? sourceUrl = null)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                {
                    ["Calendar:TimeZone"] = "America/Toronto",
                    ["Tests:HttpUrl"] = configureApplication is null ? null : "http://127.0.0.1:0",
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString
                }, configureApplication: configureApplication,
                configureServices: services => services.AddScoped<CanonicalRecipeContentStore>());
            await TomorrowPushPostgresTests.Seed(factory);
            CanonicalRecipeContent content;
            using (var scope = factory.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.SourceUrl = sourceUrl ?? recipe.SourceUrl;
                recipe.Servings = 4;
                recipe.Ingredients = "[\"200 g pasta\",\"100 ml sauce\"]";
                recipe.RawMetadata = """{"recipeIngredient":["200 g pasta","100 ml sauce"],"supply":[{"name":"pasta","quantity":200,"unitText":"g"},{"name":"sauce","quantity":100,"unitText":"ml"}],"recipeInstructions":[{"@type":"HowToStep","text":"Mix pasta and sauce."}]}""";
                await db.SaveChangesAsync();
                content = (await services.GetRequiredService<CanonicalRecipeContentStore>().ConvertAsync(Id,
                    CanonicalRecipeContentStore.InspectContentRevision(recipe),
                    CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid())).Content;
            }
            await check(factory, content);
        });
    }

    private static RecipeIngredientLineInput Row(RecipeIngredientLineDto row, string? amount = null) => new()
    {
        Id = row.Id, Description = row.Description,
        Amount = amount is null ? row.Amount : LegacyGroceryQuantity.Parse(amount),
        AmountText = amount ?? row.AmountText, Unit = row.Unit, Scaling = row.Scaling,
        Package = row.Package, Shopping = row.Shopping
    };

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task MixedContentAndHouseholdFeedbackCommitAtomicallyWithExistingRotationRules()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision, name = "Family correction", rating = 3,
                isDiscoverable = true, mealTypes = new[] { "Supper" },
                ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) }
            });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal(RecipeApi.Models.RecipeRating.Love, saved.Rating);
            Assert.True(saved.IsDiscoverable);
            Assert.False(saved.RotationHumanOff);
            Assert.False(saved.CookedSuppressed);
            Assert.Equal("Human", saved.RotationSource);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal("250", content.IngredientLines[0].AmountText);
            var baseline = JsonSerializer.Serialize(saved);
            var operations = await db.CanonicalRecipeOperations.CountAsync();
            foreach (var invalid in new object[]
            {
                new { expectedContentRevision = content.ContentRevision, name = "Invalid rating", rating = 4, ingredientLines = Array.Empty<object>() },
                new { expectedContentRevision = content.ContentRevision, name = "Invalid suitability", isDiscoverable = true, mealTypes = new[] { "Lunch" }, ingredientLines = Array.Empty<object>() }
            })
                Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", invalid)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision, name = "Stale", rating = 1,
                isDiscoverable = false, ingredientLines = Array.Empty<object>()
            })).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(baseline, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task BasisOnlyEditUsesTheSameCanonicalGuardAndPreservesOriginalRowsAndSource()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { expectedContentRevision = before.ContentRevision, servings = 5, rating = 2 })).StatusCode);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(5, content.Servings);
            Assert.Equal(5, saved.Servings);
            Assert.NotEqual(before.ContentRevision, content.ContentRevision);
            Assert.Equal(before.SourceRevision, content.SourceRevision);
            Assert.Equal(JsonSerializer.Serialize(before.IngredientLines), JsonSerializer.Serialize(content.IngredientLines));
            Assert.Equal(RecipeApi.Models.RecipeRating.Like, saved.Rating);
            foreach (var revision in new string?[] { before.ContentRevision, null })
                Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                { expectedContentRevision = revision, servings = 6, rating = 1 })).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(5, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).Servings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task MixedIncompleteBaselineKeepsItsCheckWhileAnUnrelatedKnownIncreaseResets()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var extra = Row(before.IngredientLines[0]) with
            {
                Id = null, ClientId = "unknown-contributor", Description = "Additional pasta",
                Amount = null, AmountText = null
            };
            var first = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), extra }
            });
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
            var monday = new DateOnly(2026, 10, 12);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            var pastaId = await GroceryTestRows.CheckAsync(client, monday, "pasta");
            var sauceId = await GroceryTestRows.CheckAsync(client, monday, "sauce");
            string acknowledged;
            CanonicalRecipeContent current;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
                acknowledged = baselines.RootElement.GetProperty(pastaId).GetRawText();
                Assert.False(baselines.RootElement.GetProperty(pastaId).GetProperty("QuantityComplete").GetBoolean());
                current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            }
            var completed = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = current.ContentRevision,
                ingredientLines = new[] { Row(current.IngredientLines[0], "250"), Row(current.IngredientLines[1], "150"), Row(current.IngredientLines[2], "100") }
            });
            Assert.Equal(HttpStatusCode.OK, completed.StatusCode);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            var reread = await GroceryTestRows.ReadAsync(client, monday);
            Assert.Equal(pastaId, GroceryTestRows.Id(reread, "pasta"));
            Assert.True(reread.GetProperty("groceryState").GetProperty(pastaId).GetBoolean());
            Assert.False(reread.GetProperty("groceryState").GetProperty(sauceId).GetBoolean());
            using var final = factory.Services.CreateScope();
            var saved = await final.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            using var retained = JsonDocument.Parse(saved.GroceryCheckedDemandBaselines);
            Assert.Equal(acknowledged, retained.RootElement.GetProperty(pastaId).GetRawText());
            Assert.False(retained.RootElement.TryGetProperty(sauceId, out _));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FullEditor_SaveReturnsAuthoritativeOriginalAndDatedProjectionWithoutChangingSauceOrSource()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var payload = new UpdateRecipeDto
            {
                ExpectedContentRevision = before.ContentRevision, Name = "Family pasta",
                Description = "Corrected description", CuisineType = "Italian", MealTypes = ["Supper"],
                IngredientLines = JsonSerializer.SerializeToElement(new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) }, Json)
            };
            var wire = System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(payload, Json))!.AsObject();
            wire.Remove("servings"); // The public contract uses omission for an unchanged/unknown basis.
            var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", wire);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var returned = body.RootElement.GetProperty("recipe");
            Assert.All(before.IngredientLines, row =>
            {
                Assert.Equal("unknown", row.Provenance.Origin);
                Assert.Null(row.Provenance.SourceRef);
                Assert.Contains("amountText", row.Provenance.ProtectedFields);
            });
            Assert.Equal("human", returned.GetProperty("ingredientLines")[0].GetProperty("provenance").GetProperty("origin").GetString());
            Assert.Contains(returned.GetProperty("ingredientLines")[0].GetProperty("provenance").GetProperty("protectedFields").EnumerateArray(), field => field.GetString() == "amountText");
            Assert.Equal("Family pasta", returned.GetProperty("name").GetString());
            Assert.Equal("250 g pasta", returned.GetProperty("ingredients")[0].GetString());
            Assert.NotEqual(before.ContentRevision, returned.GetProperty("contentRevision").GetString());
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(before.SourceRevision, content.SourceRevision);
            Assert.Equal(before.IngredientLines.Select(x => x.Id), content.IngredientLines.Select(x => x.Id));
            Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[1]), JsonSerializer.Serialize(content.IngredientLines[1]));
            Assert.Equal(before.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id), content.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id));
            Assert.Equal("Corrected description", saved.Description);
            Assert.Equal("Italian", saved.CuisineType);
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), SupperIngredientProjection.Read(saved, 8)[0].GroceryObservation.Quantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("200"), SupperIngredientProjection.Read(saved, 8)[1].GroceryObservation.Quantity);
            Assert.Equal("pending", (await db.RecipeSearchDocuments.SingleAsync(x => x.RecipeId == Id)).IndexStatus);
            var persisted = JsonSerializer.Serialize(saved);
            var operations = await db.CanonicalRecipeOperations.CountAsync();
            for (var i = 0; i < 2; i++) Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/recipes/{Id}")).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(persisted, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task StaleAndMissingContentGuardRejectEveryEditorFieldAndOldFullPayload()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            foreach (var revision in new string?[] { null, "stale" })
            {
                var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = revision, name = "Must not save", description = "Must not save",
                    cuisineType = "Bad", mealTypes = new[] { "Lunch" }, servings = 8,
                    ingredientLines = new[] { Row(before.IngredientLines[0], "250") }
                });
                Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            }
            var old = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { name = "Old full editor", ingredients = new[] { "old" } });
            Assert.Equal(HttpStatusCode.Conflict, old.StatusCode);
            var oldFull = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { name = "Old full editor with basis", servings = 4, ingredients = new[] { "old" }, rating = 1 });
            Assert.Equal(HttpStatusCode.Conflict, oldFull.StatusCode);
            using var scope = factory.Services.CreateScope();
            var saved = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal(JsonSerializer.Serialize(before), JsonSerializer.Serialize(CanonicalRecipeContentStore.Read(saved)));
            Assert.NotEqual("Must not save", saved.Name);
            Assert.NotEqual("Must not save", saved.Description);
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SavedIngredientAndOccurrence_ContinueCheckedRowAcrossIncompatibleUnitsWithoutRebaselining()
    {
        await WithEditor(async (factory, before) =>
        {
            var monday = new DateOnly(2026, 10, 12);
            using var client = factory.CreateAuthenticatedClient();
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            await GroceryTestRows.CheckAsync(client, monday, "pasta");
            string oldId, beforeSplitId, baseline;
            using (var scope = factory.Services.CreateScope())
            {
                var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                oldId = rows.Single(x => x.NormalizedKey == "pasta").RowId;
                baseline = plan.GroceryCheckedDemandBaselines;
            }
            var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0], "2") with { Unit = new("cup", null) }, Row(before.IngredientLines[1]) }
            });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            using var after = factory.Services.CreateScope();
            var saved = await after.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var pasta = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(saved.GroceryItems)!.Single(x => x.NormalizedKey == "pasta");
            Assert.Equal(oldId, pasta.RowId);
            Assert.True(JsonSerializer.Deserialize<Dictionary<string, bool>>(saved.GroceryState)![oldId]);
            Assert.Equal(baseline, saved.GroceryCheckedDemandBaselines);

            // Accent-stripped fallback text is not proof of unchanged purchase meaning.
            var beforeLabel = CanonicalRecipeContentStore.Read(await after.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            var relabel = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { expectedContentRevision = beforeLabel.ContentRevision,
                ingredientLines = new[] { Row(beforeLabel.IngredientLines[0]) with { Shopping = new("pásta", null, null) }, Row(beforeLabel.IngredientLines[1]) } });
            Assert.Equal(HttpStatusCode.OK, relabel.StatusCode);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            using (var scope = factory.Services.CreateScope())
            {
                var relabeled = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var replacement = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(relabeled.GroceryItems)!.Single(x => x.NormalizedKey == "pasta");
                beforeSplitId = replacement.RowId;
                Assert.NotEqual(oldId, replacement.RowId);
                Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>(relabeled.GroceryState)![replacement.RowId]);
            }

            // A new second bucket creates a structural split: neither successor
            // inherits the prior purchase acknowledgement, even with shared names.
            var current = CanonicalRecipeContentStore.Read(await after.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            var split = new RecipeIngredientLineInput { ClientId = "split-row", Description = "pasta", Amount = LegacyGroceryQuantity.Parse("1"), AmountText = "1", Unit = new("g", null),
                Scaling = "proportional", Package = null, Shopping = current.IngredientLines[0].Shopping };
            var splitResponse = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { expectedContentRevision = current.ContentRevision,
                ingredientLines = new[] { Row(current.IngredientLines[0]), Row(current.IngredientLines[1]), split } });
            Assert.Equal(HttpStatusCode.OK, splitResponse.StatusCode);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            using var splitScope = factory.Services.CreateScope();
            var splitPlan = await splitScope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var successors = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(splitPlan.GroceryItems)!.Where(x => x.NormalizedKey == "pasta").ToArray();
            Assert.Equal(2, successors.Length);
            Assert.All(successors, row => Assert.NotEqual(beforeSplitId, row.RowId));
            var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(splitPlan.GroceryState)!;
            Assert.All(successors, row => Assert.False(checks[row.RowId]));
            var splitContent = CanonicalRecipeContentStore.Read(await splitScope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            var mergeResponse = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { expectedContentRevision = splitContent.ContentRevision,
                ingredientLines = new[] { Row(splitContent.IngredientLines[0]) with { Unit = new("g", null) }, Row(splitContent.IngredientLines[1]), Row(splitContent.IngredientLines[2]) } });
            Assert.Equal(HttpStatusCode.OK, mergeResponse.StatusCode);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            using var mergeScope = factory.Services.CreateScope();
            var mergedPlan = await mergeScope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var merged = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(mergedPlan.GroceryItems)!.Single(x => x.NormalizedKey == "pasta");
            Assert.DoesNotContain(merged.RowId, successors.Select(x => x.RowId));
            Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>(mergedPlan.GroceryState)![merged.RowId]);

        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CompleteRows_KeepZeroUnknownUnitOnlyFractionsRangesAndServerCreatedIds()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var forms = new[] { ("zero", "0", "g"), ("Fresh basil leaves", (string?)null, (string?)null),
                ("unit only", (string?)null, "tsp"), ("count", "⅓", (string?)null), ("range", "2–3", "cloves") };
            var rows = forms.Select((form, index) => new { clientId = $"draft-{index}", description = form.Item1,
                amount = form.Item2 is null ? null : LegacyGroceryQuantity.Parse(form.Item2), amountText = form.Item2,
                unit = form.Item3 is null ? null : new RecipeUnitDto(form.Item3, null), scaling = "proportional", package = (object?)null,
                shopping = new RecipeShoppingAssociationDto(form.Item1, null, null) }).ToArray();
            var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { expectedContentRevision = before.ContentRevision,
                description = "", cuisineType = "", mealTypes = Array.Empty<string>(), ingredientLines = rows });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var savedRows = result.RootElement.GetProperty("recipe").GetProperty("ingredientLines");
            for (var i = 0; i < forms.Length; i++)
            {
                Assert.Equal(forms[i].Item2, savedRows[i].GetProperty("amountText").GetString());
                Assert.Equal(savedRows[i].GetProperty("id").GetGuid(), result.RootElement.GetProperty("createdIds").GetProperty($"draft-{i}").GetGuid());
            }
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal("", saved.Description); Assert.Equal("", saved.CuisineType); Assert.Empty(saved.MealTypes!);
            Assert.Equal("Supper", saved.Category); Assert.Equal(4, saved.Servings);
            var store = scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>();
            var content = CanonicalRecipeContentStore.Read(saved)!;
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(Id, "stale-source", Guid.NewGuid(),
                new UpdateRecipeDto { ExpectedContentRevision = content.ContentRevision, Name = "Must not save", IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()) }));
            db.ChangeTracker.Clear();
            Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).CanonicalContent);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HumanShoppingLabelCorrection_IsSavedAndProtectedWithoutCreatingFoodMapping()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0]) with { Shopping = new("whole wheat pasta", null, null) }, Row(before.IngredientLines[1]) } });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var row = body.RootElement.GetProperty("recipe").GetProperty("ingredientLines")[0];
            Assert.Equal("whole wheat pasta", row.GetProperty("shopping").GetProperty("name").GetString());
            Assert.Equal(JsonValueKind.Null, row.GetProperty("shopping").GetProperty("foodId").ValueKind);
            Assert.Contains(row.GetProperty("provenance").GetProperty("protectedFields").EnumerateArray(), x => x.GetString() == "shopping");
        });
    }

}
