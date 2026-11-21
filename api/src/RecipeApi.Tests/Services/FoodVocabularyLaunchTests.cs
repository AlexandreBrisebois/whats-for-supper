using System.Text;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyLaunchTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task OriginalLaunch_UsesOnlyItsRetainedCapture(bool installed)
    {
        var (intent, reference) = await OriginalLaunch(installed);
        Assert.Equal(reference is null ? [] : new[] { reference }, WorkflowOrchestrator.VocabularyReferences(intent));
        intent.AcceptedAt = null;
        Assert.Equal(reference is null ? [] : new[] { reference }, WorkflowOrchestrator.VocabularyReferences(intent));
        intent.Prepared = null;
        intent.PreparedHash = null;
        Assert.Empty(WorkflowOrchestrator.VocabularyReferences(intent));
    }

    [Theory]
    [InlineData("request-hash")]
    [InlineData("prepared-hash")]
    [InlineData("unsupported-version")]
    [InlineData("missing-recovery-observation")]
    [InlineData("unknown-request-member")]
    [InlineData("duplicate-request-member")]
    [InlineData("missing-task-observation")]
    [InlineData("changed-task")]
    [InlineData("missing-preparation-with-receipt")]
    public async Task InvalidOriginalLaunch_CannotHideOrInventReferences(string change)
    {
        var (intent, _) = await OriginalLaunch(true);
        var request = JsonNode.Parse(intent.Request)!;
        var prepared = JsonNode.Parse(intent.Prepared!)!;
        switch (change)
        {
            case "unsupported-version": request["Version"] = 2; break;
            case "missing-recovery-observation": request.AsObject().Remove("RecoveryOperationId"); break;
            case "unknown-request-member": request["Capture"] = "untrusted"; break;
            case "missing-task-observation": prepared["Tasks"]![0]!.AsObject().Remove("ScheduledAt"); break;
            case "changed-task": prepared["Tasks"]![0]!["Payload"] = "{}"; break;
        }
        intent.Request = request.ToJsonString();
        intent.RequestHash = Hash(intent.Request);
        if (change == "duplicate-request-member")
            intent.Request = intent.Request.Replace("\"Version\":1", "\"Version\":1,\"Version\":1", StringComparison.Ordinal);
        intent.Prepared = prepared.ToJsonString();
        intent.PreparedHash = Hash(intent.Prepared);
        if (change == "request-hash") intent.RequestHash = new string('0', 64);
        if (change == "prepared-hash") intent.PreparedHash = new string('0', 64);
        if (change == "missing-preparation-with-receipt") { intent.Prepared = null; intent.PreparedHash = null; }
        var failure = Record.Exception(() => WorkflowOrchestrator.VocabularyReferences(intent));
        Assert.True(failure is InvalidDataException or JsonException, failure?.ToString() ?? "Malformed launch was admitted.");
    }

    private static string Hash(string value)
    {
        var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!;
        return FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes((string)normalize.Invoke(null, [value])!));
    }

    private static async Task<(WorkflowLaunchIntent Intent, FoodVocabularyReference? Reference)> OriginalLaunch(bool installed)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        await using var db = new RecipeDbContext(options);
        var storage = new InMemoryStorageProvider();
        var clock = new SystemClock();
        FoodVocabularyReference? reference = null;
        if (installed)
        {
            var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            reference = (await TestPublicationStore.Vocabulary(db, storage, clock)
                .PublishReviewedAsync(bytes, null, Guid.NewGuid(), "launch-extractor-review")).NewHead;
        }
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/retained-launch" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
        await storage.SaveAsync("workflows", "url-import.yaml", """
            name: url-import
            parameters: [recipeId, url]
            tasks:
              - name: fetch
                processor: FetchUrlContent
                payload:
                  recipeId: "{{recipeId}}"
            """);
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));
        await orchestrator.TriggerAsync("url-import", new() { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl });
        return (await db.WorkflowLaunchIntents.AsNoTracking().SingleAsync(), reference);
    }
}
