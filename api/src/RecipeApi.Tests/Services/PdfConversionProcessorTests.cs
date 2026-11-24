using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
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
    private static WorkflowTask TaskFor(Guid id) => new() { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = id }) };

    private static (LocalRecipeStore Store, string TempDir) CreateStore()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"wfs-pdf-conv-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DataRoot"] = tempDir })
            .Build();
        var data = new DataRootResolver(config);
        var recipes = new RecipesRootResolver(data, config);
        return (new LocalRecipeStore(recipes, NullLogger<LocalRecipeStore>.Instance), tempDir);
    }

    [Fact]
    public async Task Photo_job_skips_renderer()
    {
        using var db = Db();
        var (store, tempDir) = CreateStore();
        try
        {
            var renderer = new Renderer(2);
            var id = Guid.NewGuid();
            db.Recipes.Add(new Recipe { Id = id }); await db.SaveChangesAsync();
            await store.WriteInfoAsync(new RecipeInfo { Id = id }, default);
            await new PdfConversionProcessor(store, renderer, db, new SystemClock()).ExecuteAsync(TaskFor(id), default);
            Assert.Equal(0, renderer.Calls);
        }
        finally { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); }
    }

    [Theory]
    [InlineData(1)]
    [InlineData(10)]
    public async Task Complete_pages_are_ordered_and_retries_reuse_them(int count)
    {
        using var db = Db();
        var (store, tempDir) = CreateStore();
        try
        {
            var id = Guid.NewGuid();
            db.Recipes.Add(new Recipe { Id = id, Notes = "less salt", Rating = RecipeRating.Love, FinishedDishIndex = -1 });
            await db.SaveChangesAsync();
            await store.SaveSourcePdfAsync(id, new MemoryStream(new byte[] { 7, 8 }), default);
            await store.WriteInfoAsync(new RecipeInfo { Id = id, Notes = "less salt", Rating = RecipeRating.Love }, default);
            var renderer = new Renderer(count);
            var processor = new PdfConversionProcessor(store, renderer, db, new SystemClock());
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
                var image = await store.ReadOriginalImageAsync(id, i, default);
                Assert.NotNull(image);
                using var ms = new MemoryStream();
                await using (image.Value.Stream) await image.Value.Stream.CopyToAsync(ms);
                Assert.Equal((byte)i, Assert.Single(ms.ToArray()));
            }
            await using var source = await store.ReadSourcePdfAsync(id, default);
            Assert.NotNull(source);
            Assert.Equal(7, source.ReadByte());
        }
        finally { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); }
    }

    [Theory]
    [InlineData(11, false)]
    [InlineData(1, true)]
    public async Task Failed_conversion_retains_source_and_does_not_publish_partial_pages(int count, bool fail)
    {
        using var db = Db();
        var (store, tempDir) = CreateStore();
        try
        {
            var id = Guid.NewGuid();
            db.Recipes.Add(new Recipe { Id = id, FinishedDishIndex = -1 });
            await db.SaveChangesAsync();
            await store.SaveSourcePdfAsync(id, new MemoryStream(new byte[] { 7 }), default);
            await store.WriteInfoAsync(new RecipeInfo { Id = id }, default);
            var processor = new PdfConversionProcessor(store, new Renderer(count, fail), db, new SystemClock());
            await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(TaskFor(id), default));
            Assert.Equal(0, (await db.Recipes.SingleAsync()).ImageCount);
            Assert.Null(await store.ReadOriginalImageAsync(id, 0, default));
            await using var source = await store.ReadSourcePdfAsync(id, default);
            Assert.NotNull(source);
            Assert.Equal(7, source.ReadByte());
        }
        finally { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); }
    }

    [Fact]
    public async Task Reused_pdf_pages_preserve_the_human_finished_dish_selection()
    {
        using var db = Db();
        var (store, tempDir) = CreateStore();
        try
        {
            var id = Guid.NewGuid();
            db.Recipes.Add(new Recipe { Id = id, ImageCount = 1, FinishedDishIndex = 0 });
            await db.SaveChangesAsync();
            await store.WriteInfoAsync(new RecipeInfo { Id = id, ImageCount = 1, FinishedDishImageIndex = 0 }, default);
            await store.SaveSourcePdfAsync(id, new MemoryStream(new byte[] { 7, 8 }), default);
            await store.SaveOriginalImageAsync(id, 0, "image/png", new MemoryStream([4, 5, 6]), default);
            var renderer = new Renderer(1);
            await new PdfConversionProcessor(store, renderer, db, new SystemClock()).ExecuteAsync(TaskFor(id), default);
            Assert.Equal(0, renderer.Calls);
            Assert.Equal(0, (await store.ReadInfoAsync(id, default))!.FinishedDishImageIndex);
            Assert.Equal(0, (await db.Recipes.SingleAsync()).FinishedDishIndex);
        }
        finally { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); }
    }
}
