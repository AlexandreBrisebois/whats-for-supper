using Microsoft.EntityFrameworkCore;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeImportReportPersistenceTests
{
    [Theory]
    [InlineData(WorkflowStatus.Paused)]
    [InlineData(WorkflowStatus.Failed)]
    public async Task FailedInitialImport_IsFlaggedWithoutLaunchingRepairOrLosingExistingFeedback(WorkflowStatus status)
    {
        await using var db = CreateContext();
        var (recipe, member) = await SeedAsync(db);
        recipe.IsReady = false;
        recipe.Ingredients = "[\"Salt\"]";
        var workflow = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "url-import",
            Status = status,
            Parameters = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipe.Id.ToString() })
        };
        db.WorkflowInstances.Add(workflow);
        db.WorkflowTasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "ExtractRecipe", ProcessorName = "ExtractRecipe", Status = RecipeApi.Models.TaskStatus.Failed });
        await db.SaveChangesAsync();
        var service = new RecipeImportReportService(new SystemClock(), db);
        await service.MarkFailedAsync(recipe.Id, workflow.Id, "ExtractRecipe", "Cannot extract instructions", ["steps"]);
        var flag = await db.RecipeImportReports.SingleAsync();
        Assert.Equal(recipe.Id, flag.RecipeId);
        Assert.Equal(["steps"], flag.Reasons);
        Assert.Equal(RecipeImportReportStatus.ReadyToReview, flag.Status);
        Assert.False(string.IsNullOrWhiteSpace(flag.Note));
        Assert.Contains("cooking steps", flag.Note);
        Assert.Null(flag.RepairIntentId);
        Assert.Null(flag.ReportedBy);
        Assert.False(recipe.IsReady);
        var systemBefore = System.Text.Json.JsonSerializer.Serialize(db.Entry(flag).Properties.ToDictionary(property => property.Metadata.Name, property => property.CurrentValue));
        var unchanged = await service.SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["steps"], Note = flag.Note });
        Assert.False(unchanged.ReimportStarted);
        Assert.Equal(systemBefore, System.Text.Json.JsonSerializer.Serialize(db.Entry(flag).Properties.ToDictionary(property => property.Metadata.Name, property => property.CurrentValue)));
        flag.Note = "My own feedback";
        flag.Reasons = ["steps"];
        flag.LastWorkflowInstanceId = Guid.NewGuid();
        flag.ReportedBy = member.Id;
        flag.UpdatedBy = member.Id;
        await db.SaveChangesAsync();
        var feedbackBefore = System.Text.Json.JsonSerializer.Serialize(db.Entry(flag).Properties.ToDictionary(property => property.Metadata.Name, property => property.CurrentValue));
        await service.MarkFailedAsync(recipe.Id, workflow.Id, "ExtractRecipe", "late failure");
        Assert.Equal(feedbackBefore, System.Text.Json.JsonSerializer.Serialize(db.Entry(flag).Properties.ToDictionary(property => property.Metadata.Name, property => property.CurrentValue)));
        Assert.Equal("My own feedback", flag.Note);
        Assert.Equal(["steps"], flag.Reasons);
        Assert.DoesNotContain("late failure", flag.LastError);
        Assert.Empty(await db.RecipeRepairIntents.ToListAsync());
    }

    [Theory]
    [InlineData("GenerateHero", true, true)]
    [InlineData("CategorizeRecipe", true, true)]
    [InlineData("ExtractRecipe", false, true)]
    [InlineData("ExtractRecipe", true, false)]
    public async Task NonContentOrUnretainedFailures_DoNotCreateSystemFlags(string processor, bool semanticFailure, bool retainedContent)
    {
        await using var db = CreateContext();
        var (recipe, _) = await SeedAsync(db);
        recipe.IsReady = false;
        recipe.Ingredients = retainedContent ? "[\"Salt\"]" : null;
        recipe.RawMetadata = null;
        var workflow = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "url-import",
            Status = WorkflowStatus.Paused,
            Parameters = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipe.Id })
        };
        db.WorkflowInstances.Add(workflow);
        db.WorkflowTasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed", ProcessorName = processor, Status = RecipeApi.Models.TaskStatus.Failed });
        await db.SaveChangesAsync();
        await new RecipeImportReportService(new SystemClock(), db).MarkFailedAsync(recipe.Id, workflow.Id, "failed", "failure", semanticFailure ? ["steps"] : null);
        Assert.Empty(await db.RecipeImportReports.ToListAsync());
        Assert.Empty(await db.RecipeRepairIntents.ToListAsync());
    }

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
        orchestrator.Setup(x => x.TriggerReportAsync(It.IsAny<Guid>(), recipe.Id, "url-import", It.IsAny<Dictionary<string, string>>()))
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
            Id = Guid.NewGuid(),
            Name = "Synthetic recipe",
            SourceUrl = "https://example.invalid/private",
            AddedBy = member.Id
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
