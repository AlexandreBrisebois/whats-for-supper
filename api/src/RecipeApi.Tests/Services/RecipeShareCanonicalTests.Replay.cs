using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeShareCanonicalTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SharedPublication_ResumesOriginalDeliveryAndDuplicatePreservesNewerHumanFieldsAndMedia(bool interrupt)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await QualifySharedReplayAsync(factory, interrupt, rejectNewerPending: false);
    }

    [Fact]
    public async Task SharedPublication_PendingDeliveryRejectsNewerHumanFieldsBeforeAnyFileReplacement()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await QualifySharedReplayAsync(factory, interrupt: true, rejectNewerPending: true);
    }

    internal static async Task QualifySharedReplayAsync(TestWebApplicationFactory factory, bool interrupt, bool rejectNewerPending)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var storage = new InterruptedShareStorage(services.GetRequiredService<IStorageProvider>());
        var repository = new RecipeRepository(storage);
        var recipesRoot = services.GetRequiredService<RecipesRootResolver>().Root;
        var clock = services.GetRequiredService<IClock>();
        var publications = new RecipeFilePublicationStore(db, repository, clock,
            services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, storage, clock, services));
        var id = Guid.NewGuid();
        var operation = Guid.NewGuid();
        var capture = await publications.CaptureNewAsync(id);
        const string raw = """{"name":"Shared pasta","recipeIngredient":["pasta","salt to taste"],"recipeInstructions":[{"text":"Cook the pasta."}]}""";
        var candidate = publications.PrepareSharedIntake(capture, raw,
            new RecipeInfo { Id = id, Name = "Shared pasta", IsReady = true, ImageCount = 1, AddedBy = factory.DefaultFamilyMemberId },
            new Dictionary<string, byte[]?> { ["hero.webp"] = [1, 2, 3], ["original/0.png"] = [4, 5, 6] }, operation);
        storage.FailJson = interrupt;
        if (interrupt) await Assert.ThrowsAsync<IOException>(() => publications.PublishAsync(capture, candidate, operation));
        else await publications.PublishAsync(capture, candidate, operation);
        var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
        var original = CanonicalRecipeContentStore.Read(recipe)!;
        var originalCanonical = recipe.CanonicalContent;
        var journal = await db.RecipeFilePublications.SingleAsync(x => x.OperationId == operation);
        Assert.Equal(!interrupt, journal.Delivered);
        storage.FailJson = false;
        if (rejectNewerPending)
        {
            recipe.Name = "Newer human name";
            recipe.Description = "";
            await db.SaveChangesAsync();
            var files = ShareFiles(recipesRoot);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => publications.ResumeAsync(id, operation));
            Assert.Equal(files, ShareFiles(recipesRoot));
            Assert.False(journal.Delivered);
            Assert.Equal("Newer human name", recipe.Name);
            Assert.Equal("", recipe.Description);
            Assert.Equal(originalCanonical, recipe.CanonicalContent);
            return;
        }
        if (interrupt) await publications.ResumeAsync(id, operation);
        Assert.True(journal.Delivered);
        // Compare the persisted representation, including PostgreSQL JSONB's
        // normalization, rather than the pre-save tracked serialization.
        await db.Entry(journal).ReloadAsync();
        Assert.Equal([4, 5, 6], await repository.GetOriginalImageAsync(id, 0, default));
        var filesBefore = ShareFiles(recipesRoot);
        var canonicalBefore = recipe.CanonicalContent;
        var journalBefore = journal.Payload;
        recipe.Name = "Newer human name";
        recipe.Description = "";
        recipe.Notes = "Newer private note";
        await db.SaveChangesAsync();
        await publications.PublishAsync(capture, candidate, operation);
        await publications.ResumeAsync(id, operation);
        db.ChangeTracker.Clear();
        var after = await db.Recipes.SingleAsync(x => x.Id == id);
        Assert.Equal("Newer human name", after.Name);
        Assert.Equal("", after.Description);
        Assert.Equal("Newer private note", after.Notes);
        Assert.Equal(canonicalBefore, after.CanonicalContent);
        Assert.Equal(filesBefore, ShareFiles(recipesRoot));
        Assert.Equal(journalBefore, (await db.RecipeFilePublications.SingleAsync(x => x.OperationId == operation)).Payload);
        Assert.Single(await db.RecipeFilePublications.Where(x => x.RecipeId == id).ToListAsync());
        Assert.Equal(original.IngredientLines.Select(x => x.Id), CanonicalRecipeContentStore.Read(after)!.IngredientLines.Select(x => x.Id));
    }

    private static string ShareFiles(string root) => string.Join("\n",
        Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Order(StringComparer.Ordinal)
            .Select(path => Path.GetRelativePath(root, path) + ":" + Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))));

    private sealed class InterruptedShareStorage(IStorageProvider inner) : IStorageProvider
    {
        public bool FailJson { get; set; }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public Task SaveAtomicallyAsync(string partition, string key, byte[] value) => FailJson && key.EndsWith("/recipe.json", StringComparison.Ordinal)
            ? throw new IOException("Controlled shared-recipe delivery interruption") : inner.SaveAtomicallyAsync(partition, key, value);
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
