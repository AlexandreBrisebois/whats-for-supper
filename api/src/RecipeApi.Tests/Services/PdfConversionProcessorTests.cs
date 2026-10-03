using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
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
    private static WorkflowTask TaskFor(Guid id) => new() { Payload = JsonSerializer.Serialize(new { recipeId = id }) };

    [Fact]
    public async Task Photo_job_skips_renderer()
    {
        using var db = Db();
        var store = new InMemoryRecipeStore();
        var renderer = new Renderer(2);
        await new PdfConversionProcessor(db, store, renderer).ExecuteAsync(TaskFor(Guid.NewGuid()), default);
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
        var store = new InMemoryRecipeStore();
        await store.SaveSourcePdfAsync(id, new MemoryStream([7, 8]));
        await store.WriteInfoAsync(new RecipeInfo { Id = id, Notes = "less salt", Rating = RecipeRating.Love });
        var renderer = new Renderer(count);
        var processor = new PdfConversionProcessor(db, store, renderer);
        await processor.ExecuteAsync(TaskFor(id), default);
        await processor.ExecuteAsync(TaskFor(id), default);
        Assert.Equal(1, renderer.Calls);
        var recipe = await db.Recipes.SingleAsync();
        Assert.Equal(count, recipe.ImageCount);
        Assert.False(recipe.IsReady);
        Assert.Equal(-1, recipe.FinishedDishIndex);
        Assert.Equal("less salt", recipe.Notes);
        for (var i = 0; i < count; i++)
        {
            var image = await store.ReadOriginalImageAsync(id, i);
            Assert.NotNull(image);
            using var stream = image!.Value.Stream;
            Assert.Equal(i, stream.ReadByte());
        }
        await using var source = await store.ReadSourcePdfAsync(id);
        Assert.Equal(7, source!.ReadByte());
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
        var store = new InMemoryRecipeStore();
        await store.SaveSourcePdfAsync(id, new MemoryStream([7]));
        await store.WriteInfoAsync(new RecipeInfo { Id = id });
        var processor = new PdfConversionProcessor(db, store, new Renderer(count, fail));
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(TaskFor(id), default));
        Assert.Equal(0, (await db.Recipes.SingleAsync()).ImageCount);
        Assert.False(await store.HasOriginalImagesAsync(id));
        await using var source = await store.ReadSourcePdfAsync(id);
        Assert.Equal(7, source!.ReadByte());
        await store.DeleteAsync(id);
        Assert.Null(await store.ReadSourcePdfAsync(id));
    }
}
