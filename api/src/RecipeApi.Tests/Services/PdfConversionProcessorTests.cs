using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class PdfConversionProcessorTests
{
    private sealed class Renderer(int pages, bool fail = false) : IPdfPageRenderer
    {
        public int Calls { get; private set; }
        public Task<IReadOnlyList<byte[]>> RenderAsync(Stream source, CancellationToken ct)
        {
            Calls++;
            if (fail) throw new InvalidDataException("Corrupt/encrypted PDF");
            return Task.FromResult<IReadOnlyList<byte[]>>(Enumerable.Range(0, pages).Select(i => new byte[] { (byte)i }).ToArray());
        }
    }

    private static RecipeDbContext Db() => new(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static WorkflowTask TaskFor(Guid id) => new() { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = id }) };

    [Fact]
    public async Task Photo_job_skips_renderer()
    {
        using var db = Db();
        var storage = new InMemoryStorageProvider();
        var store = new RecipeRepository(storage);
        var publications = TestPublicationStore.Create(db, storage, new SystemClock());
        var renderer = new Renderer(2);
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id }); await db.SaveChangesAsync();
        await store.SaveInfoAsync(new RecipeInfo { Id = id }, default);
        await new PdfConversionProcessor(publications, renderer).ExecuteAsync(TaskFor(id), default);
        Assert.Equal(0, renderer.Calls);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(10)]
    public async Task Complete_pages_are_ordered_and_retries_reuse_them(int count)
    {
        using var db = Db();
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, Notes = "less salt", Rating = RecipeRating.Love, FinishedDishIndex = -1 });
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        var store = new RecipeRepository(storage);
        var publications = TestPublicationStore.Create(db, storage, new SystemClock());
        await storage.SaveAsync("recipes", $"{id}/original/source.pdf", new byte[] { 7, 8 });
        await store.SaveInfoAsync(new RecipeInfo { Id = id, Notes = "less salt", Rating = RecipeRating.Love }, default);
        var renderer = new Renderer(count);
        var processor = new PdfConversionProcessor(publications, renderer);
        var task = TaskFor(id);
        await processor.ExecuteAsync(task, default);
        await processor.ExecuteAsync(task, default);
        Assert.Equal(1, renderer.Calls);
        var recipe = await db.Recipes.SingleAsync();
        Assert.Equal(count, recipe.ImageCount);
        Assert.False(recipe.IsReady);
        Assert.Equal(-1, recipe.FinishedDishIndex);
        Assert.Equal("less salt", recipe.Notes);
        for (var i = 0; i < count; i++)
        {
            var image = await store.GetOriginalImageAsync(id, i, default);
            Assert.Equal((byte)i, Assert.Single(image));
        }
        var source = await storage.LoadAsync("recipes", $"{id}/original/source.pdf");
        Assert.Equal(7, source![0]);
    }

    [Theory]
    [InlineData(11, false)]
    [InlineData(1, true)]
    public async Task Failed_conversion_retains_source_and_does_not_publish_partial_pages(int count, bool fail)
    {
        using var db = Db();
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, FinishedDishIndex = -1 });
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        var store = new RecipeRepository(storage);
        var publications = TestPublicationStore.Create(db, storage, new SystemClock());
        await storage.SaveAsync("recipes", $"{id}/original/source.pdf", new byte[] { 7 });
        await store.SaveInfoAsync(new RecipeInfo { Id = id }, default);
        var processor = new PdfConversionProcessor(publications, new Renderer(count, fail));
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(TaskFor(id), default));
        Assert.Equal(0, (await db.Recipes.SingleAsync()).ImageCount);
        Assert.Null(await storage.LoadAsync("recipes", $"{id}/original/0.png"));
        var source = await storage.LoadAsync("recipes", $"{id}/original/source.pdf");
        Assert.Equal(7, source![0]);
    }
    [Fact]
    public async Task Reused_pdf_pages_preserve_the_human_finished_dish_selection()
    {
        using var db = Db();
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, ImageCount = 1, FinishedDishIndex = 0 });
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, ImageCount = 1, FinishedDishImageIndex = 0 }, default);
        await storage.SaveAsync("recipes", $"{id}/original/source.pdf", new byte[] { 7, 8 });
        await repository.SaveOriginalImageAsync(id, 0, "image/png", [4, 5, 6], default);
        var renderer = new Renderer(1);
        await new PdfConversionProcessor(TestPublicationStore.Create(db, storage, new SystemClock()), renderer).ExecuteAsync(TaskFor(id), default);
        Assert.Equal(0, renderer.Calls);
        Assert.Equal(0, (await repository.GetInfoAsync(id, default)).FinishedDishImageIndex);
        Assert.Equal(0, (await db.Recipes.SingleAsync()).FinishedDishIndex);
    }

}
