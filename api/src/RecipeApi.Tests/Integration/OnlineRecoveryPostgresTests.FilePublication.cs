using RecipeApi.Tests.Infrastructure;
using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task FilePublication_SnapshotRequiresCompletedDeliveryAndRestoresReplayWithoutReinstallingOldFiles()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        const string original = """{"name":"Original","recipeIngredient":["salt"]}""";
        const string replacement = """{"name":"Published","recipeIngredient":["pepper"]}""";
        var recipe = new Recipe { Name = "Original", RawMetadata = original, Ingredients = "[\"salt\"]" };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        var storage = new PublicationInterruptedStorage(services.GetRequiredService<IStorageProvider>());
        var repository = new RecipeRepository(storage);
        await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = "Original" }, default);
        await repository.SaveRecipeJsonAsync(recipe.Id, original, default);
        var store = new RecipeFilePublicationStore(db, repository, services.GetRequiredService<IClock>(),
            services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, repository.StorageProvider, services.GetRequiredService<IClock>(), services));
        var capture = await store.CaptureAsync(recipe.Id);
        var candidate = new RecipePublicationCandidate(replacement, new RecipeInfo { Id = recipe.Id, Name = "Published" });
        var operation = Guid.NewGuid();
        storage.Interrupt = true;
        await Assert.ThrowsAsync<IOException>(() => store.PublishAsync(capture, candidate, operation));
        var recovery = services.GetRequiredService<RecoverySnapshotService>();
        await Assert.ThrowsAsync<RecoveryBusyException>(() => recovery.CaptureAsync(default));
        Assert.False((await db.RecipeFilePublications.SingleAsync()).Delivered);
        storage.Interrupt = false;
        await store.ResumeAsync(recipe.Id, operation);
        var snapshot = await recovery.CaptureAsync(default);
        recipe.Name = "Later edit"; await db.SaveChangesAsync();
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null)).StatusCode);
        db.ChangeTracker.Clear();
        var restored = await db.Recipes.SingleAsync(); Assert.Equal("Published", restored.Name);
        var journal = await db.RecipeFilePublications.SingleAsync(); Assert.True(journal.Delivered); Assert.Equal(operation, journal.OperationId);
        var restoredJson = await repository.GetRecipeJsonAsync(recipe.Id, default);
        await store.PublishAsync(capture, candidate, operation);
        Assert.Equal(restoredJson, await repository.GetRecipeJsonAsync(recipe.Id, default));
    }

    private sealed class PublicationInterruptedStorage(IStorageProvider inner) : IStorageProvider
    {
        public bool Interrupt { get; set; }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public Task SaveAtomicallyAsync(string partition, string key, byte[] value) => Interrupt && key.EndsWith("/recipe.info", StringComparison.Ordinal)
            ? throw new IOException("Interrupted publication") : inner.SaveAtomicallyAsync(partition, key, value);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
