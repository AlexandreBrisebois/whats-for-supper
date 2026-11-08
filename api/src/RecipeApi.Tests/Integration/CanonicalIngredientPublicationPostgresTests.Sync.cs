using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Sync_UnlinkedOldAndForeignPublicationCannotOverwriteHumanFactsOrDeliverFiles()
    {
        foreach (var foreignJournal in new[] { false, true })
            await WithStore(async (services, repository, store, _) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var instance = Guid.NewGuid();
                db.WorkflowInstances.Add(new WorkflowInstance { Id = instance, WorkflowId = "recipe-import" });
                await db.SaveChangesAsync();
                if (foreignJournal) await store.PublishAsync(await store.CaptureAsync(Id), Candidate(), Guid.NewGuid());
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.Name = "Human name"; recipe.Description = ""; recipe.Servings = 7;
                await db.SaveChangesAsync();
                await db.Entry(recipe).ReloadAsync();
                var savedBefore = JsonSerializer.Serialize(recipe);
                var infoBefore = await repository.GetInfoAsync(Id, default);
                var jsonBefore = await repository.GetRecipeJsonAsync(Id, default);
                var publisher = new Mock<ISupperProjectionPublisher>();
                var processor = new SyncRecipeProcessor(services.GetRequiredService<IClock>(), db, repository,
                    services.GetRequiredService<SupperProjectionInvalidation>(), publisher.Object,
                    NullLogger<SyncRecipeProcessor>.Instance);
                for (var attempt = 0; attempt < 2; attempt++)
                {
                    var error = await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(new WorkflowTask
                        { InstanceId = instance, Payload = JsonSerializer.Serialize(new { recipeId = Id }) }, default));
                    Assert.Contains("committed producer publication", error.Message);
                }
                await db.Entry(recipe).ReloadAsync();
                Assert.Equal(savedBefore, JsonSerializer.Serialize(recipe));
                Assert.Equal(jsonBefore, await repository.GetRecipeJsonAsync(Id, default));
                Assert.Equal(JsonSerializer.Serialize(infoBefore), JsonSerializer.Serialize(await repository.GetInfoAsync(Id, default)));
                publisher.VerifyNoOtherCalls();
            });
    }
}
