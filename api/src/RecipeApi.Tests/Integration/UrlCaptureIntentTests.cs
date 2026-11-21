using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

[Collection("WorkflowRootResolver")]
public sealed class UrlCaptureIntentTests
{
    private static async Task<TestWebApplicationFactory> Factory() => await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
    {
        ["Tests:RealWorkflowOrchestrator"] = "true", ["Tests:LocalRecipeStore"] = "true"
    });

    [Fact]
    public async Task AcceptanceRetainsOriginalInitializationIntentAfterWriterGraphReplacement()
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var id = await services.GetRequiredService<RecipeService>().CaptureUrl(
            new CaptureUrlDto { Url = "https://example.test/original" }, factory.DefaultFamilyMemberId);
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        Assert.NotNull(instance.RecipePublicationCapture);
        var original = instance.RecipePublicationCapture;
        using (var saved = JsonDocument.Parse(original!))
        {
            Assert.Equal("dispatch", saved.RootElement.GetProperty("kind").GetString());
            Assert.Equal("https://example.test/original", saved.RootElement.GetProperty("parameters").GetProperty("url").GetString());
        }
        var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.RecipeId == id);
        Assert.Equal(instance.Id, journal.OperationId);
        using (var saved = JsonDocument.Parse(journal.Payload))
            Assert.Equal(original, saved.RootElement.GetProperty("candidate").GetProperty("bootstrapIntent").GetString());
        await UrlCaptureRecoveryTests.WriteWorkflowAsync(services);
        await services.GetRequiredService<IWorkflowOrchestrator>().InitializeUrlCaptureAsync(instance.Id);
        db.ChangeTracker.Clear();
        var initialized = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        Assert.Equal(2, initialized.Tasks.Count);
        Assert.NotEqual(original, initialized.RecipePublicationCapture);
        Assert.Equal(journal.Payload, (await db.RecipeFilePublications.SingleAsync()).Payload);
        Assert.False((await db.Recipes.SingleAsync()).IsReady);
    }

    [Theory]
    [InlineData("parameters")]
    [InlineData("recipe")]
    [InlineData("payload")]
    [InlineData("task-id")]
    [InlineData("capture")]
    public async Task InitializationRefusesChangedOriginalIntentBeforeLoadingDefinition(string mutation)
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var id = await services.GetRequiredService<RecipeService>().CaptureUrl(
            new CaptureUrlDto { Url = "https://example.test/original" }, factory.DefaultFamilyMemberId);
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        switch (mutation)
        {
            case "parameters": instance.Parameters = JsonSerializer.Serialize(new { recipeId = id, url = "https://example.test/changed" }); break;
            case "recipe": instance.Parameters = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid(), url = "https://example.test/original" }); break;
            case "payload": instance.Tasks.Single().Payload = "{\"changed\":true}"; break;
            case "task-id": db.WorkflowTasks.Remove(instance.Tasks.Single()); instance.Tasks = [new WorkflowTask
            {
                TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "initialize_url_import",
                ProcessorName = "UrlCaptureInitialization", Status = RecipeApi.Models.TaskStatus.Failed
            }]; db.WorkflowTasks.Add(instance.Tasks.Single()); break;
            case "capture": instance.RecipePublicationCapture = null; break;
        }
        await db.SaveChangesAsync();
        var payload = (await db.RecipeFilePublications.SingleAsync()).Payload;
        var bytes = await services.GetRequiredService<IRecipeStore>().ReadInfoAsync(id);
        await Assert.ThrowsAsync<InvalidDataException>(() => services.GetRequiredService<IWorkflowOrchestrator>().InitializeUrlCaptureAsync(instance.Id));
        db.ChangeTracker.Clear();
        Assert.Single((await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync()).Tasks);
        Assert.Equal(payload, (await db.RecipeFilePublications.SingleAsync()).Payload);
        Assert.Equal(bytes!.SourceUrl, (await services.GetRequiredService<IRecipeStore>().ReadInfoAsync(id))!.SourceUrl);
        Assert.False((await db.Recipes.SingleAsync()).IsReady);
    }
    [Fact]
    public async Task InitializationRechecksIntentAfterDefinitionLoadBeforeReplacingGraph()
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        await services.GetRequiredService<RecipeService>().CaptureUrl(
            new CaptureUrlDto { Url = "https://example.test/original" }, factory.DefaultFamilyMemberId);
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        var original = instance.RecipePublicationCapture;
        await UrlCaptureRecoveryTests.WriteWorkflowAsync(services);
        var storage = services.GetRequiredService<IStorageProvider>();
        var definitions = new Moq.Mock<IStorageProvider>();
        definitions.Setup(x => x.LoadAsync("workflows", "url-import.yaml")).Returns(async () =>
        {
            var task = await db.WorkflowTasks.SingleAsync();
            task.Payload = "{\"changedDuringDefinitionLoad\":true}";
            await db.SaveChangesAsync();
            return await storage.LoadAsync("workflows", "url-import.yaml");
        });
        var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(),
            new WorkflowRepository(definitions.Object), db, services.GetRequiredService<RecipeFilePublicationStore>());
        await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.InitializeUrlCaptureAsync(instance.Id));
        db.ChangeTracker.Clear();
        var retained = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        Assert.Equal(original, retained.RecipePublicationCapture);
        Assert.Contains("changedDuringDefinitionLoad", retained.Tasks.Single().Payload);
        Assert.Equal(WorkflowStatus.Paused, retained.Status);
        Assert.False((await db.Recipes.SingleAsync()).IsReady);
    }

    [Theory]
    [InlineData("source")]
    [InlineData("human-field")]
    [InlineData("file")]
    public async Task InitializationCannotAcquireFreshAuthorityOverChangedAcceptedRecipe(string mutation)
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var id = await services.GetRequiredService<RecipeService>().CaptureUrl(
            new CaptureUrlDto { Url = "https://example.test/original" }, factory.DefaultFamilyMemberId);
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        var recipe = await db.Recipes.SingleAsync();
        if (mutation == "source") recipe.SourceUrl = "https://example.test/new-human-source";
        if (mutation == "human-field") recipe.Name = "New human title";
        await db.SaveChangesAsync();
        var storage = services.GetRequiredService<IStorageProvider>();
        if (mutation == "file") await storage.SaveAsync("recipes", $"{id}/recipe.info", "newer retained bytes");
        var original = instance.RecipePublicationCapture;
        var journal = (await db.RecipeFilePublications.SingleAsync()).Payload;
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => services.GetRequiredService<IWorkflowOrchestrator>().InitializeUrlCaptureAsync(instance.Id));
        db.ChangeTracker.Clear();
        Assert.Equal(original, (await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync()).RecipePublicationCapture);
        Assert.Single(await db.WorkflowTasks.ToListAsync());
        Assert.Equal(journal, (await db.RecipeFilePublications.SingleAsync()).Payload);
        if (mutation == "file") Assert.Equal("newer retained bytes", System.Text.Encoding.UTF8.GetString((await storage.LoadAsync("recipes", $"{id}/recipe.info"))!));
    }

}
