using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeImportLifecycleTests
{
    [Fact]
    public async Task TriggerImport_WithActiveReport_RecordsAttemptStart()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = SeedRecipe(db, sourceUrl: "https://example.com/recipe");
        SeedReport(db, recipe.Id);
        await db.SaveChangesAsync();

        var instance = Workflow("url-import", recipe.Id, DateTimeOffset.UtcNow);
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator
            .Setup(service => service.TriggerAsync(
                "url-import",
                It.IsAny<Dictionary<string, string>>(),
                null))
            .ReturnsAsync(instance);
        var reportService = new RecipeImportReportService(db);
        var service = new RecipeImportService(db, orchestrator.Object, reportService);

        var result = await service.TriggerImport(recipe.Id);

        Assert.Equal(instance.Id, result);
        var report = await db.RecipeImportReports.SingleAsync();
        Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
        Assert.Equal(instance.Id, report.LastWorkflowInstanceId);
        Assert.NotNull(report.LastAttemptAt);
        Assert.Null(report.ReimportedAt);
        Assert.Null(report.LastError);
    }

    [Fact]
    public async Task TriggerImport_WithoutActiveReport_DoesNotCreateOne()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = SeedRecipe(db, imageCount: 1);
        await db.SaveChangesAsync();

        var instance = Workflow("recipe-import", recipe.Id, DateTimeOffset.UtcNow);
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator
            .Setup(service => service.TriggerAsync(
                "recipe-import",
                It.IsAny<Dictionary<string, string>>(),
                null))
            .ReturnsAsync(instance);
        var service = new RecipeImportService(
            db,
            orchestrator.Object,
            new RecipeImportReportService(db));

        await service.TriggerImport(recipe.Id);

        Assert.Empty(db.RecipeImportReports);
    }

    [Fact]
    public async Task GetImportStatus_ReturnsNewestPhotoOrUrlAttempt()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = SeedRecipe(db, imageCount: 1);
        var olderPhoto = Workflow("recipe-import", recipe.Id, DateTimeOffset.UtcNow.AddMinutes(-2));
        var newerUrl = Workflow("url-import", recipe.Id, DateTimeOffset.UtcNow.AddMinutes(-1));
        newerUrl.Status = WorkflowStatus.Completed;
        db.WorkflowInstances.AddRange(olderPhoto, newerUrl);
        await db.SaveChangesAsync();
        var service = new RecipeImportService(
            db,
            Mock.Of<IWorkflowOrchestrator>(),
            new RecipeImportReportService(db));

        var result = await service.GetImportStatus(recipe.Id);

        Assert.NotNull(result);
        Assert.Equal(nameof(WorkflowStatus.Completed), result.Status);
    }

    [Fact]
    public async Task LifecycleTransitions_AreGuardedAndKeepFailurePrivate()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = SeedRecipe(db, imageCount: 1);
        SeedReport(db, recipe.Id);
        await db.SaveChangesAsync();
        var service = new RecipeImportReportService(db);
        var olderAttempt = Guid.NewGuid();
        var newerAttempt = Guid.NewGuid();

        await service.MarkAttemptStartedAsync(recipe.Id, olderAttempt);
        await service.MarkAttemptStartedAsync(recipe.Id, newerAttempt);
        await service.MarkSucceededAsync(recipe.Id, olderAttempt);

        var afterStaleSuccess = await db.RecipeImportReports.SingleAsync();
        Assert.Equal(RecipeImportReportStatus.Reimporting, afterStaleSuccess.Status);
        Assert.Equal(newerAttempt, afterStaleSuccess.LastWorkflowInstanceId);

        await service.MarkFailedAsync(
            recipe.Id,
            newerAttempt,
            "extract_recipe",
            $"private failure\n{new string('x', 2500)}");

        var failed = await db.RecipeImportReports.SingleAsync();
        Assert.Equal(RecipeImportReportStatus.ReimportFailed, failed.Status);
        Assert.NotNull(failed.LastError);
        Assert.True(failed.LastError.Length <= 2000);
        Assert.DoesNotContain('\n', failed.LastError);
        Assert.Equal("reported", RecipeImportReportService.ToPublicDto(failed)!.Status);

        var finalAttempt = Guid.NewGuid();
        await service.MarkAttemptStartedAsync(recipe.Id, finalAttempt);
        await service.MarkSucceededAsync(recipe.Id, finalAttempt);

        var succeeded = await db.RecipeImportReports.SingleAsync();
        Assert.Equal(RecipeImportReportStatus.ReadyToReview, succeeded.Status);
        Assert.NotNull(succeeded.ReimportedAt);
        Assert.Null(succeeded.LastError);
    }

    [Theory]
    [InlineData("recipe-import")]
    [InlineData("url-import")]
    public void ImportWorkflow_AppendsReportSuccessAfterRecipeReady(string workflowId)
    {
        var definition = ReadWorkflow(workflowId);

        var transition = Assert.Single(
            definition.Tasks,
            task => task.Processor == "CompleteRecipeImportReport");
        Assert.Equal(["recipe_ready"], transition.DependsOn);
    }

    [Theory]
    [InlineData("goto-synthesis")]
    [InlineData("recategorize-ingredients")]
    public void UnrelatedWorkflow_DoesNotMutateImportReport(string workflowId)
    {
        var definition = ReadWorkflow(workflowId);
        Assert.DoesNotContain(
            definition.Tasks,
            task => task.Processor == "CompleteRecipeImportReport");
    }

    private static WorkflowDefinition ReadWorkflow(string workflowId)
    {
        var path = Path.Combine(
            AppContext.BaseDirectory,
            "src",
            "RecipeApi",
            "Workflows",
            $"{workflowId}.yaml");
        var yaml = File.ReadAllText(path);
        return new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build()
            .Deserialize<WorkflowDefinition>(yaml);
    }

    private static Recipe SeedRecipe(
        RecipeDbContext db,
        int imageCount = 0,
        string? sourceUrl = null)
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Lifecycle recipe",
            ImageCount = imageCount,
            SourceUrl = sourceUrl,
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Recipes.Add(recipe);
        return recipe;
    }

    private static void SeedReport(RecipeDbContext db, Guid recipeId)
    {
        db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["ingredients"],
            Note = "Check quantities"
        });
    }

    private static WorkflowInstance Workflow(
        string workflowId,
        Guid recipeId,
        DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        WorkflowId = workflowId,
        Status = WorkflowStatus.Processing,
        Parameters = JsonSerializer.Serialize(new Dictionary<string, string>
        {
            ["recipeId"] = recipeId.ToString()
        }),
        CreatedAt = createdAt,
        UpdatedAt = createdAt
    };
}
