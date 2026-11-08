using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Backup_PendingDeliveryRefusesBeforeChangingAnyRecipeOrHouseholdFile()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            storage.FailInfo = true;
            var operation = Guid.NewGuid();
            await Assert.ThrowsAsync<IOException>(async () => await store.PublishAsync(await store.CaptureAsync(Id), Candidate(), operation));
            storage.FailInfo = false;
            var db = services.GetRequiredService<RecipeDbContext>();
            var roots = new[] { services.GetRequiredService<DataRootResolver>().Root, services.GetRequiredService<RecipesRootResolver>().Root };
            var before = FileHashes(roots);
            var journal = JsonSerializer.Serialize(await db.RecipeFilePublications.AsNoTracking().SingleAsync());
            await Assert.ThrowsAsync<RecoveryBusyException>(() => services.GetRequiredService<ManagementService>().BackupAsync());
            Assert.Equal(before, FileHashes(roots));
            Assert.Equal(journal, JsonSerializer.Serialize(await db.RecipeFilePublications.AsNoTracking().SingleAsync()));
            // Refusal leaves the original journal resumable; it must not rewrite its baseline.
            await store.ResumeAsync(Id, operation);
            Assert.True((await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Delivered);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Backup_CoordinatesRowLockedDeliveryBeforeFirstFileReadAndReleasesOnFailure()
    {
        await WithStore(async (services, _, _, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var media = new Mock<IRecipeStore>();
            var probed = false;
            media.Setup(x => x.ReadSourcePdfAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).Returns(async () =>
            {
                await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
                await connection.OpenAsync();
                // Ordinary reads remain available while a backup coordinates writers.
                await using (var read = new NpgsqlCommand("SELECT count(*) FROM recipes", connection))
                    Assert.True((long)(await read.ExecuteScalarAsync())! > 0);
                await using var transaction = await connection.BeginTransactionAsync();
                var error = await Assert.ThrowsAsync<PostgresException>(async () =>
                {
                    await using var command = new NpgsqlCommand("LOCK TABLE recipes IN ROW SHARE MODE NOWAIT", connection, transaction);
                    await command.ExecuteNonQueryAsync();
                });
                Assert.Equal(PostgresErrorCodes.LockNotAvailable, error.SqlState);
                probed = true;
                return await Task.FromException<Stream?>(new IOException("Backup probe completed"));
            });
            var service = ActivatorUtilities.CreateInstance<ManagementService>(services, media.Object);
            var error = await Assert.ThrowsAsync<IOException>(() => service.BackupAsync());
            Assert.Equal("Backup probe completed", error.Message);
            Assert.True(probed);
            await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            await using var command = new NpgsqlCommand("LOCK TABLE recipes IN ROW SHARE MODE NOWAIT", connection, transaction);
            await command.ExecuteNonQueryAsync();
        });
    }

    private static string FileHashes(IEnumerable<string> roots) => JsonSerializer.Serialize(roots
        .Where(Directory.Exists).SelectMany(root => Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
        .Distinct().Order(StringComparer.Ordinal).ToDictionary(path => path, path => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))));
}
