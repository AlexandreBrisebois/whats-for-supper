using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipePublicationLaunchTests
{
    [Theory]
    [InlineData("parameters")]
    [InlineData("workflow")]
    public async Task CapturedLaunchRejectsChangedImmutableIntentBeforeReadingFiles(string mutation)
    {
        await using var db = TestDbContextFactory.Create();
        var storage = new InMemoryStorageProvider(); var repository = new RecipeRepository(storage);
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, Name = "Pending" }); await db.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/recipe.info", JsonSerializer.Serialize(new RecipeInfo { Id = id }, JsonDefaults.CamelCase));
        var task = await RecipeServingsTests.ProducerTask(db, repository, id);
        var instance = await db.WorkflowInstances.FindAsync(task.InstanceId);
        if (mutation == "parameters") instance!.Parameters = JsonSerializer.Serialize(new Dictionary<string, string>
            { ["recipeId"] = id.ToString(), ["privateFollowUpIntent"] = "changed after capture" });
        else instance!.WorkflowId = "different-definition";
        await db.SaveChangesAsync();
        var before = await storage.LoadAsync("recipes", $"{id}/recipe.info");
        await Assert.ThrowsAsync<InvalidDataException>(() => RecipeServingsTests.PublicationStore(db, repository).CaptureForTaskAsync(task, id));
        Assert.Empty(db.RecipeFilePublications);
        Assert.Equal(before, await storage.LoadAsync("recipes", $"{id}/recipe.info"));
    }
}
