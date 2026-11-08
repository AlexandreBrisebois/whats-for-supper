using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class PdfRecipeReadyTests
{
    [Fact]
    public async Task Ordinary_ready_processor_records_retained_PDF_completion_and_idempotent_retry()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var store = scope.ServiceProvider.GetRequiredService<RecipeRepository>();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageProvider>();
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, AddedBy = factory.DefaultFamilyMemberId, Name = "Lemon chicken", ImageCount = 1 });
        await db.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/original/source.pdf", "%PDF"u8.ToArray());
        await store.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Lemon chicken", ImageCount = 1 }, default);
        var processor = new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, scope.ServiceProvider.GetRequiredService<IScheduleEventPublisher>(), scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>());
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = id }) };
        await processor.ExecuteAsync(task, CancellationToken.None);
        var info = await store.GetInfoAsync(id, default);
        // Assert via serialized metadata so this test precedes the internal schema addition.
        using var metadata = JsonDocument.Parse(JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
        Assert.True(metadata.RootElement.GetProperty("isReady").GetBoolean());
        await processor.ExecuteAsync(task, CancellationToken.None);
        Assert.True((await db.Recipes.SingleAsync(r => r.Id == id)).IsReady);
        Assert.NotNull(await storage.LoadAsync("recipes", $"{id}/original/source.pdf"));
    }
}
