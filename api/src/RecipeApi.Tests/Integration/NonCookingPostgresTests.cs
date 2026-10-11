using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

// Isolated disposable databases only; the supplied connection is used to create/drop them.
public class NonCookingPostgresTests
{
    [NonCookingPostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task InstallAndCompatibility_PersistLabelsLockSwapAndRejectInvalidRows(bool upgrade)
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_noncooking_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            var schema = ReadSql("schema.sql");
            if (upgrade)
                schema = string.Join('\n', schema.Split('\n').Where(line => !line.Contains("non_cooking_")));
            await new NpgsqlCommand(schema, connection).ExecuteNonQueryAsync();
            var monday = new DateOnly(2026, 10, 12);
            await new NpgsqlCommand("INSERT INTO calendar_events (date, status) VALUES ('2026-10-14', 3)", connection).ExecuteNonQueryAsync();
            if (upgrade)
            {
                await new NpgsqlCommand(ReadSql("compatibility.sql"), connection).ExecuteNonQueryAsync();
                await new NpgsqlCommand(ReadSql("compatibility.sql"), connection).ExecuteNonQueryAsync();
            }
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options);
            var publisher = new Mock<IScheduleEventPublisher>().Object;
            var clock = new FixedClock();
            var service = new ScheduleService(db, NullLogger<ScheduleService>.Instance,
                publisher, new GroceryRecomputeService(db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance, publisher, clock), clock);
            await service.ValidateDayAsync("2026-10-13", new ValidationDto(3, NonCooking: new NonCookingPlanDto("custom", "Supper at Grandma’s")));
            await service.OpenVotingAsync(0);
            await service.LockScheduleAsync(0);
            db.ChangeTracker.Clear();
            var plan = await db.CalendarEvents.SingleAsync(e => e.Date == monday.AddDays(1));
            Assert.Equal(CalendarEventStatus.Skipped, plan.Status);
            Assert.Equal("Supper at Grandma’s", plan.NonCookingLabel);
            var recipeId = Guid.NewGuid();
            db.Recipes.Add(new Recipe { Id = recipeId, Name = "Pasta", Ingredients = "[]" });
            db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = monday, RecipeId = recipeId, Status = CalendarEventStatus.Planned });
            await db.SaveChangesAsync();
            await service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 1, FromIndex: 0));
            db.ChangeTracker.Clear();
            Assert.Equal("Supper at Grandma’s", (await db.CalendarEvents.SingleAsync(e => e.Date == monday)).NonCookingLabel);
            Assert.Null((await db.CalendarEvents.SingleAsync(e => e.Date == monday.AddDays(1))).NonCookingKind);
            var schedule = await service.GetScheduleAsync(0);
            Assert.Equal("order_in", schedule.Days[2].NonCooking?.Kind);
            var failure = await Assert.ThrowsAsync<PostgresException>(() => new NpgsqlCommand("INSERT INTO calendar_events (date,status,non_cooking_kind,non_cooking_label) VALUES ('2026-10-15',3,'custom','')", connection).ExecuteNonQueryAsync());
            Assert.Equal("23514", failure.SqlState);

            var barrier = new ConcurrentReadBarrier();
            async Task<bool> ConcurrentSave()
            {
                await using var concurrentDb = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                    .UseNpgsql(settings.ConnectionString).AddInterceptors(barrier).Options);
                var concurrentService = new ScheduleService(concurrentDb, NullLogger<ScheduleService>.Instance, publisher,
                    new GroceryRecomputeService(concurrentDb, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance, publisher, clock), clock);
                try
                {
                    await concurrentService.ValidateDayAsync("2026-10-16", new ValidationDto(3, NonCooking: new NonCookingPlanDto("eating_out")));
                    return true;
                }
                catch (NonCookingPlanConflictException) { return false; }
                catch (PostgresException ex) when (ex.SqlState == "40001") { return false; }
            }
            var saved = await Task.WhenAll(ConcurrentSave(), ConcurrentSave());
            Assert.Single(saved, success => success);
            Assert.Single(saved, success => !success);
            db.ChangeTracker.Clear();
            Assert.Single(await db.CalendarEvents.Where(e => e.Date == new DateOnly(2026, 10, 16)).ToListAsync());
        }
        finally
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        }
    }

    private static string ReadSql(string name)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null)
        {
            var path = Path.Combine(directory.FullName, "api", "database", name);
            if (File.Exists(path)) return File.ReadAllText(path);
            directory = directory.Parent;
        }
        throw new FileNotFoundException(name);
    }
    private sealed class FixedClock : IClock { public DateTimeOffset UtcNow => new(2026, 10, 12, 12, 0, 0, TimeSpan.Zero); }
    private sealed class ConcurrentReadBarrier : DbCommandInterceptor
    {
        private readonly TaskCompletionSource _bothRead = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _arrivals;
        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData,
            DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM calendar_events"))
            {
                if (Interlocked.Increment(ref _arrivals) == 2) _bothRead.TrySetResult();
                await _bothRead.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            }
            return result;
        }
    }
    public sealed class NonCookingPostgresTheoryAttribute : TheoryAttribute
    {
        public NonCookingPostgresTheoryAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION to an isolated PostgreSQL test admin connection.";
        }
    }
}
