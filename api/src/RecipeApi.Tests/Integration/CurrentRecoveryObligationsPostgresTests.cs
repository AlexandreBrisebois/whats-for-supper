using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class CurrentRecoveryObligationsPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RetainsHistoricalV1CanonicalRequestsAndAllCreatedIdKindsWithoutPublication()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryCanonicalOperationTests();
            await fixture.CheckOriginalsAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RejectsCurrentV2CanonicalRequestsInHistoricalFormatBeforeWrites()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryCanonicalOperationTests();
            await fixture.CheckOriginalsAsync(factory.Services, currentV2: true);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Trigger_NonwriterPersistsOriginalDispatchIntentWithoutRecipeBaselineOrRecapture()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var storage = scope.ServiceProvider.GetRequiredService<IStorageProvider>();
            await storage.SaveAsync("workflows", "dispatch-capture-test.yaml", """
                name: dispatch-capture-test
                parameters: [private]
                tasks:
                  - name: dispatch
                    processor: StartWorkflow
                    payload: { workflowId: child, parameters: { private: original } }
                """);
            var publications = TestPublicationStore.Create(db, storage, new SystemClock());
            var orchestrator = new WorkflowOrchestrator(new SystemClock(), new WorkflowRepository(storage), db, publications);
            var scheduled = DateTimeOffset.Parse("2026-11-08T01:00:00Z");
            var parameters = new Dictionary<string, string> { ["private"] = "original" };
            var started = await orchestrator.TriggerAsync("dispatch-capture-test", parameters, scheduled);
            parameters["private"] = "changed caller";
            db.ChangeTracker.Clear();
            var saved = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.Id == started.Id);
            Assert.NotNull(saved.RecipePublicationCapture);
            using var capture = JsonDocument.Parse(saved.RecipePublicationCapture!);
            Assert.Equal(saved.Id, capture.RootElement.GetProperty("instanceId").GetGuid());
            Assert.Equal("original", capture.RootElement.GetProperty("parameters").GetProperty("private").GetString());
            Assert.False(capture.RootElement.TryGetProperty("capture", out _));
            var task = Assert.Single(saved.Tasks);
            Assert.Equal(scheduled, capture.RootElement.GetProperty("tasks").GetProperty(task.TaskId.ToString()).GetProperty("scheduledAt").GetDateTimeOffset());
            var original = saved.RecipePublicationCapture;
            task.RetryCount = 2; task.ScheduledAt = scheduled.AddDays(1);
            await publications.CaptureLaunchAsync(saved);
            Assert.Equal(original, saved.RecipePublicationCapture);
            task.Payload = """{"workflowId":"changed","parameters":{}}""";
            await Assert.ThrowsAsync<InvalidDataException>(() => publications.CaptureLaunchAsync(saved));
            Assert.Equal(original, saved.RecipePublicationCapture);
            Assert.Equal(original, (await db.WorkflowInstances.AsNoTracking().SingleAsync(x => x.Id == started.Id)).RecipePublicationCapture);
            Assert.Empty(await db.RecipeFilePublications.ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RetainsImmutableDispatchAndIndependentPendingWorkWithoutPublication()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryDispatchTests();
            await fixture.CheckDispatchAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RetainsProcessorChildAndReportAssociationsWithoutDispatch()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            foreach (var processor in new[] { "StartWorkflow", "CompleteRecipeImportReport", "QueueRecipeSearchIndex" })
            {
                using var fixture = new CurrentRecoveryProcessorLinksTests();
                await fixture.CheckProcessorLinksAsync(factory.Services, processor);
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RetainsDurableIntentAndOriginalMutationReceiptsWithoutPublication()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryObligationsTests();
            await fixture.CheckObligationsAsync(factory.Services);
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RetainsCapturedPublicationAncestryWithoutDeliveringOrCompletingTasks()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryObligationsTests();
            await fixture.CheckObligationsAsync(factory.Services, publicationChain: true);
        });
    }
}
