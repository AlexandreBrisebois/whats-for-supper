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

namespace RecipeApi.Tests.Integration;

public partial class PlanLaterPostgresTests(Xunit.Abstractions.ITestOutputHelper output) : IAsyncLifetime
{
    private readonly string database = $"wfs_planlater_test_{Guid.NewGuid():N}";
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
    public async Task PlanLater_PersistsBothGroceryWeeksAndPublishesToTwoSubscribers()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new TestClock(),
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        var source = new Recipe { Id = Guid.NewGuid(), Name = "Carrot supper", Ingredients = "[\"carrots\"]", IsReady = true };
        var target = new Recipe { Id = Guid.NewGuid(), Name = "Onion supper", Ingredients = "[\"onions\"]", IsReady = true };
        db.Recipes.AddRange(source, target);
        db.CalendarEvents.AddRange(new CalendarEvent { Date = new(2026, 10, 12), RecipeId = source.Id },
            new CalendarEvent { Date = new(2026, 10, 19), RecipeId = target.Id });
        await db.SaveChangesAsync();
        var manager = app.Services.GetRequiredService<SseConnectionManager>();
        using var first = new MemoryStream();
        using var second = new MemoryStream();
        var firstContext = new DefaultHttpContext(); firstContext.Response.Body = first;
        var secondContext = new DefaultHttpContext(); secondContext.Response.Body = second;
        var firstId = manager.AddConnection(firstContext.Response);
        var secondId = manager.AddConnection(secondContext.Response);
        try
        {
            var response = await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",
                new { weekOffset = 0, fromIndex = 0, toIndex = 0, targetWeekOffset = 1, intent = "push", recipeId = source.Id });
            response.EnsureSuccessStatusCode();
            using var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.True(result.RootElement.GetProperty("data").GetProperty("moved").GetBoolean());
            Assert.True(result.RootElement.GetProperty("data").GetProperty("refreshComplete").GetBoolean());
            foreach (var stream in new[] { first, second })
            {
                var frames = Encoding.UTF8.GetString(stream.ToArray()).Split("\n\n")
                    .Where(x => x.StartsWith("event: week_updated\n"))
                    .Select(x => JsonDocument.Parse(x[(x.IndexOf("data: ", StringComparison.Ordinal) + 6)..])).ToArray();
                try
                {
                    Assert.Equal(2, frames.Length);
                    var schedules = frames.Select(x => x.RootElement.GetProperty("schedule")).ToArray();
                    Assert.Equal(new[] { "2026-10-12", "2026-10-19" }, schedules.Select(x => x.GetProperty("weekStartDate").GetString()));
                    Assert.Empty(schedules[0].GetProperty("groceryItems").EnumerateArray());
                    Assert.Equal(new[] { "carrots", "onions" }, schedules[1].GetProperty("groceryItems").EnumerateArray().Select(x => x.GetProperty("displayName").GetString()).Order());
                    Assert.Contains(schedules[1].GetProperty("days").EnumerateArray(), x =>
                        x.GetProperty("date").GetString() == "2026-10-20" && x.GetProperty("recipe").GetProperty("id").GetGuid() == source.Id);
                }
                finally { foreach (var frame in frames) frame.Dispose(); }
            }
            using var sourceRead = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12"));
            using var targetRead = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-12"));
            Assert.Empty(sourceRead.RootElement.GetProperty("data").GetProperty("groceryItems").EnumerateArray());
            Assert.Equal(2, targetRead.RootElement.GetProperty("data").GetProperty("groceryItems").GetArrayLength());
            db.ChangeTracker.Clear();
            Assert.Equal(new DateOnly(2026, 10, 20), (await db.CalendarEvents.SingleAsync(x => x.RecipeId == source.Id)).Date);
        }
        finally { manager.RemoveConnection(firstId); manager.RemoveConnection(secondId); }
    }

    private sealed class TestClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 10, 12, 12, 0, 0, TimeSpan.Zero);
    }
}
