using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class SyncRecipeProcessorTests
{
    [Fact]
    public async Task ExplicitCurrentReplay_OnlyConfirmsIdenticalFactsWithoutPublishingOrUpdating()
    {
        using var db = TestDbContextFactory.Create();
        var export = CurrentRecipeExportTests.Example();
        var recipe = new Recipe { Id = export.RecipeId, Name = "Current human name", CanonicalContent = JsonSerializer.Serialize(export.Content, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            RawMetadata = export.RawMetadata, Servings = export.Content.Servings, Ingredients = "[]" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        await repository.SaveRecipeJsonAsync(recipe.Id, RecipeExportContent.WriteCurrent(export), default);
        await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = "Stale file name" }, default);
        var jsonBefore = await repository.GetRecipeJsonAsync(recipe.Id, default);
        var rowBefore = JsonSerializer.Serialize(recipe);
        var publisher = new Mock<ISupperProjectionPublisher>();
        var invalidation = new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
        var processor = new SyncRecipeProcessor(new SystemClock(), db, repository, invalidation,
            publisher.Object, NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, new SystemClock()));
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id, mode = "current-format-replay" }) };
        for (var index = 0; index < 2; index++) Assert.NotNull(await processor.ExecuteAsync(task, default));
        Assert.Equal(rowBefore, JsonSerializer.Serialize(recipe));
        Assert.Equal(jsonBefore, await repository.GetRecipeJsonAsync(recipe.Id, default));
        Assert.Equal("Stale file name", (await repository.GetInfoAsync(recipe.Id, default)).Name);
        Assert.Empty(db.RecipeFilePublications);
        Assert.Empty(db.CanonicalRecipeOperations);
        Assert.Empty(db.SupperServings);
        publisher.VerifyNoOtherCalls();

        var changed = export with { Content = export.Content with { ContentRevision = "another-revision", Servings = 8 } };
        await repository.SaveRecipeJsonAsync(recipe.Id, RecipeExportContent.WriteCurrent(changed), default);
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
        Assert.Equal(rowBefore, JsonSerializer.Serialize(recipe));
        await repository.SaveRecipeJsonAsync(recipe.Id, RecipeExportContent.WriteCurrent(export with { Content = export.Content with { Servings = 8 } }), default);
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
        Assert.Equal(rowBefore, JsonSerializer.Serialize(recipe));
    }

    [Theory]
    [InlineData(false, "{\"recipeIngredient\":[\"old salt\"]}")]
    [InlineData(true, "{\"recipeIngredient\":[\"old salt\"]}")]
    [InlineData(false, "{\"backupContentVersion\":1,\"rawMetadata\":null,\"ingredients\":null,\"servings\":null}")]
    [InlineData(true, "{\"backupContentVersion\":1,\"rawMetadata\":null,\"ingredients\":null,\"servings\":4}")]
    public async Task UnlinkedSync_RefusesUncapturedDiskImportWithoutAnyMutation(bool hasInstance, string diskContent)
    {
        using var db = TestDbContextFactory.Create();
        var id = Guid.NewGuid();
        var recipe = new Recipe { Id = id, Name = "Human name", Description = "", Servings = 7,
            Ingredients = "[\"retained\"]", RawMetadata = "{\"recipeYield\":\"2 portions\"}" };
        db.Recipes.Add(recipe);
        var task = new WorkflowTask { InstanceId = hasInstance ? Guid.NewGuid() : Guid.Empty,
            Payload = JsonSerializer.Serialize(new { recipeId = id }) };
        if (hasInstance) db.WorkflowInstances.Add(new WorkflowInstance { Id = task.InstanceId, WorkflowId = "recipe-import" });
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Old file", ImageCount = 1 }, default);
        await repository.SaveRecipeJsonAsync(id, diskContent, default);
        var before = JsonSerializer.Serialize(recipe);
        var invalidation = new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
        var publisher = new Mock<ISupperProjectionPublisher>();
        var processor = new SyncRecipeProcessor(new SystemClock(), db, repository, invalidation,
            publisher.Object, NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, new SystemClock()));

        var error = await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
        Assert.Contains("committed producer publication", error.Message);
        db.ChangeTracker.Clear();
        Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.SingleAsync(x => x.Id == id)));
        Assert.Equal(diskContent, await repository.GetRecipeJsonAsync(id, default));
        Assert.Equal("Old file", (await repository.GetInfoAsync(id, default)).Name);
        Assert.Empty(db.RecipeFilePublications);
        Assert.Empty(db.CanonicalRecipeOperations);
        Assert.Empty(db.SupperServings);
        publisher.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UnlinkedSync_DoesNotReadMissingFilesOrCreateMissingRecipe()
    {
        using var db = TestDbContextFactory.Create();
        var invalidation = new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var processor = new SyncRecipeProcessor(new SystemClock(), db, repository,
            invalidation, Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, repository.StorageProvider, new SystemClock()));
        var error = await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(new WorkflowTask
            { Payload = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid() }) }, default));
        Assert.Contains("committed producer publication", error.Message);
        Assert.Empty(db.Recipes);
    }
}
