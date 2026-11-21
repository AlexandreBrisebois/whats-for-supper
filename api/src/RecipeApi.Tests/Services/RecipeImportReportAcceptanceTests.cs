using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipeImportReportAcceptanceTests
{
    [Fact]
    public async Task FailedLaunch_DoesNotClearAnotherCommittedAttempt()
    {
        await using var db = TestDbContextFactory.Create();
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Synthetic member" };
        var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/recipe" };
        db.FamilyMembers.Add(member);
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var acceptedElsewhere = Guid.NewGuid();
        var attemptAt = DateTimeOffset.UtcNow;
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(x => x.TriggerReportAsync(It.IsAny<Guid>(), recipe.Id, "url-import",
                It.IsAny<Dictionary<string, string>>()))
            .Returns(async () =>
            {
                // A separate manual-import acceptance can associate a report
                // while this request is waiting on definition/storage work.
                db.WorkflowInstances.Add(new WorkflowInstance { Id = acceptedElsewhere, WorkflowId = "url-import" });
                var report = await db.RecipeImportReports.SingleAsync();
                report.Status = RecipeImportReportStatus.Reimporting;
                report.LastWorkflowInstanceId = acceptedElsewhere;
                report.LastAttemptAt = attemptAt;
                await db.SaveChangesAsync();
                throw new IOException("Synthetic failure of this request's launch");
            });

        var response = await new RecipeImportReportService(new SystemClock(), db, orchestrator.Object)
            .SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["steps"], Note = "Original feedback" });

        Assert.False(response.ReimportStarted);
        Assert.True(response.ReimportLaunchFailed);
        var committed = await db.RecipeImportReports.AsNoTracking().SingleAsync();
        Assert.Equal(acceptedElsewhere, committed.LastWorkflowInstanceId);
        Assert.Equal(attemptAt, committed.LastAttemptAt);
        Assert.Equal(RecipeImportReportStatus.Reimporting, committed.Status);
        Assert.Equal(acceptedElsewhere, (await db.WorkflowInstances.SingleAsync()).Id);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LaunchCommit_AlreadyContainsReportAssociation_EvenWhenAcknowledgementIsLost(bool loseAcknowledgement)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        await using var db = new ObservingContext(options);
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Synthetic member" };
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Synthetic recipe", SourceUrl = "https://example.invalid/recipe" };
        db.FamilyMembers.Add(member);
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
        await storage.SaveAsync("workflows", "url-import.yaml", """
            name: url-import
            parameters: [recipeId, url, repairReasons?, repairNote?]
            tasks:
              - name: retain
                processor: Noop
                payload:
                  recipeId: "{{recipeId}}"
            """);
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
            TestPublicationStore.Create(db, storage, clock));
        Guid? associatedAtLaunchSave = null;
        db.AfterLaunchSave = async () =>
        {
            await using var observer = new RecipeDbContext(options);
            var report = await observer.RecipeImportReports.AsNoTracking().SingleAsync();
            associatedAtLaunchSave = report.LastWorkflowInstanceId;
            Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
            Assert.NotNull(report.LastAttemptAt);
            if (loseAcknowledgement) throw new IOException("Synthetic lost commit acknowledgement");
        };

        var response = await new RecipeImportReportService(clock, db, orchestrator).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["ingredients"], Note = "Retain original feedback" });

        Assert.True(response.ReimportStarted);
        Assert.False(response.ReimportLaunchFailed);
        Assert.Equal(response.ImportId, associatedAtLaunchSave);
        await using var readback = new RecipeDbContext(options);
        var committed = await readback.RecipeImportReports.AsNoTracking().SingleAsync();
        Assert.Equal(response.ImportId, committed.LastWorkflowInstanceId);
        Assert.Equal(response.ImportId, (await readback.WorkflowInstances.AsNoTracking().SingleAsync()).Id);
        Assert.Equal("Retain original feedback", committed.Note);
        Assert.Equal(["ingredients"], committed.Reasons);
        var replay = await new RecipeImportReportService(clock, readback, orchestrator).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["ingredients"], Note = "Retain original feedback" });
        Assert.Equal(response.ImportId, replay.ImportId);
        Assert.Single(await readback.WorkflowInstances.ToListAsync());
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
