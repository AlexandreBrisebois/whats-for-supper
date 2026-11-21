using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeProtectedReimportTests
{
    private static async Task QualifyPhotoDeliveryAsync(IServiceProvider services, WorkflowTask task, Guid id,
        Mock<IChatClient> chat, IPromptRepository prompts, bool rejectNewerPending)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var storage = new InterruptedPhotoRepairStorage(services.GetRequiredService<IStorageProvider>());
        var clock = services.GetRequiredService<IClock>();
        var publisher = new RecipeFilePublicationStore(db, new RecipeRepository(storage), clock,
            services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, storage, clock, services));
        var agent = new RecipeAgent(chat.Object, prompts, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, publisher, "ExtractRecipe");
        storage.FailJson = true;
        await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(task, default));
        var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
        var accepted = recipe.CanonicalContent;
        var journal = await db.RecipeFilePublications.SingleAsync(x => x.OperationId == task.TaskId);
        Assert.False(journal.Delivered);
        Assert.Equal("300", CanonicalRecipeContentStore.Read(recipe)!.IngredientLines[0].Amount!.Value!.N);
        var callsBeforeReplay = chat.Invocations.Count;
        var root = services.GetRequiredService<RecipesRootResolver>().Root;
        storage.FailJson = false;
        if (rejectNewerPending)
        {
            recipe.Name = "Newer human name";
            recipe.Description = "";
            await db.SaveChangesAsync();
            var files = PhotoFiles(root);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(task, default));
            Assert.Equal(callsBeforeReplay, chat.Invocations.Count);
            Assert.Equal(files, PhotoFiles(root));
            Assert.False(journal.Delivered);
            Assert.Equal(("Newer human name", "", accepted), (recipe.Name, recipe.Description, recipe.CanonicalContent));
            return;
        }
        await agent.ExecuteAsync(task, default);
        Assert.Equal(callsBeforeReplay, chat.Invocations.Count);
        Assert.True(journal.Delivered);
        await db.Entry(journal).ReloadAsync();
        var originalJournal = journal.Payload;
        var deliveredFiles = PhotoFiles(root);
        recipe.Name = "Newer human name";
        recipe.Description = "";
        recipe.Notes = "Later private note";
        await db.SaveChangesAsync();
        await agent.ExecuteAsync(task, default);
        Assert.Equal(callsBeforeReplay, chat.Invocations.Count);
        db.ChangeTracker.Clear();
        var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal(("Newer human name", "", "Later private note", accepted),
            (after.Name, after.Description, after.Notes, after.CanonicalContent));
        Assert.Equal(deliveredFiles, PhotoFiles(root));
        Assert.Equal(originalJournal, (await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == task.TaskId)).Payload);
    }

    private static string PhotoFiles(string root) => string.Join("\n", Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
        .Order(StringComparer.Ordinal).Select(path => Path.GetRelativePath(root, path) + ":" + Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))));

    private sealed class InterruptedPhotoRepairStorage(IStorageProvider inner) : IStorageProvider
    {
        public bool FailJson { get; set; }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public Task SaveAtomicallyAsync(string partition, string key, byte[] value) => FailJson && key.EndsWith("/recipe.json", StringComparison.Ordinal)
            ? throw new IOException("Controlled photo repair delivery interruption") : inner.SaveAtomicallyAsync(partition, key, value);
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
