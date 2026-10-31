using Microsoft.EntityFrameworkCore;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeImportReportPersistenceTests
{
    [Fact]
    public async Task ManualAndUnchangedSaves_PreserveOneReportAndResponse()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var service = new RecipeImportReportService(new SystemClock(), db);

        foreach (var _ in new[] { 1, 2 })
        {
            var result = await service.SubmitAsync(recipe.Id, member.Id,
                new() { Reasons = ["duplicate"], Note = "private synthetic feedback" });

            Assert.False(result.ReimportStarted);
            Assert.False(result.ReimportLaunchFailed);
            Assert.Null(result.ImportId);
            var report = await db.RecipeImportReports.AsNoTracking().SingleAsync();
            Assert.Equal("private synthetic feedback", report.Note);
            Assert.Equal(["duplicate"], report.Reasons);
        }
    }

    [Fact]
    public async Task SaveBeforeLaunchFailure_PersistsReportBeforeFallibleFollowup()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        int? reportCountAtLaunch = null;
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(x => x.TriggerAsync("url-import", It.IsAny<Dictionary<string, string>>(), null))
            .Returns(() =>
            {
                reportCountAtLaunch = db.RecipeImportReports.AsNoTracking().Count();
                return Task.FromException<WorkflowInstance>(new InvalidOperationException("synthetic launch failure"));
            });
        var service = new RecipeImportReportService(new SystemClock(), db, orchestrator.Object);

        var result = await service.SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["ingredients"], Note = "private synthetic feedback" });

        Assert.True(result.ReimportLaunchFailed);
        Assert.False(result.ReimportStarted);
        Assert.Null(result.ImportId);
        Assert.Equal(1, reportCountAtLaunch);
        Assert.Equal(RecipeImportReportStatus.Reported, (await db.RecipeImportReports.AsNoTracking().SingleAsync()).Status);
        Assert.Empty(db.WorkflowInstances);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailedOrUncertainSave_PreservesActualPersistenceState(bool persistedBeforeThrow)
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        db.SaveFailure = persistedBeforeThrow ? Failure.AfterSave : Failure.BeforeSave;
        var service = new RecipeImportReportService(new SystemClock(), db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitAsync(
            recipe.Id, member.Id, new() { Reasons = ["duplicate"] }));

        db.ChangeTracker.Clear();
        Assert.Equal(persistedBeforeThrow ? 1 : 0, await db.RecipeImportReports.CountAsync());
    }

    [Fact]
    public async Task RejectedSubmission_DoesNotPersist()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        var service = new RecipeImportReportService(new SystemClock(), db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.SubmitAsync(
            recipe.Id, member.Id, new() { Reasons = ["unrecognized"] }));

        Assert.Empty(db.RecipeImportReports);
    }

    [Fact]
    public async Task Resolution_RemovesReportAndPreservesIdempotentResponse()
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        await new RecipeImportReportService(new SystemClock(), db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] });
        var service = new RecipeImportReportService(new SystemClock(), db);

        var resolved = await service.DeleteAsync(recipe.Id, member.Id);
        var repeated = await service.DeleteAsync(recipe.Id, member.Id);

        Assert.Null(resolved.Recipe.ImportIssue);
        Assert.Null(repeated.Recipe.ImportIssue);
        Assert.Empty(db.RecipeImportReports);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailedOrUncertainRemoval_PreservesActualDatabaseState(bool persistedBeforeThrow)
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        await new RecipeImportReportService(new SystemClock(), db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] });
        db.SaveFailure = persistedBeforeThrow ? Failure.AfterSave : Failure.BeforeSave;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new RecipeImportReportService(new SystemClock(), db).DeleteAsync(recipe.Id, member.Id));

        db.ChangeTracker.Clear();
        Assert.Equal(persistedBeforeThrow ? 0 : 1, await db.RecipeImportReports.CountAsync());
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


}
