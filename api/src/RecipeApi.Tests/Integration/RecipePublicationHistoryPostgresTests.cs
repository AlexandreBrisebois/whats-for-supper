using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipePublicationHistoryPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task OriginalFieldsAndResultsSurviveJsonbAndFreshDestinationChanges() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            Guid operation; Guid id;
            string original;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var owner = scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>();
                var repository = scope.ServiceProvider.GetRequiredService<RecipeRepository>();
                var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original", Notes = "private", RotationHumanOff = true,
                    RotationSource = "Human", RawMetadata = "{\"extension\":{\"b\":null,\"a\":1}}", Ingredients = "[]" };
                db.Recipes.Add(recipe); await db.SaveChangesAsync(); id = recipe.Id;
                await repository.SaveInfoAsync(new RecipeInfo { Id = id }, default);
                var capture = await owner.CaptureAsync(id); operation = Guid.NewGuid();
                await owner.PublishAsync(capture, new RecipePublicationCandidate("{\"ingredients\":[\"salt\"]}",
                    new RecipeInfo { Id = id, Name = "Published" }), operation);
                original = (await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Payload;
                recipe.Name = "Later human"; recipe.Notes = null; await db.SaveChangesAsync();
            }
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var journal = await db.RecipeFilePublications.SingleAsync(x => x.OperationId == operation);
                Assert.Equal(original, journal.Payload);
                RecipePublicationHistoryTests.ValidateOriginalJournal(journal);
                var wire = JsonNode.Parse(journal.Payload)!;
                Assert.True(wire["result"]!["rotationHumanOff"]!.GetValue<bool>());
                Assert.Equal("private", wire["result"]!["notes"]!.GetValue<string>());
                // Rehashing an altered result cannot turn it into the operation's
                // actual accepted fields: recompute from the original capture.
                wire["result"]!["notes"] = "invented result";
                journal.ResultHash = Hash(wire["result"]!); journal.Payload = wire.ToJsonString();
                await db.SaveChangesAsync();
                Assert.Throws<InvalidDataException>(() => RecipePublicationHistoryTests.ValidateOriginalJournal(journal));
                Assert.Equal("Later human", (await db.Recipes.SingleAsync(x => x.Id == id)).Name);
            }
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task DisposableRecipeRetirementRetainsOriginalAuthoritativePublication() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            Guid id; string original;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var owner = scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>();
                var repository = scope.ServiceProvider.GetRequiredService<RecipeRepository>();
                id = Guid.NewGuid();
                db.Recipes.Add(new Recipe { Id = id, Name = "Disposable fixture", Notes = "original human" });
                await db.SaveChangesAsync(); await repository.SaveInfoAsync(new RecipeInfo { Id = id }, default);
                await owner.PublishAsync(await owner.CaptureAsync(id), new RecipePublicationCandidate("{}",
                    new RecipeInfo { Id = id, Name = "Published fixture" }), Guid.NewGuid());
                original = (await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Payload;
                // Publication uses local disposable storage in this factory;
                // deletion must exercise that same file owner rather than its
                // unrelated in-memory IRecipeStore replacement.
                var files = new LocalRecipeStore(scope.ServiceProvider.GetRequiredService<RecipesRootResolver>(),
                    NullLogger<LocalRecipeStore>.Instance);
                var images = new ImageService(files, NullLogger<ImageService>.Instance);
                await ActivatorUtilities.CreateInstance<RecipeService>(scope.ServiceProvider, images).DeleteRecipe(id);
            }
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                Assert.False(await db.Recipes.IgnoreQueryFilters().AnyAsync(x => x.Id == id));
                Assert.Empty(await db.RecipeFilePublications.ToArrayAsync());
                var retention = await db.RecipePhysicalDeletions.SingleAsync(x => x.RecipeId == id);
                Assert.NotNull(retention.CompletedAt);
                using var saved = JsonDocument.Parse(retention.Payload);
                var publication = saved.RootElement.GetProperty("publications").EnumerateArray().Single()
                    .Deserialize<RecipeFilePublication>(JsonDefaults.CamelCase)!;
                Assert.Equal(original, publication.Payload);
                RecipePublicationHistoryTests.ValidateOriginalJournal(publication);
            }
        });

    private static string Hash(JsonNode node)
    {
        using var document = JsonDocument.Parse(node.ToJsonString());
        object? Order(JsonElement value) => value.ValueKind switch
        {
            JsonValueKind.Object => value.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal).ToDictionary(x => x.Name, x => Order(x.Value)),
            JsonValueKind.Array => value.EnumerateArray().Select(Order).ToArray(),
            _ => value.Clone()
        };
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(Order(document.RootElement)))));
    }
}
