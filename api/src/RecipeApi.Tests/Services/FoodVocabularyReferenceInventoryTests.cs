using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyReferenceInventoryTests
{
    [Theory]
    [InlineData("reset")]
    [InlineData("attempt")]
    [InlineData("retirement")]
    [InlineData("repair")]
    [InlineData("child")]
    [InlineData("physical")]
    public Task AbsentMembership_RejectsEveryIndependentRetainedOwner(string owner) => CheckAbsentMembership(owner);

    [Fact]
    public Task PhysicalCurrentWriter_UsesExplicitEvidenceVersion() => CheckAbsentMembership("physical", expectedPhysicalVersion: 2);

    [Fact]
    public async Task HistoricalPhysicalV1_AbsentLaterColumnStillAllowsGenuineFirstInstall()
    {
        var raw = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/physical-retirement-old-v1.json"));
        Assert.Equal("72aab55552cbbdd72c7d546d0eef5f779e67d4f6400fb18f494135f87debf062", Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(raw)));
        using var fixture = JsonDocument.Parse(raw);
        Assert.Equal("6a0850700507afb8e3be1184cc79ca33bbadb4f9", fixture.RootElement.GetProperty("generatorSource").GetString());
        var original = fixture.RootElement.GetProperty("physical").Deserialize<RecipePhysicalDeletion>()!;
        using var payload = JsonDocument.Parse(original.Payload);
        Assert.Equal(1, payload.RootElement.GetProperty("version").GetInt32());
        Assert.False(payload.RootElement.GetProperty("recipe").TryGetProperty("foodMappingEvidence", out _));
        var options = new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new RecipeDbContext(options);
        db.RecipePhysicalDeletions.Add(original);
        await db.SaveChangesAsync();
        var vocabulary = TestPublicationStore.Vocabulary(db, new InMemoryStorageProvider(), new SystemClock());
        Assert.Empty(FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary)));
        Assert.Null(await vocabulary.CaptureActiveAsync());
        var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "historical-physical-first-install");
        var retained = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
        Assert.Equal((original.Payload, original.PayloadHash, original.RecipeHash, original.CompletedAt),
            (retained.Payload, retained.PayloadHash, retained.RecipeHash, retained.CompletedAt));
    }

    [Fact]
    public async Task TransitionalPhysicalV1_PreservesExplicitMappedAuthorityAndRejectsReseeding()
    {
        var raw = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/physical-retirement-core-v1.json"));
        Assert.Equal("823bb2d7530d24640d4c234b6994505effee390f20cdb8a3c60a191ebc2cd54a", Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(raw)));
        using var fixture = JsonDocument.Parse(raw);
        var original = fixture.RootElement.GetProperty("physical").Deserialize<RecipePhysicalDeletion>()!;
        using var payload = JsonDocument.Parse(original.Payload);
        Assert.Equal(1, payload.RootElement.GetProperty("version").GetInt32());
        Assert.Equal(JsonValueKind.String, payload.RootElement.GetProperty("recipe").GetProperty("foodMappingEvidence").ValueKind);
        await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.RecipePhysicalDeletions.Add(original);
        await db.SaveChangesAsync();
        var vocabulary = TestPublicationStore.Vocabulary(db, new InMemoryStorageProvider(), new SystemClock());
        var references = FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary));
        Assert.Contains(references, x => x.OwnerKind == "physical-retirement");
        await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
        Assert.Equal(original.Payload, (await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync()).Payload);
    }

    [Fact]
    public async Task PhysicalV2_ExplicitNullEvidenceRemainsUnreferenced()
    {
        await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
        var clock = new SystemClock();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Unmapped current retirement" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var configuration = new ConfigurationManager { ["DataRoot"] = Path.Combine(Path.GetTempPath(), "wfs-inventory-null-" + Guid.NewGuid().ToString("N")) };
        var roots = new RecipesRootResolver(new DataRootResolver(configuration), configuration);
        await (Task)Method("RecipePhysicalLifecycle", "DeleteAsync").Invoke(null,
            [db, recipe.Id, "delete", clock, roots, (Func<Recipe, bool>)(_ => true),
            (Func<Task<bool?>>)(() => Task.FromResult<bool?>(false)), null, null, null, CancellationToken.None])!;
        var retired = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
        using var payload = JsonDocument.Parse(retired.Payload);
        Assert.Equal(2, payload.RootElement.GetProperty("version").GetInt32());
        Assert.True(payload.RootElement.GetProperty("recipe").TryGetProperty("foodMappingEvidence", out var observed));
        Assert.Equal(JsonValueKind.Null, observed.ValueKind);
        var vocabulary = TestPublicationStore.Vocabulary(db, new InMemoryStorageProvider(), clock);
        Assert.Empty(FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary)));
        Assert.Null(await vocabulary.CaptureActiveAsync());
    }

    [Fact]
    public Task MaintenanceHistory_PreservesResolvedRetirementLink() => CheckAbsentMembership("maintenance-linked");

    [Fact]
    public Task MaintenanceHistory_RejectsUnresolvedRetirementLink() => CheckAbsentMembership("maintenance");

    [Theory]
    [InlineData("reset", false)]
    [InlineData("attempt", false)]
    [InlineData("retirement", false)]
    [InlineData("repair", false)]
    [InlineData("child", false)]
    [InlineData("physical", false)]
    [InlineData("reset", true)]
    [InlineData("attempt", true)]
    [InlineData("retirement", true)]
    [InlineData("repair", true)]
    [InlineData("child", true)]
    [InlineData("physical", true)]
    public Task MalformedRetainedOwner_CannotBeTreatedAsUnreferenced(string owner, bool missingObservation) =>
        CheckAbsentMembership(owner, missingObservation: missingObservation);

    internal static async Task CheckAbsentMembership(string owner,
        Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null, bool? missingObservation = null, int? expectedPhysicalVersion = null)
    {
        var builder = new DbContextOptionsBuilder<RecipeDbContext>();
        if (configure is null) builder.UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
        else configure(builder);
        await using var db = new RecipeDbContext(builder.Options);
        var storage = new InMemoryStorageProvider();
        var clock = new SystemClock();
        var vocabulary = TestPublicationStore.Vocabulary(db, storage, clock);
        var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        var installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "reference-owner-review");
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/reference-owner",
            Ingredients = "[\"10 g onion\"]", RawMetadata = "{\"recipeIngredient\":[\"10 g onion\"],\"recipeInstructions\":[{\"text\":\"Mix.\"}]}" };
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
        var parameters = new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl };
        var workflow = await orchestrator.TriggerAsync("url-import", parameters);
        var task = Assert.Single(workflow.Tasks);
        switch (owner)
        {
            case "reset":
                await (Task)Method("WorkflowReset", "RecordAsync").Invoke(null, [db, task, workflow, clock.UtcNow, CancellationToken.None])!;
                break;
            case "attempt":
                Method("WorkflowProcessorHistory", "Begin").Invoke(null, [db, task, workflow, clock.UtcNow]);
                break;
            case "retirement":
            case "maintenance":
            case "maintenance-linked":
                var retirementOperation = Guid.NewGuid();
                await (Task)Method("WorkflowLifecycle", "RetainAsync").Invoke(null,
                    [db, workflow, "pruned", retirementOperation, clock.UtcNow, CancellationToken.None, null])!;
                if (owner.StartsWith("maintenance", StringComparison.Ordinal))
                {
                    await db.SaveChangesAsync();
                    var command = new MaintenanceCommand { Id = retirementOperation, CommandType = "PruneWorkflows",
                        Status = "completed", CreatedAt = clock.UtcNow, CompletedAt = clock.UtcNow };
                    await (Task)Method("MaintenanceCommandLifecycle", "RetainAsync").Invoke(null,
                        [db, command, "pruned", Guid.NewGuid(), clock.UtcNow, CancellationToken.None])!;
                    if (owner == "maintenance") db.WorkflowLifecycleRecords.Remove(await db.WorkflowLifecycleRecords.SingleAsync());
                }
                break;
            case "repair":
                db.RecipeRepairIntents.Add((RecipeRepairIntent)Method("RecipeReportRepairIntent", "Create").Invoke(null,
                    [workflow.Id, recipe.Id, workflow.WorkflowId, parameters, workflow, clock.UtcNow])!);
                break;
            case "child":
                await storage.SaveAsync("workflows", "parent.yaml", """
                    name: parent
                    parameters: []
                    tasks:
                      - name: child
                        processor: StartWorkflow
                        payload:
                          workflowId: url-import
                    """);
                var parent = await orchestrator.TriggerAsync("parent", []);
                await orchestrator.TriggerChildAsync(Assert.Single(parent.Tasks), "url-import", parameters);
                break;
            case "physical":
                var canonical = new CanonicalRecipeContentStore(db, clock,
                    new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new ConfigurationManager())), vocabulary);
                await canonical.ConvertAsync(recipe.Id, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                    CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
                var configuration = new ConfigurationManager { ["DataRoot"] = Path.Combine(Path.GetTempPath(), "wfs-inventory-" + Guid.NewGuid().ToString("N")) };
                var roots = new RecipesRootResolver(new DataRootResolver(configuration), configuration);
                await (Task)Method("RecipePhysicalLifecycle", "DeleteAsync").Invoke(null,
                    [db, recipe.Id, "delete", clock, roots, (Func<Recipe, bool>)(_ => true),
                    (Func<Task<bool?>>)(() => Task.FromResult<bool?>(false)), null, null, null, CancellationToken.None])!;
                if (expectedPhysicalVersion is { } expectedVersion)
                {
                    var generated = await db.RecipePhysicalDeletions.AsNoTracking().SingleAsync();
                    using var physicalPayload = JsonDocument.Parse(generated.Payload);
                    Assert.Equal(expectedVersion, physicalPayload.RootElement.GetProperty("version").GetInt32());
                }
                break;
        }
        await db.SaveChangesAsync();
        // Isolate each actual retained owner after its normal capture. These
        // fixture removals model independent retention without altering its bytes.
        db.WorkflowInstances.RemoveRange(await db.WorkflowInstances.Where(x => owner != "child" || x.WorkflowId != "parent").ToListAsync());
        db.WorkflowLaunchIntents.RemoveRange(await db.WorkflowLaunchIntents.Where(x => owner != "child" || x.Id == workflow.Id).ToListAsync());
        db.CanonicalRecipeOperations.RemoveRange(await db.CanonicalRecipeOperations.ToListAsync());
        db.RecipeFilePublications.RemoveRange(await db.RecipeFilePublications.ToListAsync());
        db.FamilySettings.Remove(await db.FamilySettings.SingleAsync(x => x.Key == "food_vocabulary_publication"));
        await db.SaveChangesAsync();
        if (owner != "physical") Assert.Null((await db.Recipes.SingleAsync()).CanonicalContent);
        if (missingObservation is { } missing) await CorruptOwnerAsync(db, owner, missing);
        var retainedBefore = await RetainedRows(db, owner);
        if (!owner.StartsWith("maintenance", StringComparison.Ordinal)) Assert.Contains(installed.NewHead.Sha256, retainedBefore);
        Assert.Null(await db.FamilySettings.AsNoTracking().SingleOrDefaultAsync(x => x.Key == "food_vocabulary_publication"));

        var observation = (Task<FoodVocabularyInventoryFacts>)typeof(FoodVocabularyStore)
            .GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(vocabulary, [CancellationToken.None])!;
        var facts = await observation;
        var inventoryFailure = Record.Exception(() =>
        {
            var origins = FoodVocabularyInventoryQualification.RequiredReferences(facts);
            if (owner == "maintenance") return;
            var originKind = owner switch { "attempt" => "processor-attempt", "retirement" => "workflow-retirement",
                "physical" => "physical-retirement", "maintenance-linked" => "workflow-retirement", _ => owner };
            Assert.Contains(origins, x => x.Reference == installed.NewHead && x.OwnerKind == originKind);
        });
        if (owner == "maintenance") Assert.IsType<InvalidDataException>(inventoryFailure);
        else if (missingObservation is null) Assert.Null(inventoryFailure);
        else Assert.True(inventoryFailure is InvalidDataException or JsonException, inventoryFailure?.ToString());
        var readFailure = await Record.ExceptionAsync(() => vocabulary.CaptureActiveAsync());
        Assert.True(readFailure is InvalidDataException or JsonException,
            $"{owner} retained authority was admitted as absent, failure={readFailure}");
        var publishFailure = await Record.ExceptionAsync(() => vocabulary.PublishReviewedAsync(bytes, null,
            Guid.NewGuid(), "must-not-reseed-retained-" + owner));
        Assert.True(publishFailure is InvalidDataException or JsonException, publishFailure?.ToString());
        Assert.Equal(retainedBefore, await RetainedRows(db, owner));
        Assert.False(await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
    }

    [Fact]
    public async Task StagedJournal_RequiresItsExactCommittedOwnerBeforeFirstInstall()
    {
        var directory = Path.Combine(Path.GetTempPath(), "wfs-inventory-stage-" + Guid.NewGuid().ToString("N"));
        try
        {
            var configuration = new ConfigurationManager { ["DataRoot"] = directory };
            var data = new DataRootResolver(configuration);
            var roots = new RecipesRootResolver(data, configuration);
            var storage = new LocalStorageProvider(data, roots);
            var options = new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
            await using var db = new RecipeDbContext(options);
            var clock = new SystemClock();
            var vocabulary = new FoodVocabularyStore(db, storage, roots, new RecoveryBoundary(db, configuration, roots), clock);
            var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "staged-journal-review");
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original" };
            db.Recipes.Add(recipe);
            await db.SaveChangesAsync();
            var repository = new RecipeRepository(storage);
            await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
            var publicationStore = new RecipeFilePublicationStore(db, repository, clock,
                new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(configuration)), vocabulary);
            var operationId = Guid.NewGuid();
            await publicationStore.PublishAsync(await publicationStore.CaptureAsync(recipe.Id),
                new("""{"name":"Observed publication","recipeIngredient":["salt"],"recipeInstructions":[{"text":"Mix."}]}""",
                    new RecipeInfo { Id = recipe.Id, Name = "Observed publication" }), operationId);
            var publication = await db.RecipeFilePublications.SingleAsync();
            Assert.True(publication.Delivered);
            var file = Path.Combine(roots.Root, recipe.Id.ToString("D"), ".publications", operationId.ToString("N"), publication.InputHash + ".json");
            var retained = await File.ReadAllBytesAsync(file);
            Assert.Contains(installed.NewHead.Sha256, Encoding.UTF8.GetString(retained));
            var observed = await Observe(vocabulary);
            Assert.Single(observed.History.StagedJournals);
            Assert.Contains(FoodVocabularyInventoryQualification.RequiredReferences(observed),
                x => x.OwnerKind == "staged-journal" && x.Reference == installed.NewHead);
            db.RecipeFilePublications.Remove(publication);
            db.FamilySettings.Remove(await db.FamilySettings.SingleAsync(x => x.Key == "food_vocabulary_publication"));
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(bytes, null,
                Guid.NewGuid(), "must-not-reseed-staged-authority"));
            Assert.False(await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
            Assert.Equal(retained, await File.ReadAllBytesAsync(file));
        }
        finally { if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true); }
    }

    private static Task<FoodVocabularyInventoryFacts> Observe(FoodVocabularyStore vocabulary) =>
        (Task<FoodVocabularyInventoryFacts>)typeof(FoodVocabularyStore)
            .GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(vocabulary, [CancellationToken.None])!;

    private static async Task CorruptOwnerAsync(RecipeDbContext db, string owner, bool missingObservation)
    {
        string Mutate(string raw, Action<JsonNode> remove)
        {
            var node = JsonNode.Parse(raw)!;
            remove(node);
            return node.ToJsonString();
        }
        string Hash(string raw) => FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes((string)typeof(CanonicalRecipeContentStore)
            .GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [raw])!));
        switch (owner)
        {
            case "reset":
                var reset = await db.WorkflowResetIntents.SingleAsync();
                if (missingObservation) reset.Request = Mutate(reset.Request, x => x["Before"]!.AsObject().Remove("Result"));
                reset.RequestHash = missingObservation ? Hash(reset.Request) : new string('0', 64);
                break;
            case "attempt":
                var attempt = await db.WorkflowProcessorAttempts.SingleAsync();
                if (missingObservation) attempt.Request = Mutate(attempt.Request, x => x["task"]!.AsObject().Remove("childLaunchIntentId"));
                attempt.RequestHash = missingObservation ? Hash(attempt.Request) : new string('0', 64);
                break;
            case "retirement":
                var retirement = await db.WorkflowLifecycleRecords.SingleAsync();
                if (missingObservation) retirement.Payload = Mutate(retirement.Payload, x => x["workflow"]!["tasks"]![0]!.AsObject().Remove("childLaunchIntentId"));
                retirement.PayloadHash = missingObservation ? Hash(retirement.Payload) : new string('0', 64);
                break;
            case "repair":
                var repair = await db.RecipeRepairIntents.SingleAsync();
                if (missingObservation) repair.Payload = Mutate(repair.Payload, x => x["Prepared"]!["Tasks"]![0]!.AsObject().Remove("Payload"));
                repair.InputHash = missingObservation ? Hash(repair.Payload) : new string('0', 64);
                break;
            case "child":
                var child = await db.WorkflowChildIntents.SingleAsync();
                if (missingObservation) child.Prepared = Mutate(child.Prepared!, x => x["Tasks"]![0]!.AsObject().Remove("ScheduledAt"));
                child.PreparedHash = missingObservation ? Hash(child.Prepared!) : new string('0', 64);
                break;
            case "physical":
                var physical = await db.RecipePhysicalDeletions.SingleAsync();
                if (missingObservation) physical.Payload = Mutate(physical.Payload, x => x["recipe"]!.AsObject().Remove("foodMappingEvidence"));
                physical.PayloadHash = missingObservation ? Hash(physical.Payload) : new string('0', 64);
                break;
        }
        await db.SaveChangesAsync();
    }

    private static MethodInfo Method(string owner, string method) => typeof(FoodVocabularyStore).Assembly
        .GetType("RecipeApi.Services." + owner)!.GetMethod(method, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)!;

    private static async Task<string> RetainedRows(RecipeDbContext db, string owner) => owner switch
    {
        "reset" => JsonSerializer.Serialize(await db.WorkflowResetIntents.AsNoTracking().ToArrayAsync()),
        "attempt" => JsonSerializer.Serialize(await db.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync()),
        "retirement" => JsonSerializer.Serialize(await db.WorkflowLifecycleRecords.AsNoTracking().ToArrayAsync()),
        "repair" => JsonSerializer.Serialize(await db.RecipeRepairIntents.AsNoTracking().ToArrayAsync()),
        "child" => JsonSerializer.Serialize(await db.WorkflowChildIntents.AsNoTracking().ToArrayAsync()),
        "physical" => JsonSerializer.Serialize(await db.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync()),
        "maintenance" or "maintenance-linked" => JsonSerializer.Serialize(await db.MaintenanceCommandLifecycleRecords.AsNoTracking().ToArrayAsync()),
        _ => throw new ArgumentOutOfRangeException(nameof(owner))
    };
}
