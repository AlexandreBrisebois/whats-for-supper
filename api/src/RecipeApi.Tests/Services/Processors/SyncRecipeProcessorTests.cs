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
        var recipe = new Recipe { Id = export.RecipeId, Name = "Current human name", StructuredContent = JsonSerializer.Serialize(export.Content, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            RawMetadata = export.RawMetadata, Servings = export.Content.Servings, Ingredients = "[]" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        await repository.SaveRecipeJsonAsync(recipe.Id, export.RawMetadata!, default);
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
        Assert.Empty(db.StructuredRecipeOperations);
        Assert.Empty(db.SupperServings);
        publisher.VerifyNoOtherCalls();

        await repository.SaveRecipeJsonAsync(recipe.Id, """{"@context":"https://schema.org/","@type":"Recipe","recipeYield":"8 portions","recipeIngredient":["changed"]}""", default);
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
        Assert.Equal(rowBefore, JsonSerializer.Serialize(recipe));
        await repository.SaveRecipeJsonAsync(recipe.Id, """{"format":"wfs-recipe","version":2,"recipeId":"10000000-0000-0000-0000-000000000001"}""", default);
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
        Assert.Equal(rowBefore, JsonSerializer.Serialize(recipe));
    }

}
