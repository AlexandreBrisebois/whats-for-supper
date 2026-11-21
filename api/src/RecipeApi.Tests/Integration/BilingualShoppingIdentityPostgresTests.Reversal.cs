using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Reversal_DisablesOnlyFutureMatchingAndRetainsCapturedSavedMappingsAndProtectedTables() =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            var adopted = await vocabulary.PublishReviewedAsync(BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var imported = await ImportAsync(services, "en");
            var before = await CaptureProtectedAsync(services);
            var node = JsonNode.Parse(BoundedVocabularyInput.Bytes())!;
            const string revision = "three-anchor-matching-disabled-rehearsal-v1";
            node["revision"] = revision;
            node["releases"]!.AsArray().Add(new JsonObject
            {
                ["revision"] = revision,
                ["sourceRef"] = "local-reversal-rehearsal:retain-saved-meaning",
                ["foods"] = new JsonArray()
            });
            var reversalBytes = Encoding.UTF8.GetBytes(node.ToJsonString());
            var operation = Guid.NewGuid();
            var outcome = await vocabulary.PublishReviewedAsync(reversalBytes, adopted.NewHead, operation, "local-bounded-reversal-review");
            var after = await CaptureProtectedAsync(services);
            foreach (var table in before.GetProperty("tables").EnumerateObject().Where(x => x.Name != "family_settings"))
                Assert.True(JsonElement.DeepEquals(table.Value, after.GetProperty("tables").GetProperty(table.Name)), table.Name);
            Assert.Null((await vocabulary.CaptureActiveAsync())!.Definitions().Resolve("onion"));
            Assert.Equal(BoundedVocabularyInput.Bytes(), (await vocabulary.LoadCapturedAsync(adopted.NewHead)).RawBytes);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            var following = await services.GetRequiredService<CanonicalRecipeContentStore>()
                .EditAsync(imported.Id, content.SourceRevision, Guid.NewGuid(), Edit(content, "50"));
            Assert.Equal(content.IngredientLines.Select(x => x.Shopping), following.Content.IngredientLines.Select(x => x.Shopping));
            Assert.Equal(outcome, await vocabulary.PublishReviewedAsync(reversalBytes, adopted.NewHead, operation, "local-bounded-reversal-review"));
            output.WriteLine("BILINGUAL_REVERSAL " + JsonSerializer.Serialize(new
            {
                before, after, outcome, operation,
                acceptedBytesBase64 = Convert.ToBase64String(reversalBytes),
                reference = new FoodVocabularyReference(revision, FoodVocabularyDefinitions.Sha256(reversalBytes)),
                savedRecipeId = imported.Id,
                retainedMappingCount = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(saved.FoodMappingEvidence!, Json)!.Mappings.Length,
                rewrittenSavedMappings = 0,
                vocabularyFiles = JsonSerializer.Deserialize<JsonElement>(VocabularyFiles(services))
            }, Json));
        });
}
