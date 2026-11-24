using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Models;
using RecipeApi.Data;
using RecipeApi.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CanonicalRecipeMigrationExecutionTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PreparedConverter_PreservesLiteralWordingAndFrozenIdentities_OrRejectsChangedBaseline(bool changeBaseline)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var store = scope.ServiceProvider.GetRequiredService<StructuredRecipeContentStore>();
        var recipe = new Recipe { Name = "Literal tracer", Servings = 2,
            Ingredients = "[\"1/4 cup milk\",\"broccoli\"]",
            RawMetadata = "{\"recipeInstructions\":[{\"name\":\"Prepare\",\"itemListElement\":[{\"text\":\"Warm the milk.\"}]},{\"name\":\"Finish\",\"itemListElement\":[{\"text\":\"Add broccoli.\"}]}]}" };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        var operationId = Guid.NewGuid();
        var item = new CanonicalMigrationRecipe(recipe.Id, operationId, "requires-forward-assessment", null,
            StructuredRecipeContentStore.InspectContentRevision(recipe), StructuredRecipeContentStore.InspectSourceRevision(recipe),
            "not-an-inventory-authority", 2, 2, 0, []);
        var at = DateTimeOffset.Parse("2026-11-15T16:00:00.123456Z");
        var before = JsonSerializer.Serialize(recipe);
        var prepared = await InvokeStore<StructuredRecipeOperation>(store, "PrepareMigrationConversionAsync", item, at, CancellationToken.None);
        Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id)));
        Assert.False(await db.CanonicalRecipeOperations.AnyAsync(x => x.OperationId == operationId));
        Assert.False(await db.MaintenanceCommands.AnyAsync());
        var retainedBytes = JsonSerializer.Serialize(prepared);
        if (changeBaseline)
        {
            recipe.Name = "Later human title"; await db.SaveChangesAsync();
            var changed = JsonSerializer.Serialize(recipe);
            await Assert.ThrowsAsync<InvalidDataException>(() => InvokeStore<StructuredRecipeWriteResult>(store, "ConvertCoreAsync",
                recipe.Id, item.ContentRevision!, item.SourceRevision!, operationId, CancellationToken.None, null!, prepared));
            Assert.Equal(changed, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id)));
            Assert.False(await db.CanonicalRecipeOperations.AnyAsync(x => x.OperationId == operationId));
        }
        else
        {
            var result = await InvokeStore<StructuredRecipeWriteResult>(store, "ConvertCoreAsync", recipe.Id,
                item.ContentRevision!, item.SourceRevision!, operationId, CancellationToken.None, null!, prepared);
            var committed = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == operationId);
            Assert.Equal(retainedBytes, JsonSerializer.Serialize(committed));
            Assert.Equal(at, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id)).UpdatedAt);
            Assert.Equal("1/4 cup milk", result.Content.IngredientLines[0].Description);
            Assert.Null(result.Content.IngredientLines[0].Amount);
            Assert.Null(result.Content.IngredientLines[0].Unit);
            Assert.Equal(new[] { "Warm the milk.", "Add broccoli." }, result.Content.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Text));
            var replay = await store.ConvertAsync(recipe.Id, item.ContentRevision!, item.SourceRevision!, operationId);
            Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(replay));
        }
        Assert.Equal(retainedBytes, JsonSerializer.Serialize(prepared));
    }

    private static async Task<T> InvokeStore<T>(StructuredRecipeContentStore store, string method, params object[] args)
    {
        try { return await (Task<T>)typeof(StructuredRecipeContentStore).GetMethod(method, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(store, args)!; }
        catch (TargetInvocationException error) when (error.InnerException is not null)
        { ExceptionDispatchInfo.Capture(error.InnerException).Throw(); throw; }
    }

    [Theory]
    [InlineData("live")]
    [InlineData("pruned")]
    [InlineData("missing-link")]
    public async Task ActualMaintenancePrune_RetainsReceiptAndRequiresItsActualWorkflowClosure(string scenario)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var command = ReceiptPlan(Manifest(), new('b', 40), DateTimeOffset.UtcNow.AddDays(-31));
        db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        if (scenario != "live")
        {
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "migration-receipt-test", Status = WorkflowStatus.Completed,
                Parameters = "{}", CreatedAt = command.CreatedAt, UpdatedAt = command.CreatedAt };
            db.WorkflowInstances.Add(workflow); await db.SaveChangesAsync();
            var owner = typeof(ScheduleService).Assembly.GetType("RecipeApi.Services.WorkflowLifecycle")!;
            await Invoke<Task>(owner, "RetainAsync", db, workflow, "pruned", command.Id, command.CreatedAt, CancellationToken.None, null!);
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<ManagementService>().PruneMaintenanceCommandsAsync();
            Assert.False(await db.MaintenanceCommands.AnyAsync(x => x.Id == command.Id));
            Assert.True(await db.MaintenanceCommandLifecycleRecords.AnyAsync(x => x.Id == command.Id));
            if (scenario == "missing-link")
            {
                db.WorkflowLifecycleRecords.Remove(await db.WorkflowLifecycleRecords.SingleAsync(x => x.Id == workflow.Id));
                await db.SaveChangesAsync();
            }
        }
        Task<MaintenanceCommandObservation?> Find() => Invoke<Task<MaintenanceCommandObservation?>>(typeof(StructuredRecipeMigrationReceipt), "FindAsync", db, command.Id, CancellationToken.None);
        if (scenario == "missing-link") await Assert.ThrowsAsync<InvalidDataException>(Find);
        else
        {
            var found = await Find(); Assert.NotNull(found);
            RequireBinding(found, command);
            Assert.Equal(command.Payload, found.Payload); Assert.Equal(command.Result, found.Result);
            var vocabulary = scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>();
            var facts = await (Task<FoodVocabularyInventoryFacts>)typeof(FoodVocabularyStore).GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
                .Invoke(vocabulary, [CancellationToken.None])!;
            Assert.Contains(FoodVocabularyInventoryQualification.RequiredReferences(facts), origin =>
                origin.Reference == Manifest().RequiredReferences[0] && origin.OwnerKind == (scenario == "live" ? "migration-receipt" : "retained-migration-receipt"));
        }
    }
    [Fact]
    public void WeekReceiptIdentity_IsStablePerOperationAndWeek()
    {
        var operation = Guid.NewGuid(); var week = new DateOnly(2026, 11, 9);
        Assert.Equal(WeekReceiptId(operation, week), WeekReceiptId(operation, week));
        Assert.NotEqual(WeekReceiptId(operation, week), WeekReceiptId(operation, week.AddDays(7)));
    }

    [Fact]
    public void CompletedInertPlan_BindsExactReferencesAndAllRecipeAndWeekIdentities()
    {
        var manifest = Manifest(); var command = ReceiptPlan(manifest, new('b', 40), DateTimeOffset.UtcNow);
        Assert.Equal("completed", command.Status); Assert.Equal(1, command.Attempts);
        Assert.Equal(manifest.Request.OperationId, command.Id);
        Assert.Equal(manifest.RequiredReferences, StructuredRecipeMigrationReceipt.VocabularyReferences(Observe(command)));
        RequireBinding(Observe(command), command);
        using var payload = JsonDocument.Parse(command.Payload);
        Assert.Equal(manifest.Weeks.Count, payload.RootElement.GetProperty("weeks").GetArrayLength());
        Assert.Equal(manifest.Recipes[0].OperationId, payload.RootElement.GetProperty("recipes")[0].GetProperty("operationId").GetGuid());
    }

    [Theory]
    [InlineData("snapshot")]
    [InlineData("week-receipt")]
    [InlineData("plan-id")]
    public void NoncanonicalIdentitySpelling_CannotReuseCanonicalReceiptHash(string kind)
    {
        var command = ReceiptPlan(Manifest(), new('b', 40), DateTimeOffset.UtcNow);
        var payload = JsonNode.Parse(command.Payload)!;
        if (kind == "snapshot") payload["sourceSnapshot"]!["snapshotId"] = Guid.Parse(payload["sourceSnapshot"]!["snapshotId"]!.GetValue<string>()).ToString("N");
        else if (kind == "week-receipt") payload["weeks"]![0]!["receiptId"] = Guid.Parse(payload["weeks"]![0]!["receiptId"]!.GetValue<string>()).ToString("N");
        else payload["weeks"]![0]!["storedPlanIds"]![0] = Guid.Parse(payload["weeks"]![0]!["storedPlanIds"]![0]!.GetValue<string>()).ToString("N");
        command.Payload = payload.ToJsonString();
        Assert.Throws<InvalidDataException>(() => StructuredRecipeMigrationReceipt.VocabularyReferences(Observe(command)));
    }

    [Theory]
    [InlineData("pending")]
    [InlineData("skipped")]
    [InlineData("wrong-type")]
    [InlineData("id")]
    [InlineData("attempts")]
    [InlineData("missing-result")]
    [InlineData("missing-completion")]
    [InlineData("requested-by")]
    [InlineData("last-error")]
    [InlineData("extra-property")]
    [InlineData("missing-null")]
    [InlineData("forged-hash")]
    [InlineData("duplicate-reference")]
    [InlineData("duplicate-week")]
    [InlineData("wrong-week-id")]
    public void MalformedReceipt_CannotCertifyProgressOrReferences(string scenario)
    {
        var command = ReceiptPlan(Manifest(), new('b', 40), DateTimeOffset.UtcNow);
        var payload = JsonNode.Parse(command.Payload)!.AsObject();
        switch (scenario)
        {
            case "pending": command.Status = "pending"; break;
            case "skipped": command.Status = "skipped"; break;
            case "wrong-type": command.CommandType = "unknown"; break;
            case "id": command.Id = Guid.NewGuid(); break;
            case "attempts": command.Attempts = 0; break;
            case "missing-result": command.Result = null; break;
            case "missing-completion": command.CompletedAt = null; break;
            case "requested-by": command.RequestedBy = Guid.NewGuid(); break;
            case "last-error": command.LastError = "not a completed receipt"; break;
            case "extra-property": payload["callerFreshness"] = true; break;
            case "missing-null": payload.Remove("liveGeneration"); break;
            case "forged-hash": payload["requestSha256"] = new string('0', 64); break;
            case "duplicate-reference": payload["references"]!.AsArray().Add(payload["references"]![0]!.DeepClone()); break;
            case "duplicate-week": payload["weeks"]!.AsArray().Add(payload["weeks"]![0]!.DeepClone()); break;
            case "wrong-week-id": payload["weeks"]![0]!["receiptId"] = Guid.NewGuid(); break;
        }
        if (scenario != "forged-hash")
        {
            payload["requestSha256"] = "";
            payload["requestSha256"] = ManifestHash(payload.ToJsonString());
        }
        command.Payload = payload.ToJsonString();
        Assert.Throws<InvalidDataException>(() => StructuredRecipeMigrationReceipt.VocabularyReferences(Observe(command)));
    }

    [Theory]
    [InlineData("operation")]
    [InlineData("assembly")]
    [InlineData("commit")]
    [InlineData("schema")]
    [InlineData("model")]
    [InlineData("source")]
    [InlineData("recipe-operation")]
    [InlineData("weeks")]
    public void DifferentValidBinding_DoesNotReplayAnEarlierOperation(string scenario)
    {
        var manifest = Manifest(); var original = ReceiptPlan(manifest, new('b', 40), DateTimeOffset.UtcNow);
        var changed = scenario switch
        {
            "operation" => manifest with { Request = manifest.Request with { OperationId = Guid.NewGuid() } },
            "assembly" => manifest with { Request = manifest.Request with { CandidateSha256 = new('c', 64) } },
            "schema" => manifest with { Request = manifest.Request with { SchemaSha256 = new('d', 64) }, LiveSchemaSha256 = new('d', 64) },
            "model" => manifest with { Request = manifest.Request with { ModelRevision = "another-model" } },
            "source" => manifest with { SourceSnapshot = manifest.SourceSnapshot with { ManifestSha256 = new('e', 64) } },
            "recipe-operation" => manifest with { Request = manifest.Request with { Selected = [manifest.Request.Selected[0] with { OperationId = Guid.NewGuid() }] } },
            "weeks" => manifest with { Weeks = [manifest.Weeks[0]] },
            _ => manifest
        };
        if (scenario == "recipe-operation") changed = changed with { Recipes = [changed.Recipes[0] with { OperationId = changed.Request.Selected[0].OperationId }] };
        changed = Seal(changed);
        var expected = ReceiptPlan(changed, new(scenario == "commit" ? 'c' : 'b', 40), DateTimeOffset.UtcNow);
        Assert.Throws<InvalidDataException>(() => RequireBinding(Observe(original), expected));
    }

    internal static CanonicalMigrationInventory Manifest()
    {
        var operation = Guid.NewGuid(); var recipe = Guid.NewGuid(); var conversion = Guid.NewGuid(); var snapshot = Guid.NewGuid();
        return Seal(new(1, new(operation, new('a', 64), new('f', 64), "model-one", snapshot, [new(recipe, conversion)]),
            new(snapshot, new('1', 64), null, new('2', 64), [new("retained", new('3', 64))]), new('f', 64), null,
            [new("retained", new('3', 64))], [], [],
            [new(recipe, conversion, "observed-canonical", null, "content.original", "source.original", new('4', 64), 1, 1, 0, [])],
            [new(new(2026, 11, 9), [Guid.NewGuid()], []), new(new(2026, 11, 16), [], [Guid.NewGuid()])], "", new(2026, 11, 13)));
    }
    internal static CanonicalMigrationInventory Seal(CanonicalMigrationInventory manifest) => manifest with
    { ObservationSha256 = ManifestHash(JsonSerializer.Serialize(manifest with { ObservationSha256 = "" }, new JsonSerializerOptions(JsonSerializerDefaults.Web))) };
    private static T Invoke<T>(Type type, string method, params object[] args)
    {
        try { return (T)type.GetMethod(method, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)!.Invoke(null, args)!; }
        catch (TargetInvocationException error) when (error.InnerException is not null)
        { ExceptionDispatchInfo.Capture(error.InnerException).Throw(); throw; }
    }
    private static Guid WeekReceiptId(Guid operation, DateOnly week) => Invoke<Guid>(typeof(StructuredRecipeMigrationReceipt), "WeekReceiptId", operation, week);
    private static MaintenanceCommand ReceiptPlan(CanonicalMigrationInventory manifest, string candidate, DateTimeOffset at) =>
        Invoke<MaintenanceCommand>(typeof(StructuredRecipeMigrationReceipt), "Plan", manifest, candidate, at);
    private static void RequireBinding(MaintenanceCommandObservation observation, MaintenanceCommand expected) =>
        Invoke<object?>(typeof(StructuredRecipeMigrationReceipt), "RequireBinding", observation, expected);
    private static string ManifestHash(string raw) => Invoke<string>(typeof(StructuredRecipeMigrationManifest), "Hash", raw);
    private static MaintenanceCommandObservation Observe(MaintenanceCommand command) => new(command.Id, command.CommandType,
        command.Status, command.Payload, command.Result, command.Attempts, command.RequestedBy, command.CreatedAt,
        command.ScheduledFor, command.StartedAt, command.CompletedAt, command.LastError);

    [Fact]
    public async Task StartupMigrator_UpgradesDatabaseRowsWithoutUnwrappingDiskWrappersOrDeletingPublications()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(
            configurationOverrides: new() { ["Tests:LocalRecipeStore"] = "true" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var store = scope.ServiceProvider.GetRequiredService<RecipeApi.Infrastructure.IRecipeStore>();
        var recipesRoot = scope.ServiceProvider.GetRequiredService<RecipeApi.Infrastructure.RecipesRootResolver>();
        var migrator = scope.ServiceProvider.GetRequiredService<RecipeStartupMigrator>();

        // (a) Unmigrated DB row with a retired backupContentVersion: 1 file on disk
        var legacyId = Guid.NewGuid();
        const string legacyInnerRaw = """{"@context":"https://schema.org/","@type":"Recipe","name":"Legacy Chili","recipeYield":"4 portions","recipeIngredient":["500 g ground beef","2 cups beans"],"recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Simmer the beef and beans."}]}]}""";
        var legacyWrapped = JsonSerializer.Serialize(new
        {
            id = legacyId,
            name = "Legacy Chili",
            backupContentVersion = 1,
            rawMetadata = legacyInnerRaw,
            ingredients = """["500 g ground beef","2 cups beans"]"""
        });
        db.Recipes.Add(new Recipe
        {
            Id = legacyId,
            Name = "Legacy Chili",
            IsReady = true,
            RawMetadata = legacyInnerRaw,
            Ingredients = """["500 g ground beef","2 cups beans"]""",
            Servings = null,
            CanonicalContent = null
        });
        await store.WriteInfoAsync(new RecipeInfo { Id = legacyId, Name = "Legacy Chili", IsReady = true });
        await store.WriteRecipeJsonAsync(legacyId, legacyWrapped);

        // (b) Already-migrated DB v2 recipe with a retired wfs-recipe v2 wrapper on disk + .publications residue
        var v2Id = Guid.NewGuid();
        const string v2Raw = """{"@context":"https://schema.org/","@type":"Recipe","name":"V2 Curry","recipeYield":"4 portions","recipeIngredient":["400 g chicken"],"recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Cook chicken."}]}]}""";
        var (v2Content, v2Evidence) = StructuredRecipeContentStore.FromSchemaOrg(v2Id, v2Raw, null, null, Guid.NewGuid(), "source");
        var webJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        db.Recipes.Add(new Recipe
        {
            Id = v2Id,
            Name = "V2 Curry",
            IsReady = true,
            Servings = 4,
            RawMetadata = v2Raw,
            CanonicalContent = JsonSerializer.Serialize(v2Content, webJson),
            FoodMappingEvidence = v2Evidence,
            Ingredients = """["400 g chicken"]"""
        });
        await store.WriteInfoAsync(new RecipeInfo { Id = v2Id, Name = "V2 Curry", IsReady = true });
        var v2Wrapped = new JsonObject
        {
            ["format"] = "wfs-recipe",
            ["version"] = 2,
            ["recipeId"] = v2Id,
            ["contentSchemaVersion"] = 2,
            ["contentRevision"] = v2Content.ContentRevision,
            ["content"] = JsonSerializer.SerializeToNode(v2Content, webJson),
            ["rawMetadata"] = v2Raw
        }.ToJsonString();
        await store.WriteRecipeJsonAsync(v2Id, v2Wrapped);
        var pubDir = Path.Combine(recipesRoot.Root, v2Id.ToString(), ".publications", "stale");
        Directory.CreateDirectory(pubDir);
        await File.WriteAllTextAsync(Path.Combine(pubDir, "journal.json"), "{}");

        await db.SaveChangesAsync();

        var first = await migrator.MigrateAsync();
        Assert.Equal(1, first.MigratedRecipes);

        db.ChangeTracker.Clear();
        var upgraded = await db.Recipes.AsNoTracking().SingleAsync(r => r.Id == legacyId);
        Assert.NotNull(upgraded.CanonicalContent);
        Assert.Equal(4, upgraded.Servings);

        // Disk wrappers and .publications directories are no longer scanned or rewritten on startup
        var legacyDisk = await store.ReadRecipeJsonAsync(legacyId);
        Assert.NotNull(legacyDisk);
        using (var legacyDoc = JsonDocument.Parse(legacyDisk))
            Assert.Equal(1, legacyDoc.RootElement.GetProperty("backupContentVersion").GetInt32());

        var v2Disk = await store.ReadRecipeJsonAsync(v2Id);
        Assert.NotNull(v2Disk);
        using (var v2Doc = JsonDocument.Parse(v2Disk))
        {
            Assert.Equal("wfs-recipe", v2Doc.RootElement.GetProperty("format").GetString());
            Assert.Equal(2, v2Doc.RootElement.GetProperty("version").GetInt32());
        }
        Assert.True(Directory.Exists(Path.Combine(recipesRoot.Root, v2Id.ToString(), ".publications")));

        // (c) Idempotent second startup run
        var second = await migrator.MigrateAsync();
        Assert.Equal(0, second.MigratedRecipes);
    }
}
