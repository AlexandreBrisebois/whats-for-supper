using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private static WorkflowTask CurrentReplayTask() => new()
    {
        Payload = JsonSerializer.Serialize(new { recipeId = Id, mode = "current-format-replay" })
    };

    private static async Task<CanonicalRecipeExport> SeedCurrentReplayAsync(IServiceProvider services, RecipeRepository repository)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var export = CurrentRecipeExportTests.Example() with { RecipeId = Id };
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.CanonicalContent = JsonSerializer.Serialize(export.Content, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        recipe.RawMetadata = export.RawMetadata;
        recipe.Servings = export.Content.Servings;
        await db.SaveChangesAsync();
        await db.Entry(recipe).ReloadAsync();
        export = new(Id, CanonicalRecipeContentStore.Read(recipe)!, recipe.RawMetadata);
        await repository.SaveRecipeJsonAsync(Id, RecipeExportContent.WriteCurrent(export), default);
        return export;
    }

    private static SyncRecipeProcessor CurrentReplayProcessor(IServiceProvider services, RecipeRepository repository, ISupperProjectionPublisher publisher) => new(
        services.GetRequiredService<IClock>(), services.GetRequiredService<RecipeDbContext>(), repository,
        services.GetRequiredService<SupperProjectionInvalidation>(), publisher, NullLogger<SyncRecipeProcessor>.Instance, RecipeApi.Tests.Infrastructure.TestPublicationStore.Vocabulary(services.GetRequiredService<RecipeDbContext>(), repository.StorageProvider, services.GetRequiredService<IClock>(), services));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CurrentReplay_IdenticalCanonicalContentUsesCommittedRowAndLeavesEveryFileAndObligationUnchanged()
    {
        await WithStore(async (services, repository, _, _) =>
        {
            var export = await SeedCurrentReplayAsync(services, repository);
            var db = services.GetRequiredService<RecipeDbContext>();
            var tracked = await db.Recipes.SingleAsync(x => x.Id == Id);
            var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id));
            // The no-write replay must read the committed row, not this local draft.
            tracked.CanonicalContent = "{}";
            tracked.Name = "Unsaved local draft";
            var root = Path.Combine(services.GetRequiredService<RecipesRootResolver>().Root, Id.ToString());
            string Files() => JsonSerializer.Serialize(Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Order()
                .ToDictionary(path => path, path => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))));
            var filesBefore = Files();
            var publisher = new Mock<ISupperProjectionPublisher>();
            var processor = CurrentReplayProcessor(services, repository, publisher.Object);
            for (var attempt = 0; attempt < 2; attempt++) Assert.NotNull(await processor.ExecuteAsync(CurrentReplayTask(), default));
            Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(filesBefore, Files());
            Assert.Equal("{}", tracked.CanonicalContent);
            Assert.Equal("Unsaved local draft", tracked.Name);
            Assert.Empty(await db.RecipeFilePublications.AsNoTracking().ToListAsync());
            Assert.Empty(await db.CanonicalRecipeOperations.AsNoTracking().ToListAsync());
            Assert.Empty(await db.SupperServings.AsNoTracking().ToListAsync());
            publisher.VerifyNoOtherCalls();

            foreach (var candidate in new[]
            {
                RecipeExportContent.WriteCurrent(export with { Content = export.Content with { ContentRevision = "different", Servings = 5 } }),
                RecipeExportContent.WriteCurrent(export with { Content = export.Content with { Servings = 5 } }),
                RecipeExportContent.WriteCurrent(export with { RawMetadata = null }),
                "{\"backupContentVersion\":1,\"rawMetadata\":null,\"ingredients\":null}",
                "{\"format\":\"wfs-recipe\",\"version\":2}"
            })
            {
                await repository.SaveRecipeJsonAsync(Id, candidate, default);
                filesBefore = Files();
                await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(CurrentReplayTask(), default));
                Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
                Assert.Equal(filesBefore, Files());
                publisher.VerifyNoOtherCalls();
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CurrentReplay_PendingPublicationRefusesBeforeDiskAccessAndDoesNotResumeIt()
    {
        await WithStore(async (services, repository, _, _) =>
        {
            await SeedCurrentReplayAsync(services, repository);
            var db = services.GetRequiredService<RecipeDbContext>();
            db.RecipeFilePublications.Add(new RecipeFilePublication { RecipeId = Id, OperationId = Guid.NewGuid(),
                InputHash = "pending", ResultHash = "pending", Payload = "{}" });
            await db.SaveChangesAsync();
            var before = JsonSerializer.Serialize(await db.RecipeFilePublications.AsNoTracking().SingleAsync());
            var probe = new CurrentReplayStorage(services.GetRequiredService<IStorageProvider>())
                { BeforeRead = () => throw new InvalidOperationException("Pending replay read files.") };
            var publisher = new Mock<ISupperProjectionPublisher>();
            var error = await Assert.ThrowsAsync<InvalidDataException>(() => CurrentReplayProcessor(services, new(probe), publisher.Object)
                .ExecuteAsync(CurrentReplayTask(), default));
            Assert.Contains("pending", error.Message);
            Assert.Equal(0, probe.Reads);
            Assert.Equal(before, JsonSerializer.Serialize(await db.RecipeFilePublications.AsNoTracking().SingleAsync()));
            publisher.VerifyNoOtherCalls();
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CurrentReplay_HoldsRecipeCoordinationThroughFileReadAndReleasesOnSuccessAndReadFailure()
    {
        await WithStore(async (services, repository, _, _) =>
        {
            await SeedCurrentReplayAsync(services, repository);
            var db = services.GetRequiredService<RecipeDbContext>();
            foreach (var failRead in new[] { false, true })
            {
                var probe = new CurrentReplayStorage(services.GetRequiredService<IStorageProvider>()) { BeforeRead = async () =>
                {
                    await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
                    await connection.OpenAsync();
                    await using (var read = new NpgsqlCommand("SELECT id FROM recipes WHERE id = @id", connection))
                    { read.Parameters.AddWithValue("id", Id); Assert.Equal(Id, await read.ExecuteScalarAsync()); }
                    var failure = await Assert.ThrowsAsync<PostgresException>(async () =>
                    {
                        await using var command = new NpgsqlCommand("SELECT id FROM recipes WHERE id = @id FOR UPDATE NOWAIT", connection);
                        command.Parameters.AddWithValue("id", Id);
                        await command.ExecuteNonQueryAsync();
                    });
                    Assert.Equal(PostgresErrorCodes.LockNotAvailable, failure.SqlState);
                    if (failRead) throw new IOException("Synthetic isolated read failure.");
                } };
                var processor = CurrentReplayProcessor(services, new(probe), Mock.Of<ISupperProjectionPublisher>());
                if (failRead) await Assert.ThrowsAsync<IOException>(() => processor.ExecuteAsync(CurrentReplayTask(), default));
                else Assert.NotNull(await processor.ExecuteAsync(CurrentReplayTask(), default));
                Assert.Equal(1, probe.Reads);
                await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
                await connection.OpenAsync();
                await using var command = new NpgsqlCommand("SELECT id FROM recipes WHERE id = @id FOR UPDATE NOWAIT", connection);
                command.Parameters.AddWithValue("id", Id);
                await command.ExecuteNonQueryAsync();
            }
        });
    }

    private sealed class CurrentReplayStorage(IStorageProvider inner) : IStorageProvider
    {
        public Func<Task>? BeforeRead { get; init; }
        public int Reads { get; private set; }
        public async Task<byte[]?> LoadAsync(string partition, string key)
        {
            Reads++;
            if (BeforeRead is { } inspect) await inspect();
            return await inner.LoadAsync(partition, key);
        }
        public Task SaveAsync(string partition, string key, string value) => throw new InvalidOperationException("Replay wrote files.");
        public Task SaveAsync(string partition, string key, byte[] value) => throw new InvalidOperationException("Replay wrote files.");
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => throw new InvalidOperationException("Replay enumerated files.");
        public List<string> List(string partition) => throw new InvalidOperationException("Replay enumerated files.");
    }
}
