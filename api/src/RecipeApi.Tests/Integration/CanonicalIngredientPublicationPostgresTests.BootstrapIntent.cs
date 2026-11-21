using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task UrlBootstrap_OriginalIntentCommitsBeforeDeliveryAndSurvivesGraphReplacement()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var before = await db.Recipes.Select(x => x.Id).ToListAsync();
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => service.CaptureUrl(new() { Url = "https://example.test/original" }, member));
            db.ChangeTracker.Clear();
            var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => !before.Contains(x.Id));
            var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.RecipeId == recipe.Id);
            var instance = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync();
            Assert.Equal(instance.Id, journal.OperationId);
            Assert.NotNull(instance.RecipePublicationCapture);
            var original = instance.RecipePublicationCapture;
            using (var saved = JsonDocument.Parse(journal.Payload))
            {
                using var intent = JsonDocument.Parse(saved.RootElement.GetProperty("candidate").GetProperty("bootstrapIntent").GetString()!);
                using var current = JsonDocument.Parse(original!);
                Assert.Equal(intent.RootElement.GetProperty("inputHash").GetString(), current.RootElement.GetProperty("inputHash").GetString());
            }
            Assert.False(journal.Delivered);
            // A valid definition is insufficient while accepted source delivery is pending.
            await UrlCaptureRecoveryTests.WriteWorkflowAsync(services);
            await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.InitializeUrlCaptureAsync(instance.Id));
            Assert.Single(await db.WorkflowTasks.AsNoTracking().ToListAsync());
            storage.FailInfo = false;
            await store.ResumeAsync(recipe.Id, journal.OperationId);
            await orchestrator.InitializeUrlCaptureAsync(instance.Id);
            await orchestrator.InitializeUrlCaptureAsync(instance.Id);
            db.ChangeTracker.Clear();
            var initialized = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync();
            Assert.Equal(2, initialized.Tasks.Count);
            Assert.NotEqual(original, initialized.RecipePublicationCapture);
            Assert.Equal(journal.Payload, (await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.RecipeId == recipe.Id)).Payload);
            Assert.False((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id)).IsReady);
            Assert.Equal("https://example.test/original", (await repository.GetInfoAsync(recipe.Id, default)).SourceUrl);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_PreservesOriginalBootstrapIntentAndIndependentPendingExtraction()
    {
        await WithStore(async (services, _, _, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var counts = new[] { await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeFilePublications.CountAsync() };
            foreach (var initialized in new[] { false, true })
            {
                using var fixture = new CurrentRecoveryBootstrapIntentTests();
                await fixture.CheckAsync(services, initialized);
            }
            Assert.Equal(counts, new[] { await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeFilePublications.CountAsync() });
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task UrlBootstrap_InitializationNeverRecapturesNewerDatabaseOrFileAuthority()
    {
        foreach (var mutation in new[] { "source", "human-field", "file" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var member = (await db.FamilyMembers.FirstAsync()).Id;
                var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, store);
                var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
                var id = await service.CaptureUrl(new() { Url = "https://example.test/original" }, member);
                db.ChangeTracker.Clear();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
                var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
                var capture = instance.RecipePublicationCapture;
                if (mutation == "source") recipe.SourceUrl = "https://example.test/new-source";
                if (mutation == "human-field") recipe.Name = "New human name";
                await db.SaveChangesAsync();
                if (mutation == "file") await repository.SaveContentHtmlAsync(id, "newer retained evidence", default);
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => orchestrator.InitializeUrlCaptureAsync(instance.Id));
                db.ChangeTracker.Clear();
                Assert.Equal(capture, (await db.WorkflowInstances.AsNoTracking().SingleAsync()).RecipePublicationCapture);
                Assert.Single(await db.WorkflowTasks.AsNoTracking().ToListAsync());
                if (mutation == "file") Assert.Equal("newer retained evidence", await repository.GetContentHtmlAsync(id, default));
                if (mutation == "source") Assert.Equal("https://example.test/new-source", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).SourceUrl);
                if (mutation == "human-field") Assert.Equal("New human name", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).Name);
            });
    }

}
