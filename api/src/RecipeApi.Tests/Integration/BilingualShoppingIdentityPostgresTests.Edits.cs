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
    private static UpdateRecipeDto Edit(CanonicalRecipeContent content, string amount,
        RecipeShoppingAssociationDto? shopping = null) => new()
    {
        ExpectedContentRevision = content.ContentRevision,
        IngredientLines = JsonSerializer.SerializeToElement(content.IngredientLines.Select((line, index) => new RecipeIngredientLineInput
        {
            Id = line.Id, Description = line.Description, Amount = index == 0 ? LegacyGroceryQuantity.Parse(amount) : line.Amount,
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
            var original = CanonicalRecipeContentStore.Read(before)!;
            using var client = factory.CreateAuthenticatedClient();
            async Task<CanonicalRecipeContent> Save(UpdateRecipeDto input)
            {
                using var response = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(input), Json);
                Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
                return CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id))!;
            }
            var quantity = await Save(Edit(original, "50"));
            Assert.Equal(original.IngredientLines.Select(x => x.Shopping), quantity.IngredientLines.Select(x => x.Shopping));
            var afterQuantity = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var quantityEvidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(afterQuantity.FoodMappingEvidence!, Json)!;
            Assert.All(quantityEvidence.Mappings, mapping => Assert.Equal(quantity.ContentRevision, mapping.Facts.ContentRevision));
            Assert.Equal(before.RawMetadata, afterQuantity.RawMetadata);
            var retainedOperations = await db.CanonicalRecipeOperations.CountAsync();
            using (var stale = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(original, "999")), Json))
                Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
            var foreign = quantity.IngredientLines[0].Shopping with { FoodId = Guid.NewGuid(), MappingRevision = "foreign-mapping" };
            using (var rejected = await client.PatchAsJsonAsync($"/api/recipes/{imported.Id}", WireEdit(Edit(quantity, "999", foreign)), Json))
                Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            var unchanged = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            Assert.Equal(afterQuantity.CanonicalContent, unchanged.CanonicalContent);
            Assert.Equal(afterQuantity.FoodMappingEvidence, unchanged.FoodMappingEvidence);
            Assert.Equal(retainedOperations, await db.CanonicalRecipeOperations.CountAsync());

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
            Assert.Equal(saved.CanonicalContent, afterReplay.CanonicalContent);
            Assert.Equal(saved.FoodMappingEvidence, afterReplay.FoodMappingEvidence);
            Assert.Equal(before.RawMetadata, afterReplay.RawMetadata);
            Assert.Equal(calls, imported.Provider.Invocations.Count);
            Assert.Equal(BoundedVocabularyInput.Bytes(), (await services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.RawBytes);
        });
}
