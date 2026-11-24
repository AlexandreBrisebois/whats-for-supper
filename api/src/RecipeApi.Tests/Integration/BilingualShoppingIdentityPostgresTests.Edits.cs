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

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("en", "oignon émincé", true)]
    [InlineData("fr", "onion, diced", true)]
    [InlineData("en", "canned tomatoes", false)]
    [InlineData("fr", "échalote", false)]
    public Task OrdinaryPrivateName_OnlyReviewedSameFoodKeepsQualifiedAssociationAndRejectsMissingForeignStaleRevisions(
        string locale, string name, bool retained) => WithHousehold(async factory =>
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
        await vocabulary.PublishReviewedAsync(BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
        var imported = await ImportAsync(services, locale);
        using var client = factory.CreateAuthenticatedClient();
        async Task<RecipeApi.Models.Recipe> Read() => await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
        var before = await Read();
        var content = StructuredRecipeContentStore.Read(before)!;
        async Task Reject(object input, HttpStatusCode status)
        {
            using var response = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", input, Json);
            Assert.Equal(status, response.StatusCode);
            var unchanged = await Read();
            Assert.Equal((before.Name, before.StructuredContent, before.FoodMappingEvidence), (unchanged.Name, unchanged.StructuredContent, unchanged.FoodMappingEvidence));
        }
        // A complete old-client request cannot partially change an unrelated field.
        await Reject(new { name = "must not leak", ingredientLines = Edit(content, "999").IngredientLines }, HttpStatusCode.Conflict);
        await Reject(new { name = "must not leak", expectedContentRevision = "foreign", ingredientLines = Edit(content, "999").IngredientLines }, HttpStatusCode.Conflict);
        var shopping = content.IngredientLines[0].Shopping;
        await Reject(WireEdit(Edit(content, "999", shopping with { MappingRevision = null })), HttpStatusCode.BadRequest);
        await Reject(WireEdit(Edit(content, "999", shopping with { MappingRevision = "foreign" })), HttpStatusCode.BadRequest);
        using (var correction = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(content, "25", shopping with { Name = name })), Json))
            Assert.True(correction.StatusCode == HttpStatusCode.OK, await correction.Content.ReadAsStringAsync());
        var corrected = await Read();
        var current = StructuredRecipeContentStore.Read(corrected)!;
        var line = current.IngredientLines[0];
        Assert.Equal(name, line.Shopping.Name);
        Assert.Equal(retained ? shopping.FoodId : null, line.Shopping.FoodId);
        Assert.Equal(retained, line.Shopping.MappingRevision is not null);
        if (retained) Assert.NotEqual(shopping.MappingRevision, line.Shopping.MappingRevision);
        Assert.Equal(before.RawMetadata, corrected.RawMetadata);
        var decision = Assert.Single(JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(corrected.FoodMappingEvidence!, Json)!.NameDecisions, x => x.IngredientLineId == line.Id);
        Assert.Equal("explicit_private", decision.Kind);
        using (var staleMapping = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(current, "999", shopping)), Json))
            Assert.Equal(HttpStatusCode.BadRequest, staleMapping.StatusCode);
        using (var staleContent = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(content, "999")), Json))
            Assert.Equal(HttpStatusCode.Conflict, staleContent.StatusCode);
        using (var quantity = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(current, "75")), Json))
            Assert.Equal(HttpStatusCode.OK, quantity.StatusCode);
        var saved = await Read();
        var carried = Assert.Single(JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(saved.FoodMappingEvidence!, Json)!.NameDecisions, x => x.IngredientLineId == line.Id);
        Assert.Equal((decision.Kind, decision.DecidingOperationId, decision.MappingRevision), (carried.Kind, carried.DecidingOperationId, carried.MappingRevision));
        var calls = imported.Provider.Invocations.Count;
        await imported.Agent.ExecuteAsync(imported.Extraction, default);
        var replay = await Read();
        Assert.Equal((saved.StructuredContent, saved.FoodMappingEvidence), (replay.StructuredContent, replay.FoodMappingEvidence));
        Assert.Equal(calls, imported.Provider.Invocations.Count);
        Assert.Equal(BoundedVocabularyInput.Bytes(), (await vocabulary.CaptureActiveAsync())!.RawBytes);
    });

    private static UpdateRecipeDto Edit(StructuredRecipeContent content, string amount,
        RecipeShoppingAssociationDto? shopping = null) => new()
    {
        ExpectedContentRevision = content.ContentRevision,
        IngredientLines = JsonSerializer.SerializeToElement(content.IngredientLines.Select((line, index) => new RecipeIngredientLineInput
        {
            Id = line.Id, Description = line.Description, Amount = index == 0 ? QuantityMath.Parse(amount) : line.Amount,
            AmountText = index == 0 ? amount : line.AmountText, Unit = line.Unit, Scaling = line.Scaling, Package = line.Package,
            Shopping = index == 0 ? shopping ?? line.Shopping : line.Shopping
        }), Json)
    };

    private static object WireEdit(UpdateRecipeDto input) => new
    {
        expectedContentRevision = input.ExpectedContentRevision,
        ingredientLines = input.IngredientLines
    };

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task OrdinarySave_QuantityRevisionsProtectPrivateNamesClearsAndRejectStaleForeignAssociations(bool clear) =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(
                BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var imported = await ImportAsync(services, clear ? "fr" : "en");
            var before = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var original = StructuredRecipeContentStore.Read(before)!;
            using var client = factory.CreateAuthenticatedClient();
            async Task<StructuredRecipeContent> Save(UpdateRecipeDto input)
            {
                using var response = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(input), Json);
                Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
                return StructuredRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id))!;
            }
            var quantity = await Save(Edit(original, "50"));
            Assert.Equal(original.IngredientLines.Select(x => x.Shopping), quantity.IngredientLines.Select(x => x.Shopping));
            var afterQuantity = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var quantityEvidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(afterQuantity.FoodMappingEvidence!, Json)!;
            Assert.All(quantityEvidence.Mappings, mapping => Assert.Equal(quantity.ContentRevision, mapping.Facts.ContentRevision));
            Assert.Equal(before.RawMetadata, afterQuantity.RawMetadata);
            var retainedOperations = await db.StructuredRecipeOperations.CountAsync();
            using (var stale = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(original, "999")), Json))
                Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
            var foreign = quantity.IngredientLines[0].Shopping with { FoodId = Guid.NewGuid(), MappingRevision = "foreign-mapping" };
            using (var rejected = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(quantity, "999", foreign)), Json))
                Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            var unchanged = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            Assert.Equal(afterQuantity.StructuredContent, unchanged.StructuredContent);
            Assert.Equal(afterQuantity.FoodMappingEvidence, unchanged.FoodMappingEvidence);
            Assert.Equal(retainedOperations, await db.StructuredRecipeOperations.CountAsync());

            var previousShopping = quantity.IngredientLines[0].Shopping;
            var privateShopping = clear ? new RecipeShoppingAssociationDto(previousShopping.Name, null, null)
                : previousShopping with { Name = "canned tomato" };
            var corrected = await Save(Edit(quantity, "50", privateShopping));
            Assert.Null(corrected.IngredientLines[0].Shopping.FoodId);
            Assert.Null(corrected.IngredientLines[0].Shopping.MappingRevision);
            var correction = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var evidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(correction.FoodMappingEvidence!, Json)!;
            var decision = Assert.Single(evidence.NameDecisions, x => x.IngredientLineId == corrected.IngredientLines[0].Id);
            Assert.Equal(clear ? "protected_clear" : "explicit_private", decision.Kind);
            var following = await Save(Edit(corrected, "75"));
            Assert.Equal(corrected.IngredientLines[0].Shopping, following.IngredientLines[0].Shopping);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var carried = Assert.Single(JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(saved.FoodMappingEvidence!, Json)!.NameDecisions,
                x => x.IngredientLineId == following.IngredientLines[0].Id);
            Assert.Equal(decision.DecidingOperationId, carried.DecidingOperationId);
            Assert.Equal(decision.Kind, carried.Kind);
            Assert.Equal(following.ContentRevision, carried.ContentRevision);
            var calls = imported.Provider.Invocations.Count;
            await imported.Agent.ExecuteAsync(imported.Extraction, default);
            var afterReplay = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            Assert.Equal(saved.StructuredContent, afterReplay.StructuredContent);
            Assert.Equal(saved.FoodMappingEvidence, afterReplay.FoodMappingEvidence);
            Assert.Equal(before.RawMetadata, afterReplay.RawMetadata);
            Assert.Equal(calls, imported.Provider.Invocations.Count);
            Assert.Equal(BoundedVocabularyInput.Bytes(), (await services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.RawBytes);
        });
}
