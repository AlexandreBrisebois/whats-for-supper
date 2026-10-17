using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class ContextualUrlRepairTests : IDisposable
{
    private readonly RecipeDbContext _db = TestDbContextFactory.Create();
    private readonly InMemoryStorageProvider _storage = new();
    private readonly Guid _memberId = Guid.NewGuid();

    public void Dispose() => _db.Dispose();

    private async Task LoadDefinitionAsync(string name) => await _storage.SaveAsync("workflows", $"{name}.yaml",
        await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "src", "RecipeApi", "Workflows", $"{name}.yaml")));

    private async Task<Recipe> SeedAsync(string? url = "https://example.com/recipe?source=saved", int images = 0)
    {
        _db.FamilyMembers.Add(new FamilyMember { Id = _memberId, Name = "Alex" });
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Pasta", AddedBy = _memberId, SourceUrl = url, ImageCount = images };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();
        return recipe;
    }

    private RecipeImportReportService Service() => new(_db, new WorkflowOrchestrator(new WorkflowRepository(_storage), _db));
    private static RecipeImportIssueRequest Feedback(string note = "  Check the quantities  ") =>
        new() { Reasons = ["steps", "ingredients"], Note = note };

    [Fact]
    public async Task PackagedUrlLaunch_PersistsSavedUrl_ReusesActiveAndSuppressesTerminalFeedback()
    {
        await LoadDefinitionAsync("url-import");
        var recipe = await SeedAsync();
        var service = Service();
        var response = await service.SubmitAsync(recipe.Id, _memberId, Feedback());
        Assert.True(response.ReimportStarted);
        Assert.False(response.ReimportLaunchFailed);
        var workflow = await _db.WorkflowInstances.Include(w => w.Tasks).SingleAsync();
        Assert.Equal(response.ImportId, workflow.Id);
        Assert.Equal("url-import", workflow.WorkflowId);
        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(workflow.Parameters!)!;
        Assert.Equal(recipe.SourceUrl, parameters["url"]);
        Assert.Equal(recipe.Id.ToString(), parameters["recipeId"]);
        Assert.Equal("ingredients,steps", parameters["repairReasons"]);
        Assert.Equal("Check the quantities", parameters["repairNote"]);
        var fetch = workflow.Tasks.Single(t => t.TaskName == "fetch_url_content");
        Assert.Equal(recipe.SourceUrl, JsonDocument.Parse(fetch.Payload!).RootElement.GetProperty("url").GetString());
        Assert.Equal(workflow.Id, (await _db.RecipeImportReports.SingleAsync()).LastWorkflowInstanceId);

        Assert.Equal(workflow.Id, (await service.SubmitAsync(recipe.Id, _memberId, Feedback())).ImportId);
        await Assert.ThrowsAsync<RecipeImportReportActiveException>(() => service.SubmitAsync(recipe.Id, _memberId, Feedback("Changed")));
        Assert.Equal(1, await _db.WorkflowInstances.CountAsync());
        workflow.Status = WorkflowStatus.Completed;
        await _db.SaveChangesAsync();
        Assert.False((await service.SubmitAsync(recipe.Id, _memberId, Feedback())).ReimportStarted);
        Assert.Equal(1, await _db.WorkflowInstances.CountAsync());
        var changed = await service.SubmitAsync(recipe.Id, _memberId, Feedback("Changed"));
        Assert.True(changed.ReimportStarted);
        Assert.NotEqual(workflow.Id, changed.ImportId);
        Assert.Equal(2, await _db.WorkflowInstances.CountAsync());
    }

    [Fact]
    public async Task FailedLaunch_SavesReport_ThenUnchangedRetryCanLaunch()
    {
        var recipe = await SeedAsync();
        var service = Service();
        var failed = await service.SubmitAsync(recipe.Id, _memberId, Feedback());
        Assert.True(failed.ReimportLaunchFailed);
        Assert.Null(failed.ImportId);
        Assert.Empty(await _db.WorkflowInstances.ToListAsync());
        Assert.Null((await _db.RecipeImportReports.SingleAsync()).LastWorkflowInstanceId);
        await LoadDefinitionAsync("url-import");
        var retried = await service.SubmitAsync(recipe.Id, _memberId, Feedback());
        Assert.True(retried.ReimportStarted);
        Assert.Single(await _db.WorkflowInstances.ToListAsync());
    }

    [Fact]
    public async Task ManualReportsRemainManual_AndImageRepairDoesNotInventUrl()
    {
        await LoadDefinitionAsync("recipe-import");
        var recipe = await SeedAsync(url: null, images: 1);
        var service = Service();
        Assert.False((await service.SubmitAsync(recipe.Id, _memberId, new() { Reasons = ["duplicate"], Note = "Check" })).ReimportStarted);
        Assert.False((await service.SubmitAsync(recipe.Id, _memberId, new() { Reasons = ["ingredients"], Note = " " })).ReimportStarted);
        Assert.Empty(await _db.WorkflowInstances.ToListAsync());
        Assert.True((await service.SubmitAsync(recipe.Id, _memberId, Feedback())).ReimportStarted);
        var workflow = await _db.WorkflowInstances.SingleAsync();
        Assert.Equal("recipe-import", workflow.WorkflowId);
        Assert.False(JsonSerializer.Deserialize<Dictionary<string, string>>(workflow.Parameters!)!.ContainsKey("url"));
    }
}
