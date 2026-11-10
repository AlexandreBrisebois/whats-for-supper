using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExistingBackupSeed_RealEditIndependentDestinationAndRepeatRetainCanonicalAndHouseholdFacts()
    {
        await WithStore(async (services, repository, _, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var selected = await db.Recipes.SingleAsync(x => x.Id == Id);
            selected.ImageCount = 1;
            selected.AddedBy = (await db.FamilyMembers.FirstAsync()).Id;
            await db.SaveChangesAsync();
            var seeded = await SeedCurrentReplayAsync(services, repository);
            seeded = seeded with { Content = seeded.Content with { ContentRevision = "fixture-rich-" + Guid.NewGuid().ToString("N") } };
            var step = seeded.Content.InstructionSections[0].Steps[0] with { Text = "Add ⅓ cup flour." };
            var binding = JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), ingredientLineId = seeded.Content.IngredientLines[0].Id,
                stepId = step.Id, validatedContentRevision = seeded.Content.ContentRevision, validatedTextRevision = step.TextRevision,
                span = new { start = 4, end = 9, expectedText = "⅓ cup" }, role = "whole", payload = new { }, status = "validated" });
            seeded = seeded with { Content = seeded.Content with { InstructionSections = [seeded.Content.InstructionSections[0] with { Steps = [step with { Bindings = [binding] }] }] } };
            (await db.Recipes.SingleAsync(x => x.Id == Id)).CanonicalContent = JsonSerializer.Serialize(seeded.Content, JsonDefaults.CamelCase);
            await db.SaveChangesAsync();
            var editor = new CanonicalRecipeContentStore(db, services.GetRequiredService<IClock>(), services.GetRequiredService<SupperProjectionInvalidation>());
            var edited = await editor.EditAsync(Id, seeded.Content.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto
            { ExpectedContentRevision = seeded.Content.ContentRevision, Notes = "Human note" });
            var expected = JsonSerializer.Serialize(edited.Content, JsonDefaults.CamelCase);
            var other = await db.Recipes.SingleAsync(x => x.Id == TomorrowPushPostgresTests.Other);
            other.RawMetadata = null;
            other.Name = null;
            other.IsReady = false;
            other.Servings = 4;
            await db.SaveChangesAsync();
            var converted = await editor.ConvertAsync(other.Id, CanonicalRecipeContentStore.InspectContentRevision(other), CanonicalRecipeContentStore.InspectSourceRevision(other), Guid.NewGuid());
            await editor.EditAsync(other.Id, converted.Content.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto
            { ExpectedContentRevision = converted.Content.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()), InstructionSections = JsonSerializer.SerializeToElement(Array.Empty<object>()) });
            foreach (var monday in (await db.CalendarEvents.Select(x => x.Date).ToListAsync()).Select(date => date.AddDays(-(((int)date.DayOfWeek + 6) % 7))).Distinct())
                if (!await db.WeeklyPlans.AnyAsync(x => x.WeekStartDate == monday))
                    db.WeeklyPlans.Add(new WeeklyPlan { Id = Guid.NewGuid(), WeekStartDate = monday, Status = WeeklyPlanStatus.Locked });
            db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12), "Coffee", "coffee", "Grocery", services.GetRequiredService<IClock>().UtcNow));
            await db.SaveChangesAsync();
            var beforeMembers = JsonSerializer.Serialize(await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.Name, x.BrowseViewMode, x.PreferredLanguage, x.CreatedAt }).ToListAsync());
            var expectedAttribution = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).AddedBy;
            var expectedCreatedAt = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).CreatedAt;
            var beforeExtras = JsonSerializer.Serialize(await db.GroceryExtraOccurrences.AsNoTracking().OrderBy(x => x.Id).ToListAsync());
            var beforePlans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.WeekStartDate, x.GroceryState }).ToListAsync();
            var beforeEvents = await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.RecipeId, x.Date, x.Status }).ToListAsync();
            var sourceRoot = services.GetRequiredService<DataRootResolver>().Root;
            await new ManagementProcessor(services.GetRequiredService<ManagementService>(), db, "BackupDatabase").ExecuteAsync(new(), default);
            using (var exported = JsonDocument.Parse(await repository.GetRecipeJsonAsync(Id, default)))
                Assert.Equal(expected, JsonSerializer.Serialize(RecipeExportContent.ReadCurrent(exported.RootElement, Id).Content, JsonDefaults.CamelCase));
            await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
            {
                await using var destination = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true" });
                using var scope = destination.Services.CreateScope();
                var target = scope.ServiceProvider;
                var destinationRoot = target.GetRequiredService<DataRootResolver>().Root;
                foreach (var file in Directory.EnumerateFiles(sourceRoot, "*", SearchOption.AllDirectories))
                {
                    var copy = Path.Combine(destinationRoot, Path.GetRelativePath(sourceRoot, file));
                    Directory.CreateDirectory(Path.GetDirectoryName(copy)!);
                    File.Copy(file, copy, overwrite: true);
                }
                var targetDb = target.GetRequiredService<RecipeDbContext>();
                // The auth factory creates its own synthetic members. This is the
                // empty independent destination, not a merge of two households.
                targetDb.FamilyMembers.RemoveRange(await targetDb.FamilyMembers.ToListAsync());
                await targetDb.SaveChangesAsync();
                for (var repeat = 0; repeat < 2; repeat++)
                {
                    var result = await target.GetRequiredService<ManagementService>().RestoreAsync();
                    Assert.Equal(0, result.Errors);
                    targetDb.ChangeTracker.Clear();
                    var saved = await targetDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
                    Assert.Equal(expected, JsonSerializer.Serialize(CanonicalRecipeContentStore.Read(saved), JsonDefaults.CamelCase));
                    Assert.Equal(seeded.RawMetadata, saved.RawMetadata);
                    var clearedRow = await targetDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == TomorrowPushPostgresTests.Other);
                    Assert.Null(clearedRow.Name);
                    Assert.False(clearedRow.IsReady);
                    Assert.Null(clearedRow.RawMetadata);
                    var cleared = CanonicalRecipeContentStore.Read(clearedRow)!;
                    Assert.Empty(cleared.IngredientLines);
                    Assert.Empty(cleared.InstructionSections);
                    Assert.Equal(4, cleared.Servings);
                    Assert.Null(saved.Servings);
                    Assert.Equal("Human note", saved.Notes);
                    Assert.Equal(expectedAttribution, saved.AddedBy);
                    Assert.Equal(expectedCreatedAt, saved.CreatedAt);
                    Assert.Equal(beforeMembers, JsonSerializer.Serialize(await targetDb.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.Name, x.BrowseViewMode, x.PreferredLanguage, x.CreatedAt }).ToListAsync()));
                    Assert.Equal(beforeExtras, JsonSerializer.Serialize(await targetDb.GroceryExtraOccurrences.AsNoTracking().OrderBy(x => x.Id).ToListAsync()));
                    Assert.Equal(JsonSerializer.Serialize(beforePlans), JsonSerializer.Serialize(await targetDb.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.WeekStartDate, x.GroceryState }).ToListAsync()));
                    Assert.Equal(JsonSerializer.Serialize(beforeEvents), JsonSerializer.Serialize(await targetDb.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.RecipeId, x.Date, x.Status }).ToListAsync()));
                    Assert.Equal(new byte[] { 1, 2, 3 }, await target.GetRequiredService<RecipeRepository>().GetOriginalImageAsync(Id, 0, default));
                    Assert.Equal("retained source", await target.GetRequiredService<RecipeRepository>().GetContentHtmlAsync(Id, default));
                    await target.GetRequiredService<ManagementService>().BackupAsync();
                }
            });
        }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExistingSeed_MalformedCanonicalInputRefusesBeforeHouseholdOrRecipeMutation()
    {
        await WithStore(async (services, repository, _, _) =>
        {
            await SeedCurrentReplayAsync(services, repository);
            var management = services.GetRequiredService<ManagementService>();
            await management.BackupAsync();
            var db = services.GetRequiredService<RecipeDbContext>();
            var member = new FamilyMember { Name = "Current household" };
            db.FamilyMembers.Add(member);
            await db.SaveChangesAsync();
            var before = JsonSerializer.Serialize(await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).ToListAsync());
            var recipeBefore = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id));
            await repository.SaveRecipeJsonAsync(Id, "{\"format\":\"wfs-recipe\",\"version\":2}", default);
            await Assert.ThrowsAsync<InvalidDataException>(() => management.RestoreAsync());
            Assert.Equal(before, JsonSerializer.Serialize(await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).ToListAsync()));
            Assert.Equal(recipeBefore, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
        }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExistingSeed_StaleCanonicalBackupCannotReplaceNewHumanContent()
    {
        await WithStore(async (services, repository, _, _) =>
        {
            var original = await SeedCurrentReplayAsync(services, repository);
            var originalDb = services.GetRequiredService<RecipeDbContext>();
            var originalRow = await originalDb.Recipes.SingleAsync(x => x.Id == Id);
            originalRow.ImageCount = 1;
            originalRow.FinishedDishIndex = 0;
            await originalDb.SaveChangesAsync();
            var management = services.GetRequiredService<ManagementService>();
            await management.BackupAsync();
            var db = services.GetRequiredService<RecipeDbContext>();
            var editor = new CanonicalRecipeContentStore(db, services.GetRequiredService<IClock>(), services.GetRequiredService<SupperProjectionInvalidation>());
            await editor.EditAsync(Id, original.Content.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto
            { ExpectedContentRevision = original.Content.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()), Notes = "Newer human note" });
            var current = await db.Recipes.SingleAsync(x => x.Id == Id);
            current.ImageCount = 2;
            current.FinishedDishIndex = 1;
            await db.SaveChangesAsync();
            await repository.SaveOriginalImageAsync(Id, 1, "image/png", [4, 5, 6], default);
            var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id));
            var searchBefore = JsonSerializer.Serialize(await db.RecipeSearchDocuments.AsNoTracking().OrderBy(x => x.RecipeId).ToListAsync());
            var result = await management.RestoreAsync();
            Assert.True(result.Errors > 0);
            Assert.Equal(searchBefore, JsonSerializer.Serialize(await db.RecipeSearchDocuments.AsNoTracking().OrderBy(x => x.RecipeId).ToListAsync()));
            Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
        }, localRecipeStore: true);
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExistingSync_CanonicalJournalResumesOnceAndLateRetryCannotReplayOverHumanEdit()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var export = await SeedCurrentReplayAsync(services, repository);
            var db = services.GetRequiredService<RecipeDbContext>();
            var operation = Guid.NewGuid();
            var instance = Guid.NewGuid();
            db.WorkflowInstances.Add(new WorkflowInstance { Id = instance, WorkflowId = "recipe-import" });
            db.WorkflowTasks.Add(new WorkflowTask { TaskId = operation, InstanceId = instance, ProcessorName = "ExtractRecipe", TaskName = "extract_recipe" });
            await db.SaveChangesAsync();
            var capture = await store.CaptureAsync(Id);
            var candidate = new RecipePublicationCandidate(RecipeExportContent.WriteCurrent(export), await repository.GetInfoAsync(Id, default),
                SourceKind: "canonical-export");
            // A failed file write leaves the ordinary journal pending and resumable.
            storage.FailJson = true;
            await Assert.ThrowsAsync<IOException>(() => store.PublishAsync(capture, candidate, operation));
            storage.FailJson = false;
            var processor = CurrentReplayProcessor(services, repository, Moq.Mock.Of<ISupperProjectionPublisher>());
            var sync = new WorkflowTask { InstanceId = instance, Payload = JsonSerializer.Serialize(new { recipeId = Id }) };
            await processor.ExecuteAsync(sync, default);
            Assert.True((await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == operation)).Delivered);
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.Notes = "New human note";
            await db.SaveChangesAsync();
            await repository.SaveRecipeJsonAsync(Id, "newer file bytes", default);
            await processor.ExecuteAsync(sync, default);
            Assert.Equal("newer file bytes", await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal("New human note", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).Notes);
            Assert.Single(await db.RecipeFilePublications.AsNoTracking().ToListAsync());
        }, localRecipeStore: true);
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExistingSeed_IntegrityFailuresAndOldCanonicalReplacementLeaveDatabaseAndFilesUntouched()
    {
        foreach (var failure in new[] { "media-changed", "media-missing", "old-content", "inventory-missing" })
            await WithStore(async (services, repository, _, _) =>
            {
                await SeedCurrentReplayAsync(services, repository);
                var management = services.GetRequiredService<ManagementService>();
                await management.BackupAsync();
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = JsonSerializer.Serialize(new
                {
                    Recipes = await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
                    Members = await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
                    Plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
                    Events = await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).ToListAsync()
                });
                var dataRoot = services.GetRequiredService<DataRootResolver>().Root;
                var recipesRoot = services.GetRequiredService<RecipesRootResolver>().Root;
                var image = Path.Combine(recipesRoot, Id.ToString(), "original", "0.png");
                if (failure == "media-changed") await File.WriteAllBytesAsync(image, [9, 8, 7]);
                if (failure == "media-missing") File.Delete(image);
                if (failure == "old-content") await repository.SaveRecipeJsonAsync(Id, "{\"backupContentVersion\":1,\"rawMetadata\":null,\"ingredients\":null}", default);
                if (failure == "inventory-missing") File.Delete(Path.Combine(dataRoot, "canonical-backup.json"));
                var files = FileHashes([dataRoot, recipesRoot]);
                await Assert.ThrowsAsync<InvalidDataException>(() => management.RestoreAsync());
                Assert.Equal(files, FileHashes([dataRoot, recipesRoot]));
                Assert.Equal(before, JsonSerializer.Serialize(new
                {
                    Recipes = await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
                    Members = await db.FamilyMembers.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
                    Plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
                    Events = await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).ToListAsync()
                }));
            }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExistingSync_PendingCanonicalDeliveryRejectsNewHumanOrSourceChanges()
    {
        foreach (var change in new[] { "human", "source" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var export = await SeedCurrentReplayAsync(services, repository);
                var operation = Guid.NewGuid();
                var capture = await store.CaptureAsync(Id);
                storage.FailJson = true;
                await Assert.ThrowsAsync<IOException>(async () => await store.PublishAsync(capture,
                    new(RecipeExportContent.WriteCurrent(export), await repository.GetInfoAsync(Id, default), SourceKind: "canonical-export"), operation));
                storage.FailJson = false;
                var db = services.GetRequiredService<RecipeDbContext>();
                if (change == "human")
                {
                    (await db.Recipes.SingleAsync(x => x.Id == Id)).Notes = "New human note";
                    await db.SaveChangesAsync();
                }
                else await repository.SaveContentHtmlAsync(Id, "New retained source", default);
                var root = services.GetRequiredService<RecipesRootResolver>().Root;
                var files = FileHashes([root]);
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.ResumeAsync(Id, operation));
                Assert.Equal(files, FileHashes([root]));
                Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == operation)).Delivered);
            }, localRecipeStore: true);
    }
}
