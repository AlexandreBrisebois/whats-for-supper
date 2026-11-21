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

namespace RecipeApi.Tests.Services;

public sealed class RecipeReadyPublicationTests
{
    [Fact]
    public async Task CapturedReady_RejectsChangedSourceBeforeDatabaseOrMetadataWrite()
    {
        await using var f = await Fixture.Create();
        await f.Storage.SaveAsync("recipes", $"{f.Id}/original/source.pdf", "changed source");
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => f.Execute());
        Assert.False((await f.Db.Recipes.SingleAsync()).IsReady);
        Assert.Null((await f.Repository.GetInfoAsync(f.Id, default)).IsReady);
        Assert.Empty(f.Db.RecipeFilePublications);
    }

    [Fact]
    public async Task Ready_FileInterruptionRetainsOriginalJournalAndResumesWithoutRebasing()
    {
        await using var f = await Fixture.Create();
        f.Storage.FailInfo = true;
        await Assert.ThrowsAsync<IOException>(() => f.Execute());
        var journal = await f.Db.RecipeFilePublications.SingleAsync();
        Assert.False(journal.Delivered);
        Assert.Equal(f.Task.TaskId, journal.OperationId);
        Assert.True((await f.Db.Recipes.SingleAsync()).IsReady);
        Assert.Null((await f.Repository.GetInfoAsync(f.Id, default)).IsReady);
        var payload = journal.Payload;
        var stamp = (await f.Db.Recipes.SingleAsync()).UpdatedAt;
        f.Storage.FailInfo = false;
        await f.Execute();
        Assert.True((await f.Repository.GetInfoAsync(f.Id, default)).IsReady);
        Assert.Equal(payload, journal.Payload);
        Assert.True(journal.Delivered);
        Assert.Equal(stamp, (await f.Db.Recipes.SingleAsync()).UpdatedAt);
        var writes = f.Storage.Writes;
        await f.Execute();
        Assert.Equal(writes, f.Storage.Writes);
        Assert.Equal("private notes", (await f.Repository.GetInfoAsync(f.Id, default)).Notes);
    }

    [Fact]
    public async Task HistoricalAlreadyReady_DoesNotManufactureMetadataCompletion()
    {
        await using var f = await Fixture.Create();
        var recipe = await f.Db.Recipes.SingleAsync(); recipe.IsReady = true;
        await f.Db.SaveChangesAsync();
        var before = await f.Storage.LoadAsync("recipes", $"{f.Id}/recipe.info");
        await f.Execute();
        Assert.Equal(before, await f.Storage.LoadAsync("recipes", $"{f.Id}/recipe.info"));
        Assert.Empty(f.Db.RecipeFilePublications);
    }

    [Fact]
    public async Task PendingReady_RejectsNewSourceAndChangedOriginalInputWithoutReplacingMetadata()
    {
        await using var f = await Fixture.Create();
        f.Storage.FailInfo = true;
        await Assert.ThrowsAsync<IOException>(() => f.Execute());
        f.Storage.FailInfo = false;
        await f.Storage.SaveAsync("recipes", $"{f.Id}/original/source.pdf", "new PDF");
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => f.Execute());
        Assert.Null((await f.Repository.GetInfoAsync(f.Id, default)).IsReady);
        f.Task.Payload = JsonSerializer.Serialize(new { recipeId = f.Id, changed = true });
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => f.Execute());
        Assert.False((await f.Db.RecipeFilePublications.SingleAsync()).Delivered);
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public RecipeDbContext Db { get; } = TestDbContextFactory.Create();
        public Guid Id { get; } = Guid.NewGuid();
        public InterruptStorage Storage { get; } = new();
        public RecipeRepository Repository { get; }
        public RecipeFilePublicationStore Owner { get; }
        public WorkflowTask Task { get; private set; } = null!;
        public Fixture()
        {
            Repository = new(Storage); Owner = RecipeServingsTests.PublicationStore(Db, Repository);
        }
        public static async Task<Fixture> Create()
        {
            var f = new Fixture();
            f.Db.Recipes.Add(new Recipe { Id = f.Id, Name = "Original", Category = "Supper" });
            await f.Db.SaveChangesAsync();
            await f.Repository.SaveInfoAsync(new RecipeInfo { Id = f.Id, Name = "Original", Notes = "private notes" }, default);
            await f.Storage.SaveAsync("recipes", $"{f.Id}/original/source.pdf", "original PDF");
            var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "ready-test",
                Parameters = JsonSerializer.Serialize(new Dictionary<string,string> { ["recipeId"] = f.Id.ToString() }) };
            f.Task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "ready",
                ProcessorName = "RecipeReady", Payload = JsonSerializer.Serialize(new { recipeId = f.Id }) };
            instance.Tasks.Add(f.Task);
            await f.Owner.CaptureLaunchAsync(instance);
            f.Db.WorkflowInstances.Add(instance); await f.Db.SaveChangesAsync();
            return f;
        }
        public Task<object?> Execute()
        {
            return new RecipeReadyProcessor(Db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), Owner).ExecuteAsync(Task, default);
        }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    private sealed class InterruptStorage : IStorageProvider
    {
        private readonly InMemoryStorageProvider inner = new();
        public bool FailInfo { get; set; }
        public int Writes { get; private set; }
        public Task SaveAsync(string p, string k, string v) => inner.SaveAsync(p,k,v);
        public Task SaveAsync(string p, string k, byte[] v) => inner.SaveAsync(p,k,v);
        public Task SaveAtomicallyAsync(string p, string k, byte[] v)
        {
            Writes++;
            if (FailInfo && k.EndsWith("/recipe.info", StringComparison.Ordinal)) throw new IOException("Interrupted metadata delivery");
            return ((IStorageProvider)inner).SaveAtomicallyAsync(p,k,v);
        }
        public Task DeleteAtomicallyAsync(string p,string k) => inner.DeleteAtomicallyAsync(p,k);
        public Task<byte[]?> LoadAsync(string p,string k) => inner.LoadAsync(p,k);
        public Task<List<KeyValuePair<string,string>>> FindAsync(string p,string k) => inner.FindAsync(p,k);
        public List<string> List(string p) => inner.List(p);
    }
}
