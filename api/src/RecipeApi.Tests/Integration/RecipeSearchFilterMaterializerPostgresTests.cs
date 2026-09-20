using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>Opt-in isolated PostgreSQL coverage for SFD-3 materialization and DDL transitions.</summary>
public class RecipeSearchFilterMaterializerPostgresTests : IAsyncLifetime
{
    private const string ConnectionVariable = "WFS_TEST_POSTGRES_CONNECTION";
    private readonly string _databaseName = $"wfs_filter_materializer_{Guid.NewGuid():N}";
    private NpgsqlConnection _admin = null!;
    private NpgsqlConnectionStringBuilder _connection = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable(ConnectionVariable)) { Pooling = false };
        _admin = new NpgsqlConnection(_connection.ConnectionString);
        await _admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {_databaseName}", _admin).ExecuteNonQueryAsync();
        _connection.Database = _databaseName;
        _db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(_connection.ConnectionString).Options);
        await using var schemaConnection = new NpgsqlConnection(_connection.ConnectionString);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(ReadDatabaseFile("schema.sql"), schemaConnection).ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (_db is not null) await _db.DisposeAsync();
        if (_admin is not null)
        {
            if (_admin.State == System.Data.ConnectionState.Open)
                await new NpgsqlCommand($"DROP DATABASE IF EXISTS {_databaseName} WITH (FORCE)", _admin).ExecuteNonQueryAsync();
            await _admin.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task CleanInstallAndUpgrade_MaterializeOneAtomicStateAndBoundedRecipeFacts()
    {
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Italian dinner", CuisineType = "Italian", IsReady = true };
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Materializer test member" };
        _db.Recipes.Add(recipe);
        _db.FamilyMembers.Add(member);
        _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member.Id, Vote = VoteType.Like });
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe.Id, Date = new DateOnly(2026, 8, 1), Status = CalendarEventStatus.Cooked });
        await _db.SaveChangesAsync();
        var clock = new FixedClock(new DateTimeOffset(2026, 9, 19, 0, 0, 0, TimeSpan.Zero));

        var snapshot = await new RecipeSearchFilterMaterializer(_db, clock).MaterializeAsync(CancellationToken.None);
        await _db.Database.ExecuteSqlRawAsync(ReadDatabaseFile("compatibility.sql"));
        await _db.Database.ExecuteSqlRawAsync(ReadDatabaseFile("compatibility.sql"));

        Assert.Equal(["Italian"], snapshot.AllCuisines);
        Assert.Single(await _db.RecipeSearchFilterStates.ToListAsync());
        var fact = await _db.RecipeSearchAffinityFacts.SingleAsync();
        Assert.Equal(recipe.Id, fact.RecipeId);
        Assert.Equal(new DateOnly(2026, 8, 1), fact.LastCookedOn);
    }

    private static string ReadDatabaseFile(string filename)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
        return File.ReadAllText(Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found."), "api", "database", filename));
    }

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = $"Set {ConnectionVariable} to run isolated PostgreSQL filter materialization verification.";
        }
    }
}
