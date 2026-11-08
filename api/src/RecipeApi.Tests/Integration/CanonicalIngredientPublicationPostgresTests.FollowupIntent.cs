using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task AcceptedFollowup_CommitsWithPublicationBeforeDeliveryAndInitializesOnlyAfterDelivery()
    {
        foreach (var kind in new[] { "photo", "pdf", "description", "hero" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = await db.Recipes.Select(x => x.Id).ToListAsync();
                var member = (await db.FamilyMembers.FirstAsync()).Id;
                var workflow = kind == "description" ? "goto-synthesis" : kind == "hero" ? "recipe-hero-regeneration" : "recipe-import";
                var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, store);
                var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(async () =>
                {
                    if (kind == "photo") await service.CreateRecipe(member, new FormFileCollection { Upload() }, new());
                    if (kind == "description") await service.DescribeRecipe(new() { Name = "Supper", Description = "Original soup" }, member);
                    if (kind == "pdf") await ActivatorUtilities.CreateInstance<PdfCaptureService>(services, store, orchestrator)
                        .AcceptAsync(member, RecipeFollowupIntentTests.Upload("application/pdf"), 0, null, default);
                    if (kind == "hero")
                    {
                        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                        recipe.ImageCount = 1;
                        await db.SaveChangesAsync();
                        await service.AddOriginalImageAsync(Id, Upload());
                    }
                });
                // A separate context proves accepted workflow, source journal and membership
                // committed together, independently of the request's tracked objects.
                using (var readScope = services.CreateScope())
                {
                    var committed = readScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    Assert.Single(await committed.WorkflowInstances.Where(x => x.WorkflowId == workflow).ToListAsync());
                    Assert.Single(await committed.RecipeFilePublications.ToListAsync());
                }
                db.ChangeTracker.Clear();
                var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == workflow);
                var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == instance.Id);
                var id = journal.RecipeId;
                Assert.Equal(kind == "hero", before.Contains(id));
                Assert.False(journal.Delivered);
                var original = instance.RecipePublicationCapture;
                using (var saved = JsonDocument.Parse(journal.Payload))
                    Assert.True(JsonNode.DeepEquals(JsonNode.Parse(original!), JsonNode.Parse(saved.RootElement.GetProperty("candidate").GetProperty("followupIntent").GetString()!)));
                await RecipeFollowupIntentTests.WriteDefinition(services, workflow);
                await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.InitializeRecipeFollowupAsync(instance.Id));
                storage.FailInfo = false;
                await store.ResumeAsync(id, journal.OperationId);
                db.ChangeTracker.Clear();
                Assert.Equal(WorkflowStatus.Paused, (await db.WorkflowInstances.SingleAsync(x => x.Id == instance.Id)).Status);
                Assert.Equal(RecipeApi.Models.TaskStatus.Failed, (await db.WorkflowTasks.SingleAsync(x => x.InstanceId == instance.Id)).Status);
                await orchestrator.InitializeRecipeFollowupAsync(instance.Id);
                await orchestrator.InitializeRecipeFollowupAsync(instance.Id);
                db.ChangeTracker.Clear();
                Assert.Equal(WorkflowStatus.Pending, (await db.WorkflowInstances.SingleAsync(x => x.Id == instance.Id)).Status);
                Assert.Equal(RecipeApi.Models.TaskStatus.Pending, (await db.WorkflowTasks.SingleAsync(x => x.InstanceId == instance.Id)).Status);
                Assert.Equal(journal.Payload, (await db.RecipeFilePublications.SingleAsync()).Payload);
                if (kind != "hero") Assert.False((await db.Recipes.SingleAsync(x => x.Id == id)).IsReady);
                if (kind == "pdf") Assert.Equal(new byte[] { 4, 5, 6 }, await storage.LoadAsync("recipes", $"{id}/original/source.pdf"));
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task AcceptedFollowup_NeverRecapturesNewerHumanOrFileAuthority()
    {
        foreach (var mutation in new[] { "parameters", "human-field", "file" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var member = (await db.FamilyMembers.FirstAsync()).Id;
                var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, store);
                var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
                var id = (await service.DescribeRecipe(new() { Name = "Supper", Description = "Original soup" }, member)).Id;
                db.ChangeTracker.Clear();
                var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
                var original = instance.RecipePublicationCapture;
                var journal = (await db.RecipeFilePublications.SingleAsync()).Payload;
                if (mutation == "parameters") instance.Parameters = JsonSerializer.Serialize(new { recipeId = id, description = "Changed soup" });
                if (mutation == "human-field") (await db.Recipes.SingleAsync(x => x.Id == id)).Description = "Human description";
                await db.SaveChangesAsync();
                if (mutation == "file") await repository.SaveContentHtmlAsync(id, "newer retained source", default);
                var error = await Record.ExceptionAsync(() => orchestrator.InitializeRecipeFollowupAsync(instance.Id));
                if (mutation == "parameters") Assert.IsType<InvalidDataException>(error);
                else Assert.IsType<RecipeContentConflictException>(error);
                db.ChangeTracker.Clear();
                Assert.Equal(original, (await db.WorkflowInstances.SingleAsync()).RecipePublicationCapture);
                Assert.Single(await db.WorkflowTasks.ToListAsync());
                Assert.Equal(journal, (await db.RecipeFilePublications.SingleAsync()).Payload);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_PreservesAcceptedFollowupAndIndependentPendingState()
    {
        await WithStore(async (services, _, _, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var before = new[] { await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeFilePublications.CountAsync() };
            foreach (var initialized in new[] { false, true })
            {
                using var fixture = new CurrentRecoveryFollowupIntentTests();
                await fixture.CheckAsync(services, initialized);
            }
            Assert.Equal(before, new[] { await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeFilePublications.CountAsync() });
        });
    }
}
