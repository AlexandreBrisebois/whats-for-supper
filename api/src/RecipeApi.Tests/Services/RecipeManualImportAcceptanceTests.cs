using System.Text.Json;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipeManualImportAcceptanceTests
{
    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task ManualImport_CommitsReportAssociationWithChild_AndReconcilesLostAcknowledgement(bool loseAcknowledgement, bool advanceReport)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        await using var db = new ObservingContext(options);
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
        var report = new RecipeImportReport
        {
            RecipeId = recipe.Id, Reasons = ["ingredients"], Note = null,
            Status = RecipeImportReportStatus.ReimportFailed, LastError = "Original error"
        };
        db.Recipes.Add(recipe);
        db.RecipeImportReports.Add(report);
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
        await storage.SaveAsync("workflows", "url-import.yaml", """
            name: url-import
            parameters: [recipeId, url]
            tasks:
              - name: retain
                processor: FetchUrlContent
                payload:
                  recipeId: "{{recipeId}}"
            """);
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));
        Guid? associationAtChildSave = null;
        db.AfterLaunchSave = async () =>
        {
            await using var read = new RecipeDbContext(options);
            associationAtChildSave = (await read.RecipeImportReports.AsNoTracking().SingleAsync()).LastWorkflowInstanceId;
            if (advanceReport)
            {
                var advanced = await read.RecipeImportReports.SingleAsync();
                advanced.Status = RecipeImportReportStatus.ReadyToReview;
                advanced.ReimportedAt = DateTimeOffset.UtcNow;
                await read.SaveChangesAsync();
            }
            if (loseAcknowledgement) throw new IOException("Synthetic lost acknowledgement");
        };

        var accepted = await new RecipeImportService(db, orchestrator)
            .TriggerImport(recipe.Id);

        Assert.Equal(accepted, associationAtChildSave);
        await using var readback = new RecipeDbContext(options);
        var committedReport = await readback.RecipeImportReports.AsNoTracking().SingleAsync();
        var committedChild = await readback.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        Assert.Equal(accepted, committedChild.Id);
        Assert.NotNull(committedChild.RecipePublicationCapture);
        using var originalLaunch = JsonDocument.Parse(committedChild.RecipePublicationCapture);
        Assert.Equal(2, originalLaunch.RootElement.GetProperty("version").GetInt32());
        Assert.Equal("https://example.invalid/original", originalLaunch.RootElement.GetProperty("parameters").GetProperty("url").GetString());
        Assert.Single(committedChild.Tasks);
        Assert.Equal(accepted, committedReport.LastWorkflowInstanceId);
        Assert.Equal(advanceReport ? RecipeImportReportStatus.ReadyToReview : RecipeImportReportStatus.Reimporting, committedReport.Status);
        Assert.NotNull(committedReport.LastAttemptAt);
        Assert.Null(committedReport.LastError);
        Assert.Null(committedReport.Note);
        Assert.Equal(["ingredients"], committedReport.Reasons);
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("duplicate", false)]
    [InlineData("ingredients", true)]
    [InlineData("steps", true)]
    [InlineData("duplicate,steps", true)]
    public async Task ManualImport_PreservesExistingReportEligibility_AndIntentionalRepeat(string? reasons, bool associates)
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), ImageCount = 1 };
        db.Recipes.Add(recipe);
        var oldAttempt = Guid.NewGuid();
        var oldTime = DateTimeOffset.UtcNow.AddDays(-1);
        if (reasons is not null)
            db.RecipeImportReports.Add(new RecipeImportReport
            {
                RecipeId = recipe.Id, Reasons = reasons.Split(','), Note = null,
                LastWorkflowInstanceId = oldAttempt, LastAttemptAt = oldTime,
                Status = RecipeImportReportStatus.ReimportFailed, LastError = "Original failure"
            });
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, ImageCount = 1 }, default);
        await storage.SaveAsync("workflows", "recipe-import.yaml", """
            name: recipe-import
            parameters: [recipeId]
            tasks:
              - name: extract
                processor: ExtractRecipe
                payload:
                  recipeId: "{{recipeId}}"
            """);
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));
        var service = new RecipeImportService(db, orchestrator);

        var first = await service.TriggerImport(recipe.Id);
        var second = await service.TriggerImport(recipe.Id);

        Assert.NotEqual(first, second);
        Assert.Equal(2, await db.WorkflowInstances.CountAsync());
        if (reasons is null)
            Assert.Empty(await db.RecipeImportReports.ToListAsync());
        else
        {
            var report = await db.RecipeImportReports.AsNoTracking().SingleAsync();
            Assert.Equal(reasons.Split(','), report.Reasons);
            Assert.Null(report.Note);
            Assert.Equal(associates ? second : oldAttempt, report.LastWorkflowInstanceId);
            Assert.Equal(associates ? RecipeImportReportStatus.Reimporting : RecipeImportReportStatus.ReimportFailed, report.Status);
            if (associates) Assert.Null(report.LastError);
            else
            {
                Assert.Equal("Original failure", report.LastError);
                Assert.Equal(oldTime, report.LastAttemptAt);
            }
        }
    }

    [Theory]
    [InlineData("workflow")]
    [InlineData("parameters")]
    [InlineData("capture")]
    public async Task LostAcknowledgement_DoesNotCertifyOrDeleteInconsistentSavedWork(string divergence)
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/original" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(x => x.TriggerImportAsync(It.IsAny<Guid>(), recipe.Id, "url-import", It.IsAny<Dictionary<string, string>>()))
            .Returns(async (Guid instanceId, Guid _, string workflowId, Dictionary<string, string> parameters) =>
            {
                db.WorkflowInstances.Add(new WorkflowInstance
                {
                    Id = instanceId,
                    WorkflowId = divergence == "workflow" ? "recipe-import" : workflowId,
                    Parameters = JsonSerializer.Serialize(divergence == "parameters"
                        ? new Dictionary<string, string> { ["recipeId"] = Guid.NewGuid().ToString() } : parameters)
                });
                await db.SaveChangesAsync();
                throw new IOException("Synthetic lost acknowledgement");
            });

        await Assert.ThrowsAsync<InvalidDataException>(() => new RecipeImportService(db, orchestrator.Object).TriggerImport(recipe.Id));

        Assert.Single(await db.WorkflowInstances.AsNoTracking().ToListAsync());
        Assert.Empty(await db.RecipeImportReports.ToListAsync());
    }

    private sealed class ObservingContext(DbContextOptions<RecipeDbContext> options) : RecipeDbContext(options)
    {
        public Func<Task>? AfterLaunchSave { get; set; }
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var launch = ChangeTracker.Entries<WorkflowInstance>().Any(x => x.State == EntityState.Added);
            var count = await base.SaveChangesAsync(cancellationToken);
            if (launch && AfterLaunchSave is { } callback)
            {
                AfterLaunchSave = null;
                await callback();
            }
            return count;
        }
    }
}
