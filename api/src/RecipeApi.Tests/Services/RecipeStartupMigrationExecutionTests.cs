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

public sealed class RecipeStartupMigrationExecutionTests
{
    [Theory]
    [InlineData("live")]
    [InlineData("pruned")]
    [InlineData("missing-link")]
    public async Task ActualMaintenancePrune_RetainsCommandAndRequiresItsActualWorkflowClosure(string scenario)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var at = DateTimeOffset.UtcNow.AddDays(-31);
        var command = new MaintenanceCommand
        {
            Id = Guid.NewGuid(),
            CommandType = "PruneWorkflows",
            Status = "completed",
            Payload = "{}",
            Result = "{}",
            Attempts = 1,
            CreatedAt = at,
            CompletedAt = at
        };
        db.MaintenanceCommands.Add(command);
        await db.SaveChangesAsync();
        if (scenario != "live")
        {
            var workflow = new WorkflowInstance
            {
                Id = Guid.NewGuid(),
                WorkflowId = "prune-workflows-test",
                Status = WorkflowStatus.Completed,
                Parameters = "{}",
                CreatedAt = command.CreatedAt,
                UpdatedAt = command.CreatedAt
            };
            db.WorkflowInstances.Add(workflow);
            await db.SaveChangesAsync();
            var workflowLifecycle = typeof(ScheduleService).Assembly.GetType("RecipeApi.Services.WorkflowLifecycle")!;
            await Invoke<Task>(workflowLifecycle, "RetainAsync", db, workflow, "pruned", command.Id, command.CreatedAt, CancellationToken.None, null!);
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
        var maintenanceLifecycle = typeof(ScheduleService).Assembly.GetType("RecipeApi.Services.MaintenanceCommandLifecycle")!;
        var workflows = await db.WorkflowLifecycleRecords.AsNoTracking().ToArrayAsync();
        var physical = await db.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync();
        if (scenario == "live")
        {
            var observation = new MaintenanceCommandObservation(command.Id, command.CommandType, command.Status,
                command.Payload, command.Result, command.Attempts, command.RequestedBy, command.CreatedAt,
                command.ScheduledFor, command.StartedAt, command.CompletedAt, command.LastError);
            Invoke<object?>(maintenanceLifecycle, "ValidateCurrentReferences", observation, workflows, physical);
        }
        else
        {
            var retained = await db.MaintenanceCommandLifecycleRecords.AsNoTracking().SingleAsync(x => x.Id == command.Id);
            void Validate() => Invoke<object?>(maintenanceLifecycle, "ValidateRetainedReferences", retained, workflows, physical);
            if (scenario == "missing-link") Assert.Throws<InvalidDataException>(Validate);
            else Validate();
        }
    }

    private static T Invoke<T>(Type type, string method, params object[] args)
    {
        try { return (T)type.GetMethod(method, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)!.Invoke(null, args)!; }
        catch (TargetInvocationException error) when (error.InnerException is not null)
        { ExceptionDispatchInfo.Capture(error.InnerException).Throw(); throw; }
    }

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
            StructuredContent = null
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
            StructuredContent = JsonSerializer.Serialize(v2Content, webJson),
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
        Assert.NotNull(upgraded.StructuredContent);
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
