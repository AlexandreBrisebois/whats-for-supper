using Microsoft.EntityFrameworkCore;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeIssueTelemetryPersistenceTests
{
    [Fact]
    public async Task ManualAndUnchangedSaves_ObserveEachConfirmedSaveWithoutChangingResponse()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var reportCountsAtObservation = new List<int>();
        var observer = new Observer(() => reportCountsAtObservation.Add(db.RecipeImportReports.AsNoTracking().Count()));
        var service = new RecipeImportReportService(new SystemClock(), db, telemetry: observer);

        foreach (var expectedCount in new[] { 1, 2 })
        {
            var result = await service.SubmitAsync(recipe.Id, member.Id,
                new() { Reasons = ["duplicate"], Note = "private synthetic feedback" });

            Assert.False(result.ReimportStarted);
            Assert.False(result.ReimportLaunchFailed);
            Assert.Null(result.ImportId);
            Assert.Equal(expectedCount, observer.SavedCount);
            Assert.Equal(Enumerable.Repeat(1, expectedCount), reportCountsAtObservation);
            Assert.Equal(0, observer.ResolvedCount);
            var report = await db.RecipeImportReports.AsNoTracking().SingleAsync();
            Assert.Equal("private synthetic feedback", report.Note);
            Assert.Equal(["duplicate"], report.Reasons);
        }
    }

    [Fact]
    public async Task SaveBeforeLaunchFailure_ObservesSavedReportBeforeFallibleFollowup()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var observer = new Observer();
        int? observedCountAtLaunch = null;
        int? reportCountAtLaunch = null;
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(x => x.TriggerAsync("url-import", It.IsAny<Dictionary<string, string>>(), null))
            .Returns(() =>
            {
                observedCountAtLaunch = observer.SavedCount;
                reportCountAtLaunch = db.RecipeImportReports.AsNoTracking().Count();
                return Task.FromException<WorkflowInstance>(new InvalidOperationException("synthetic launch failure"));
            });
        var service = new RecipeImportReportService(new SystemClock(), db, orchestrator.Object, observer);

        var result = await service.SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["ingredients"], Note = "private synthetic feedback" });

        Assert.True(result.ReimportLaunchFailed);
        Assert.False(result.ReimportStarted);
        Assert.Null(result.ImportId);
        Assert.Equal(1, observer.SavedCount);
        Assert.Equal(1, observedCountAtLaunch);
        Assert.Equal(1, reportCountAtLaunch);
        Assert.Equal(RecipeImportReportStatus.Reported, (await db.RecipeImportReports.AsNoTracking().SingleAsync()).Status);
        Assert.Empty(db.WorkflowInstances);
    }

    [Fact]
    public async Task ThrowingObserver_DoesNotChangeSuccessfulSaveOrResponse()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var observer = new Observer(() => throw new InvalidOperationException("synthetic observer failure"));
        var service = new RecipeImportReportService(new SystemClock(), db, telemetry: observer);

        var result = await service.SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.False(result.ReimportStarted);
        Assert.False(result.ReimportLaunchFailed);
        Assert.Equal(1, observer.SavedCount);
        Assert.Single(await db.RecipeImportReports.AsNoTracking().ToListAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailedOrUncertainSave_EmitsNoFactEvenWhenStateActuallyPersisted(bool persistedBeforeThrow)
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var observer = new Observer();
        db.SaveFailure = persistedBeforeThrow ? Failure.AfterSave : Failure.BeforeSave;
        var service = new RecipeImportReportService(new SystemClock(), db, telemetry: observer);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitAsync(
            recipe.Id, member.Id, new() { Reasons = ["duplicate"] }));

        db.ChangeTracker.Clear();
        Assert.Equal(persistedBeforeThrow ? 1 : 0, await db.RecipeImportReports.CountAsync());
        Assert.Equal(0, observer.SavedCount);
    }

    [Fact]
    public async Task RejectedSubmission_EmitsNoSavedFactAndDoesNotPersist()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var observer = new Observer();
        var service = new RecipeImportReportService(new SystemClock(), db, telemetry: observer);

        await Assert.ThrowsAsync<ArgumentException>(() => service.SubmitAsync(
            recipe.Id, member.Id, new() { Reasons = ["unrecognized"] }));

        Assert.Equal(0, observer.SavedCount);
        Assert.Empty(db.RecipeImportReports);
    }

    [Fact]
    public async Task Resolution_ObservesConfirmedRemovalOnceAndPreservesIdempotentResponse()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        await new RecipeImportReportService(new SystemClock(), db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] });
        var countsAtObservation = new List<int>();
        var observer = new Observer(onResolved: () => countsAtObservation.Add(db.RecipeImportReports.AsNoTracking().Count()));
        var service = new RecipeImportReportService(new SystemClock(), db, telemetry: observer);

        var resolved = await service.DeleteAsync(recipe.Id, member.Id);
        var repeated = await service.DeleteAsync(recipe.Id, member.Id);

        Assert.Null(resolved.Recipe.ImportIssue);
        Assert.Null(repeated.Recipe.ImportIssue);
        Assert.Empty(db.RecipeImportReports);
        Assert.Equal(1, observer.ResolvedCount);
        Assert.Equal([0], countsAtObservation);
        Assert.Equal(0, observer.SavedCount);
    }

    [Fact]
    public async Task ThrowingResolutionObserver_DoesNotChangeCommittedRemovalOrResponse()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        await new RecipeImportReportService(new SystemClock(), db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] });
        var observer = new Observer(onResolved: () => throw new InvalidOperationException("synthetic observer failure"));
        var result = await new RecipeImportReportService(new SystemClock(), db, telemetry: observer)
            .DeleteAsync(recipe.Id, member.Id);

        Assert.Null(result.Recipe.ImportIssue);
        Assert.Empty(db.RecipeImportReports);
        Assert.Equal(1, observer.ResolvedCount);
        Assert.Equal(0, observer.SavedCount);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailedOrUncertainRemoval_EmitsNoFactRegardlessOfActualDatabaseState(bool persistedBeforeThrow)
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        await new RecipeImportReportService(new SystemClock(), db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] });
        var observer = new Observer();
        db.SaveFailure = persistedBeforeThrow ? Failure.AfterSave : Failure.BeforeSave;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new RecipeImportReportService(new SystemClock(), db, telemetry: observer).DeleteAsync(recipe.Id, member.Id));

        db.ChangeTracker.Clear();
        Assert.Equal(persistedBeforeThrow ? 0 : 1, await db.RecipeImportReports.CountAsync());
        Assert.Equal(0, observer.ResolvedCount);
        Assert.Equal(0, observer.SavedCount);
    }

    private static ControlledContext CreateContext() => new(new DbContextOptionsBuilder<RecipeDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(Recipe Recipe, FamilyMember Member)> SeedAsync(RecipeDbContext db)
    {
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Synthetic member" };
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(), Name = "Synthetic recipe", SourceUrl = "https://example.invalid/private", AddedBy = member.Id
        };
        db.FamilyMembers.Add(member);
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return (recipe, member);
    }

    private enum Failure { None, BeforeSave, AfterSave }

    private sealed class ControlledContext(DbContextOptions<RecipeDbContext> options) : RecipeDbContext(options)
    {
        public Failure SaveFailure { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (SaveFailure == Failure.BeforeSave) throw new InvalidOperationException("synthetic rejected save");
            var result = await base.SaveChangesAsync(cancellationToken);
            if (SaveFailure == Failure.AfterSave) throw new InvalidOperationException("synthetic uncertain acknowledgement");
            return result;
        }
    }

    private sealed class Observer(Action? onSaved = null, Action? onResolved = null) : IRecipeIssueTelemetry
    {
        public int SavedCount { get; private set; }
        public int ResolvedCount { get; private set; }
        public void Saved() { SavedCount++; onSaved?.Invoke(); }
        public void Resolved() { ResolvedCount++; onResolved?.Invoke(); }
    }
}
