using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

[Collection("WorkflowRootResolver")]
public sealed class RecipeFollowupIntentTests
{
    internal static async Task<TestWebApplicationFactory> Factory() => await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
    {
        ["Tests:RealWorkflowOrchestrator"] = "true", ["Tests:LocalRecipeStore"] = "true"
    });

    internal static IFormFile Upload(string type = "image/png") => new FormFile(new MemoryStream([4, 5, 6]), 0, 3, "file",
        type == "application/pdf" ? "source.pdf" : "photo.png") { Headers = new HeaderDictionary(), ContentType = type };

    internal static async Task<Guid> Accept(IServiceProvider services, Guid member, string kind)
    {
        var service = services.GetRequiredService<RecipeService>();
        if (kind == "description") return (await service.DescribeRecipe(new() { Name = "Supper", Description = "Original soup" }, member)).Id;
        if (kind == "pdf") return await services.GetRequiredService<PdfCaptureService>().AcceptAsync(member, Upload("application/pdf"), 0, null, default);
        var id = await service.CreateRecipe(member, new FormFileCollection { Upload() }, new());
        if (kind == "hero")
        {
            try { await service.AddOriginalImageAsync(id, Upload()); }
            catch (Exception) { /* Delivery has committed; unavailable definition may still fail this request. */ }
        }
        return id;
    }

    [Theory]
    [InlineData("photo", "recipe-import")]
    [InlineData("pdf", "recipe-import")]
    [InlineData("description", "goto-synthesis")]
    [InlineData("hero", "recipe-hero-regeneration")]
    public async Task AcceptanceRetainsOriginalPendingFollowupWhenDefinitionUnavailable(string kind, string workflow)
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var id = await Accept(services, factory.DefaultFamilyMemberId, kind);
        var db = services.GetRequiredService<RecipeDbContext>();
        db.ChangeTracker.Clear();
        var instance = Assert.Single(await db.WorkflowInstances.Include(x => x.Tasks).Where(x => x.WorkflowId == workflow).ToListAsync());
        Assert.Equal(WorkflowStatus.Paused, instance.Status);
        Assert.Equal(RecipeApi.Models.TaskStatus.Failed, Assert.Single(instance.Tasks).Status);
        Assert.NotNull(instance.RecipePublicationCapture);
        var journal = await db.RecipeFilePublications.SingleAsync(x => x.OperationId == instance.Id);
        Assert.True(journal.Delivered);
        using var saved = JsonDocument.Parse(journal.Payload);
        Assert.Equal(instance.RecipePublicationCapture, saved.RootElement.GetProperty("candidate").GetProperty("followupIntent").GetString());
        using var intent = JsonDocument.Parse(instance.RecipePublicationCapture!);
        Assert.Equal(id.ToString(), intent.RootElement.GetProperty("parameters").GetProperty("recipeId").GetString());
        if (kind == "description") Assert.Equal("Original soup", intent.RootElement.GetProperty("parameters").GetProperty("description").GetString());
        Assert.False((await db.Recipes.SingleAsync(x => x.Id == id)).IsReady);
    }
    internal static Task WriteDefinition(IServiceProvider services, string workflow) => services.GetRequiredService<IStorageProvider>()
        .SaveAsync("workflows", workflow + ".yaml", "name: " + workflow + "\nparameters: [recipeId, 'description?']\ntasks:\n  - name: produce\n    processor: "
            + (workflow == "goto-synthesis" ? "SynthesizeRecipe" : workflow == "recipe-hero-regeneration" ? "GenerateHero" : "ExtractRecipe")
            + "\n    payload:\n      recipeId: '{{recipeId}}'\n");

    [Theory]
    [InlineData("photo", "recipe-import")]
    [InlineData("pdf", "recipe-import")]
    [InlineData("description", "goto-synthesis")]
    [InlineData("hero", "recipe-hero-regeneration")]
    public async Task DeliveredFollowupInitializesOnceWithoutCompletingPendingWork(string kind, string workflow)
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var id = await Accept(services, factory.DefaultFamilyMemberId, kind);
        var db = services.GetRequiredService<RecipeDbContext>();
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == workflow);
        var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == instance.Id);
        var original = instance.RecipePublicationCapture;
        await WriteDefinition(services, workflow);
        var orchestrator = services.GetRequiredService<IWorkflowOrchestrator>();
        await orchestrator.InitializeRecipeFollowupAsync(instance.Id);
        await orchestrator.InitializeRecipeFollowupAsync(instance.Id);
        db.ChangeTracker.Clear();
        var current = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == instance.Id);
        Assert.NotEqual(original, current.RecipePublicationCapture);
        Assert.Equal(WorkflowStatus.Pending, current.Status);
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, Assert.Single(current.Tasks).Status);
        Assert.Equal(journal.Payload, (await db.RecipeFilePublications.SingleAsync(x => x.OperationId == instance.Id)).Payload);
        using var launch = JsonDocument.Parse(current.RecipePublicationCapture!);
        Assert.Equal(journal.ResultHash, launch.RootElement.GetProperty("capture").GetProperty("fieldHash").GetString());
        Assert.False((await db.Recipes.SingleAsync(x => x.Id == id)).IsReady);
    }

    [Theory]
    [InlineData("parameters")]
    [InlineData("task-payload")]
    [InlineData("capture")]
    [InlineData("human-field")]
    [InlineData("source")]
    [InlineData("file")]
    public async Task InitializationCannotAcquireAuthorityFromChangedAcceptedState(string mutation)
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var id = await Accept(services, factory.DefaultFamilyMemberId, "description");
        var db = services.GetRequiredService<RecipeDbContext>();
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        var recipe = await db.Recipes.SingleAsync();
        var original = instance.RecipePublicationCapture;
        var journal = (await db.RecipeFilePublications.SingleAsync()).Payload;
        if (mutation == "parameters") instance.Parameters = JsonSerializer.Serialize(new { recipeId = id, description = "New instruction" });
        if (mutation == "task-payload") instance.Tasks.Single().Payload = "{\"changed\":true}";
        if (mutation == "capture") instance.RecipePublicationCapture = null;
        if (mutation == "human-field") recipe.Description = "New human instruction";
        if (mutation == "source") recipe.SourceUrl = "https://example.test/new-source";
        await db.SaveChangesAsync();
        var storage = services.GetRequiredService<IStorageProvider>();
        if (mutation == "file") await storage.SaveAsync("recipes", $"{id}/recipe.info", "newer retained bytes");
        // No definition exists: failure must be the original authority guard.
        var error = await Record.ExceptionAsync(() => services.GetRequiredService<IWorkflowOrchestrator>().InitializeRecipeFollowupAsync(instance.Id));
        if (mutation is "human-field" or "source" or "file") Assert.IsType<RecipeContentConflictException>(error);
        else Assert.IsType<InvalidDataException>(error);
        db.ChangeTracker.Clear();
        var retained = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        Assert.Single(retained.Tasks);
        Assert.Equal(WorkflowStatus.Paused, retained.Status);
        Assert.Equal(mutation == "capture" ? null : original, retained.RecipePublicationCapture);
        Assert.Equal(journal, (await db.RecipeFilePublications.SingleAsync()).Payload);
        if (mutation == "file") Assert.Equal("newer retained bytes", System.Text.Encoding.UTF8.GetString((await storage.LoadAsync("recipes", $"{id}/recipe.info"))!));
    }

    [Fact]
    public async Task LockedRereadRefusesIntentChangedDuringDefinitionLoad()
    {
        await using var factory = await Factory();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        await Accept(services, factory.DefaultFamilyMemberId, "description");
        var db = services.GetRequiredService<RecipeDbContext>();
        var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync();
        var original = instance.RecipePublicationCapture;
        await WriteDefinition(services, "goto-synthesis");
        var storage = services.GetRequiredService<IStorageProvider>();
        var definitions = new Moq.Mock<IStorageProvider>();
        definitions.Setup(x => x.LoadAsync("workflows", "goto-synthesis.yaml")).Returns(async () =>
        {
            instance.Tasks.Single().Payload = "{\"changedDuringLoad\":true}";
            await db.SaveChangesAsync();
            return await storage.LoadAsync("workflows", "goto-synthesis.yaml");
        });
        var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(definitions.Object), db,
            services.GetRequiredService<RecipeFilePublicationStore>());
        await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.InitializeRecipeFollowupAsync(instance.Id));
        db.ChangeTracker.Clear();
        Assert.Equal(original, (await db.WorkflowInstances.SingleAsync()).RecipePublicationCapture);
        Assert.Contains("changedDuringLoad", (await db.WorkflowTasks.SingleAsync()).Payload);
    }

}
