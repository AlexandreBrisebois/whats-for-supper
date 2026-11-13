using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Integration;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Fact]
    public Task CanonicalV2History_ActualProducerAttemptRetainsValidatedResult() =>
        CheckCanonicalV2HistoryAsync(Memory());

    internal static async Task CheckCanonicalV2HistoryAsync(Action<DbContextOptionsBuilder> configure)
    {
        var (attempt, operation) = await ProduceCanonicalV2HistoryAsync(configure);
        using var request = JsonDocument.Parse(operation.OriginalRequest!);
        using var result = JsonDocument.Parse(operation.Result);
        Assert.Equal(2, request.RootElement.GetProperty("version").GetInt32());
        Assert.Equal(2, result.RootElement.GetProperty("version").GetInt32());
        Assert.NotEmpty(request.RootElement.GetProperty("foodAuthority").GetProperty("captures").EnumerateArray());
        Assert.True(ValidateCanonicalOperation(operation));
        var original = (operation.OriginalRequest, operation.Result, operation.InputHash,
            attempt.Request, attempt.RequestHash, attempt.Outcome, attempt.OutcomeHash);
        // Actual worker observation and actual canonical V2 producer have already
        // succeeded. This existing retained-history read is the intended RED.
        ValidateProcessorAttempt(attempt);
        Assert.Equal(original, (operation.OriginalRequest, operation.Result, operation.InputHash,
            attempt.Request, attempt.RequestHash, attempt.Outcome, attempt.OutcomeHash));
    }

    [Theory]
    [InlineData("unknown-version")]
    [InlineData("missing-result")]
    [InlineData("missing-evidence")]
    [InlineData("extra-field")]
    [InlineData("changed-content")]
    [InlineData("changed-raw-capture")]
    public async Task CanonicalV2History_CorruptOrUnknownWrapperCannotBecomeOldResult(string fault)
    {
        var (attempt, _) = await ProduceCanonicalV2HistoryAsync(Memory());
        var outcome = JsonNode.Parse(attempt.Outcome!)!;
        var operation = outcome["canonicalOperations"]![0]!;
        var result = JsonNode.Parse(operation["result"]!.GetValue<string>())!;
        switch (fault)
        {
            case "unknown-version": result["version"] = 99; break;
            case "missing-result": result.AsObject().Remove("result"); break;
            case "missing-evidence": result.AsObject().Remove("evidence"); break;
            case "extra-field": result["foreign"] = true; break;
            case "changed-content": result["result"]!["content"]!["sourceRevision"] = "foreign"; break;
            case "changed-raw-capture":
                var request = JsonNode.Parse(operation["originalRequest"]!.GetValue<string>())!;
                request["foodAuthority"]!["captures"]![0]!["rawBytes"] = Convert.ToBase64String([0]);
                operation["originalRequest"] = request.ToJsonString();
                operation["inputHash"] = HistoryHash(operation["originalRequest"]!.GetValue<string>());
                break;
        }
        operation["result"] = result.ToJsonString();
        attempt.Outcome = outcome.ToJsonString();
        attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        var error = Assert.Throws<TargetInvocationException>(() => ValidateProcessorAttempt(attempt));
        Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
    }

    [Fact]
    public void CanonicalV2History_PinnedActualV1ResultKeepsOriginalBytes()
    {
        var file = Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/canonical-old-authority-v1-v3.json");
        var raw = File.ReadAllBytes(file);
        Assert.Equal("ed94bb7c6d31232b24c7e9a0004b02f8ebf86892bb8618709c7795816cdc37c0",
            Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(raw)));
        using var document = JsonDocument.Parse(raw);
        foreach (var observed in document.RootElement.GetProperty("proofs")[0].GetProperty("operations").EnumerateArray())
        {
            var operation = observed.Deserialize<CanonicalRecipeOperation>()!;
            var before = (operation.OriginalRequest, operation.Result, operation.InputHash);
            Assert.True(ValidateCanonicalOperation(operation));
            // This additive owner-reader control is run after the actual-path RED;
            // no missing-method failure is counted as behavioral evidence.
            var reader = typeof(CanonicalRecipeContentStore).GetMethod("ReadValidatedRetainedResult",
                BindingFlags.Static | BindingFlags.NonPublic)!;
            Assert.NotNull(reader);
            var saved = Assert.IsType<CanonicalRecipeWriteResult>(reader.Invoke(null, [operation]));
            var original = JsonSerializer.Deserialize<CanonicalRecipeWriteResult>(operation.Result,
                new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            Assert.Equal(JsonSerializer.Serialize(original), JsonSerializer.Serialize(saved));
            Assert.Equal(before, (operation.OriginalRequest, operation.Result, operation.InputHash));
        }
    }

    private static bool ValidateCanonicalOperation(CanonicalRecipeOperation operation) =>
        Assert.IsType<bool>(typeof(CanonicalRecipeContentStore).GetMethod("ValidateOriginalOperation",
            BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [operation]));

    private static void ValidateProcessorAttempt(WorkflowProcessorAttempt attempt) =>
        typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!.Invoke(null, [attempt]);

    private static async Task<(WorkflowProcessorAttempt Attempt, CanonicalRecipeOperation Operation)>
        ProduceCanonicalV2HistoryAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Retained source", Servings = 4,
            Ingredients = "[\"25 g onion\"]", RawMetadata = "{\"recipeIngredient\":[\"25 g onion\"]}",
            CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.Recipes.Add(recipe);
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe", recipe.Id);
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        var vocabulary = TestPublicationStore.Vocabulary(db, storage, fixture.Clock);
        var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-only:retained-history-input");
        fixture.OnExecute = async _ =>
        {
            await using var producerDb = fixture.CreateDb();
            var current = await producerDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id);
            var owner = new CanonicalRecipeContentStore(producerDb, fixture.Clock,
                new SupperProjectionInvalidation(producerDb, fixture.Clock, new DeploymentCalendar(new ConfigurationManager())),
                TestPublicationStore.Vocabulary(producerDb, storage, fixture.Clock));
            await owner.ConvertAsync(recipe.Id, CanonicalRecipeContentStore.InspectContentRevision(current),
                CanonicalRecipeContentStore.InspectSourceRevision(current), task.TaskId);
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var attempt = Assert.Single(await read.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync());
        var operation = await read.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == task.TaskId);
        Assert.NotNull(attempt.Outcome);
        var currentRecipe = await read.Recipes.SingleAsync(x => x.Id == recipe.Id);
        currentRecipe.Notes = "Newer unrelated live correction";
        read.CanonicalRecipeOperations.Remove(operation);
        await read.SaveChangesAsync();
        Assert.False(await read.CanonicalRecipeOperations.AnyAsync(x => x.OperationId == task.TaskId));
        return (attempt, operation);
    }
}

public sealed class CanonicalV2HistoryPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CanonicalV2History_ActualProducerAttemptRetainsValidatedResult() =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckCanonicalV2HistoryAsync(builder => builder.UseNpgsql(settings.ConnectionString)));
}
