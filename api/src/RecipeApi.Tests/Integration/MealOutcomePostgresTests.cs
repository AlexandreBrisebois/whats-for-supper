using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public class MealOutcomePostgresTests : IAsyncLifetime
{
    private readonly string database = $"wfs_meal_outcome_test_{Guid.NewGuid():N}";
    private NpgsqlConnection admin = null!;
    private string connection = null!;
    private RecipeDbContext db = null!;

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        connection = settings.ConnectionString;
        db = new(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection).Options);
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await using var schemaConnection = new NpgsqlConnection(connection);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), schemaConnection).ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (db is not null) await db.DisposeAsync();
        if (admin is null) return;
        if (admin.State == System.Data.ConnectionState.Open)
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        await admin.DisposeAsync();
    }

    [PostgresFact]
    public async Task ReopenedClose_PreservesCookedAndHistoryWhileOldReceiptProtectsNewVotes()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new TestClock(),
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        var cooked = new Recipe { Id = Guid.NewGuid(), Name = "Recorded supper", Ingredients = "[]", LastCookedDate = new(2026, 10, 12, 0, 0, 0, TimeSpan.Zero) };
        var planned = new Recipe { Id = Guid.NewGuid(), Name = "Future supper", Ingredients = "[]" };
        var skipped = new Recipe { Id = Guid.NewGuid(), Name = "Legacy skipped", Ingredients = "[]" };
        var removed = new Recipe { Id = Guid.NewGuid(), Name = "Free the slot", Ingredients = "[]" };
        db.Recipes.AddRange(cooked, planned, skipped, removed);
        db.CalendarEvents.AddRange(new CalendarEvent { Date = new(2026, 10, 12), RecipeId = cooked.Id, Status = CalendarEventStatus.Cooked },
            new CalendarEvent { Date = new(2026, 10, 16), RecipeId = planned.Id },
            new CalendarEvent { Date = new(2026, 10, 15), RecipeId = skipped.Id, Status = CalendarEventStatus.Skipped },
            new CalendarEvent { Date = new(2026, 10, 18), RecipeId = removed.Id },
            new CalendarEvent { Date = new(2026, 10, 17), Status = CalendarEventStatus.Skipped, NonCookingKind = "eating_out" });
        await db.SaveChangesAsync();
        (await client.PostAsync("/api/schedule/voting/open?weekOffset=0", null)).EnsureSuccessStatusCode();
        var first = await Round(client);
        (await client.PostAsync($"/api/schedule/lock?weekOffset=0&votingRoundId={first}", null)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/schedule/day/2026-10-15/validate", new { status = 3, recipeId = skipped.Id })).EnsureSuccessStatusCode();
        (await client.DeleteAsync("/api/schedule/day/2026-10-18/remove")).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/schedule/voting/open?weekOffset=0", null)).EnsureSuccessStatusCode();
        var second = await Round(client);
        db.RecipeVotes.Add(new RecipeVote { RecipeId = cooked.Id, FamilyMemberId = app.DefaultFamilyMemberId, Vote = VoteType.Like });
        await db.SaveChangesAsync();
        (await client.PostAsync($"/api/schedule/lock?weekOffset=0&votingRoundId={first}", null)).EnsureSuccessStatusCode();
        Assert.Equal(second, await Round(client));
        Assert.Single(await db.RecipeVotes.ToListAsync());
        (await client.PostAsync($"/api/schedule/lock?weekOffset=0&votingRoundId={second}", null)).EnsureSuccessStatusCode();
        db.ChangeTracker.Clear();
        Assert.Equal(CalendarEventStatus.Cooked, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == cooked.Id)).Status);
        Assert.Equal(CalendarEventStatus.Skipped, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == skipped.Id)).Status);
        Assert.DoesNotContain(await db.CalendarEvents.ToListAsync(), x => x.RecipeId == removed.Id || x.Date == new DateOnly(2026, 10, 18));
        Assert.Equal(CalendarEventStatus.Locked, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == planned.Id)).Status);
        Assert.Equal(CalendarEventStatus.Skipped, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == null)).Status);
        Assert.True((await db.WeeklyHouseholdInterests.SingleAsync(x => x.RecipeId == cooked.Id)).Selected);
        Assert.Equal(new DateTimeOffset(2026, 10, 12, 0, 0, 0, TimeSpan.Zero), (await db.Recipes.FindAsync(cooked.Id))!.LastCookedDate);
        db.RecipeVotes.Add(new RecipeVote { RecipeId = planned.Id, FamilyMemberId = app.DefaultFamilyMemberId, Vote = VoteType.Like });
        await db.SaveChangesAsync();
        (await client.PostAsync($"/api/schedule/lock?weekOffset=0&votingRoundId={second}", null)).EnsureSuccessStatusCode();
        Assert.Single(await db.RecipeVotes.ToListAsync());
        using var snapshot = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0"));
        Assert.Equal(2, snapshot.RootElement.GetProperty("data").GetProperty("days")[0].GetProperty("status").GetInt32());
    }

    [PostgresTheory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task RemoveCooked_CorrectsHistoryThenReplacementCanBeCompleted(bool earlierExists)
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new TestClock(),
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        var original = new Recipe { Id = Guid.NewGuid(), Name = "Wrong recorded meal", Ingredients = "[]", LastCookedDate = new(2026, 10, 12, 0, 0, 0, TimeSpan.Zero) };
        var replacement = new Recipe { Id = Guid.NewGuid(), Name = "Actual meal", Ingredients = "[]" };
        db.Recipes.AddRange(original, replacement);
        if (earlierExists) db.CalendarEvents.Add(new CalendarEvent { Date = new(2026, 10, 5), RecipeId = original.Id, Status = CalendarEventStatus.Cooked });
        db.CalendarEvents.Add(new CalendarEvent { Date = new(2026, 10, 12), RecipeId = original.Id, Status = CalendarEventStatus.Cooked });
        await db.SaveChangesAsync();

        var deleted = await client.DeleteAsync("/api/schedule/day/2026-10-12/remove");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, deleted.StatusCode);
        db.ChangeTracker.Clear();
        DateTimeOffset? expected = earlierExists ? new(2026, 10, 5, 0, 0, 0, TimeSpan.Zero) : null;
        Assert.Equal(expected, (await db.Recipes.FindAsync(original.Id))!.LastCookedDate);
        Assert.DoesNotContain(await db.CalendarEvents.ToListAsync(), x => x.Date == new DateOnly(2026, 10, 12));
        (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12",
            new { weekOffset = 0, dayIndex = 0, recipeId = replacement.Id })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/schedule/day/2026-10-12/validate", new { status = 2, recipeId = replacement.Id })).EnsureSuccessStatusCode();
        db.ChangeTracker.Clear();
        Assert.Equal(CalendarEventStatus.Cooked, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == replacement.Id)).Status);
        Assert.Equal(new DateTimeOffset(2026, 10, 14, 12, 0, 0, TimeSpan.Zero), (await db.Recipes.FindAsync(replacement.Id))!.LastCookedDate);
        Assert.Equal(expected, (await db.Recipes.FindAsync(original.Id))!.LastCookedDate);
    }

    private static async Task<Guid> Round(HttpClient client)
    {
        using var snapshot = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0"));
        return snapshot.RootElement.GetProperty("data").GetProperty("votingRoundId").GetGuid();
    }

    private sealed class TestClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 10, 14, 12, 0, 0, TimeSpan.Zero);
    }

}
