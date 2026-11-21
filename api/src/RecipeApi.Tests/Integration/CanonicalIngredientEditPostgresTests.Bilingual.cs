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

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task VocabularyNames_FirstQuantityOnlySaveOfNullSidecarNeverInventsPrivateRenameAndReplayCarriesDecision()
    {
        await WithEditor(async (factory, before) =>
        {
            string rawBefore;
            using (var setup = factory.Services.CreateScope())
            {
                var db = setup.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
                Assert.Null(recipe.FoodMappingEvidence);
                Assert.All(before.IngredientLines, line => Assert.Equal("unknown", line.Provenance.Origin));
                rawBefore = recipe.RawMetadata!;
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                await setup.ServiceProvider.GetRequiredService<FoodVocabularyStore>()
                    .PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:historical-name");
            }
            var request = new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) }
            };
            using var client = factory.CreateAuthenticatedClient();
            using var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var saved = await ReadDeclaredPackageContent(factory);
            Assert.Equal("250", saved.IngredientLines[0].AmountText);
            Assert.Equal(before.SourceRevision, saved.SourceRevision);
            Assert.Equal(JsonSerializer.Serialize(before.InstructionSections, Json), JsonSerializer.Serialize(saved.InstructionSections, Json));
            Assert.Equal(before.IngredientLines.Select(x => x.Shopping), saved.IngredientLines.Select(x => x.Shopping));
            CanonicalRecipeOperation accepted;
            RecipeFoodMappingEvidence evidence;
            string state;
            using (var read = factory.Services.CreateScope())
            {
                var db = read.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
                Assert.Equal(rawBefore, recipe.RawMetadata);
                Assert.NotNull(recipe.FoodMappingEvidence);
                evidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(recipe.FoodMappingEvidence, Json)!;
                var retained = await db.CanonicalRecipeOperations.AsNoTracking().Where(x => x.RecipeId == Id).ToArrayAsync();
                accepted = Assert.Single(retained, x => x.OriginalRequest != null
                    && x.OriginalRequest.Contains(before.ContentRevision, StringComparison.Ordinal)
                    && x.Result.Contains(saved.ContentRevision, StringComparison.Ordinal));
                Assert.Empty(evidence.Mappings);
                Assert.All(evidence.NameDecisions, decision =>
                {
                    Assert.Equal("legacy_ambiguous", decision.Kind); // RED: quantity Save currently invents explicit_private.
                    Assert.Equal(accepted.OperationId, decision.DecidingOperationId);
                    Assert.Equal(saved.ContentRevision, decision.ContentRevision);
                });
                state = JsonSerializer.Serialize(recipe, Json);
            }
            // The public PATCH generates its operation ID internally. Replay the
            // actual accepted operation through its canonical owner, without
            // reseeding history or pretending HTTP exposes an idempotency key.
            using (var replay = factory.Services.CreateScope())
            {
                var db = replay.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var count = await db.CanonicalRecipeOperations.CountAsync();
                var input = JsonSerializer.Deserialize<UpdateRecipeDto>(JsonSerializer.Serialize(request, Json), Json)!;
                var result = await replay.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>()
                    .EditAsync(Id, before.SourceRevision, accepted.OperationId, input);
                Assert.Equal(saved.ContentRevision, result.Content.ContentRevision);
                Assert.Equal(count, await db.CanonicalRecipeOperations.CountAsync());
                Assert.Equal(state, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id), Json));
            }
            using var following = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = saved.ContentRevision,
                ingredientLines = new[] { Row(saved.IngredientLines[0], "300"), Row(saved.IngredientLines[1]) }
            });
            Assert.Equal(HttpStatusCode.OK, following.StatusCode);
            using var finalScope = factory.Services.CreateScope();
            var finalRecipe = await finalScope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var finalEvidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(finalRecipe.FoodMappingEvidence!, Json)!;
            Assert.All(finalEvidence.NameDecisions, decision =>
            {
                Assert.Equal("legacy_ambiguous", decision.Kind);
                Assert.Equal(accepted.OperationId, decision.DecidingOperationId);
                Assert.Equal(CanonicalRecipeContentStore.Read(finalRecipe)!.ContentRevision, decision.ContentRevision);
            });
            Assert.Equal(rawBefore, finalRecipe.RawMetadata);
        });
    }
}
