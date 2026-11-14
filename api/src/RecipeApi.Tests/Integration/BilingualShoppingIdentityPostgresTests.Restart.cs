using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("missing")]
    [InlineData("raw-sha")]
    [InlineData("revision")]
    [InlineData("unsupported")]
    public Task ReferencedFileFailureNeverRegeneratesReseedsOrRewritesSavedMappings(string change) =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var storage = services.GetRequiredService<IStorageProvider>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            var installed = await vocabulary.PublishReviewedAsync(BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var imported = await ImportAsync(services, "en");
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var membership = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            var reference = installed.NewHead;
            var key = $".household/food-vocabulary/{reference.Revision}-{reference.Sha256}.json";
            if (change == "missing") await storage.DeleteAtomicallyAsync("recipes", key);
            else
            {
                var node = JsonNode.Parse(BoundedVocabularyInput.Bytes())!;
                if (change == "revision")
                {
                    node["revision"] = "foreign-document-revision";
                    node["releases"]![0]!["revision"] = "foreign-document-revision";
                }
                else if (change == "unsupported") node["version"] = 99;
                else node["sourceRef"] = "raw-bytes-tampered";
                var bytes = Encoding.UTF8.GetBytes(node.ToJsonString());
                await storage.SaveAtomicallyAsync("recipes", key, bytes);
                if (change is "revision" or "unsupported")
                {
                    var foreign = reference with { Sha256 = FoodVocabularyDefinitions.Sha256(bytes) };
                    await storage.SaveAtomicallyAsync("recipes", $".household/food-vocabulary/{foreign.Revision}-{foreign.Sha256}.json", bytes);
                    await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.LoadCapturedAsync(foreign));
                }
            }
            var files = VocabularyFiles(services);
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(
                BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), "forbidden-reseed"));
            Assert.Equal(files, VocabularyFiles(services));
            Assert.Equal(membership, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
            var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            Assert.Equal(saved.CanonicalContent, after.CanonicalContent);
            Assert.Equal(saved.FoodMappingEvidence, after.FoodMappingEvidence);
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task IndependentApplicationRestartLoadsExactSavedFilesAndRevisionsWithProvidersUnavailable() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var root = Path.Combine(Path.GetTempPath(), "wfs-bounded-restart-" + Guid.NewGuid().ToString("N"));
            var configuration = new Dictionary<string, string?>
            {
                ["Calendar:TimeZone"] = "America/Toronto",
                ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                ["Tests:LocalRecipeStore"] = "true",
                ["RecipesRoot"] = root
            };
            Guid id;
            string canonical;
            string evidence;
            string files;
            string membership;
            try
            {
                await using (var first = await TestWebApplicationFactory.CreateWithAuthAsync(
                    new DeploymentCalendarIntegrationTests.CalendarClock(), configuration))
                {
                    await TomorrowPushPostgresTests.Seed(first);
                    using var scope = first.Services.CreateScope();
                    var services = scope.ServiceProvider;
                    await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(
                        BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
                    var imported = await ImportAsync(services, "fr");
                    id = imported.Id;
                    var db = services.GetRequiredService<RecipeDbContext>();
                    var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                    var content = CanonicalRecipeContentStore.Read(recipe)!;
                    var saved = await services.GetRequiredService<CanonicalRecipeContentStore>()
                        .EditAsync(id, content.SourceRevision, Guid.NewGuid(), Edit(content, "50"));
                    await services.GetRequiredService<ScheduleService>().AssignRecipeAsync(new(0, 0, id),
                        referenceWeekStartDate: new DateOnly(2026, 10, 12));
                    recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                    canonical = recipe.CanonicalContent!;
                    evidence = recipe.FoodMappingEvidence!;
                    files = VocabularyFiles(services);
                    membership = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
                    Assert.Equal(saved.Content.ContentRevision, CanonicalRecipeContentStore.Read(recipe)!.ContentRevision);
                }
                var provider = new Mock<IChatClient>(MockBehavior.Strict);
                var network = new Mock<IHttpClientFactory>(MockBehavior.Strict);
                await using (var restarted = await TestWebApplicationFactory.CreateWithAuthAsync(
                    new DeploymentCalendarIntegrationTests.CalendarClock(), configuration, configureServices: registrations =>
                    {
                        registrations.RemoveAll<IChatClient>();
                        registrations.AddSingleton(provider.Object);
                        registrations.RemoveAll<IHttpClientFactory>();
                        registrations.AddSingleton(network.Object);
                    }))
                {
                    using var scope = restarted.Services.CreateScope();
                    var services = scope.ServiceProvider;
                    var db = services.GetRequiredService<RecipeDbContext>();
                    var captured = await services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync();
                    Assert.Equal(BoundedVocabularyInput.Reference, captured!.Reference);
                    Assert.Equal(BoundedVocabularyInput.Bytes(), captured.RawBytes);
                    await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
                    using var client = restarted.CreateAuthenticatedClient();
                    using var response = await client.GetAsync($"/api/recipes/{id}");
                    response.EnsureSuccessStatusCode();
                    var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                    Assert.Equal(canonical, recipe.CanonicalContent);
                    Assert.Equal(evidence, recipe.FoodMappingEvidence);
                    Assert.Equal(membership, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
                    Assert.Equal(files, VocabularyFiles(services));
                    Assert.Empty(provider.Invocations);
                    Assert.Empty(network.Invocations);
                    output.WriteLine("BILINGUAL_RESTART " + JsonSerializer.Serialize(new
                    {
                        id, reference = captured.Reference, canonicalSha256 = FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(canonical)),
                        evidenceSha256 = FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(evidence)),
                        vocabularyFiles = JsonSerializer.Deserialize<JsonElement>(files), providerCalls = provider.Invocations.Count, networkCalls = network.Invocations.Count
                    }, Json));
                }
                await VerifyProgramRestartsAsync(settings.ConnectionString, root, id, canonical, evidence, files, membership);
            }
            finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
        });
}
