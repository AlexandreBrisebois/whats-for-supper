using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public class DeploymentCalendarPostgresTests(ITestOutputHelper output)
{
    private static readonly Guid SelectedId = Guid.Parse("660e8400-e29b-41d4-a716-446655440011");
    private static readonly Guid SentinelId = Guid.Parse("660e8400-e29b-41d4-a716-446655440010");

    [CalendarPostgresFact]
    public async Task HttpAssignment_PersistsDeploymentSundayAndCorrectWeeklyGroceries()
    {
        await WithDatabase(async settings =>
        {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05",
                new { weekOffset = 0, dayIndex = 6, recipeId = SelectedId });
            response.EnsureSuccessStatusCode();
            using var read = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05"));
            AssertWeek(read.RootElement.GetProperty("data"), "2026-10-05", "2026-10-11", SelectedId, "carrot", "potato");
            using var next = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05"));
            Assert.Equal("2026-10-18", next.RootElement.GetProperty("data").GetProperty("days")[6].GetProperty("date").GetString());
            Assert.Equal(SentinelId, next.RootElement.GetProperty("data").GetProperty("days")[6].GetProperty("recipe").GetProperty("id").GetGuid());
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var events = await db.CalendarEvents.AsNoTracking().OrderBy(e => e.Date).ToListAsync();
            Assert.Collection(events,
                e => { Assert.Equal(new DateOnly(2026, 10, 11), e.Date); Assert.Equal(SelectedId, e.RecipeId); },
                e => { Assert.Equal(new DateOnly(2026, 10, 18), e.Date); Assert.Equal(SentinelId, e.RecipeId); });
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == new DateOnly(2026, 10, 5));
            Assert.Contains("carrot", plan.GroceryItems);
            Assert.DoesNotContain("potato", plan.GroceryItems);
        });
    }

    [CalendarPostgresFact]
    public async Task RelativeMoveAndDefer_PersistThePinnedNextMonday()
    {
        foreach (var operation in new[] { "move", "defer" })
        await WithDatabase(async settings =>
        {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05",
                new { weekOffset = 0, dayIndex = 6, recipeId = SelectedId })).EnsureSuccessStatusCode();
            (await client.PostAsJsonAsync($"/api/schedule/{operation}?referenceWeekStartDate=2026-10-05",
                new { weekOffset = 0, fromIndex = 6, toIndex = 0, targetWeekOffset = 1, sourceDate = "2026-10-11", recipeId = SelectedId, intent = "push" })).EnsureSuccessStatusCode();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var selected = await db.CalendarEvents.AsNoTracking().SingleAsync(e => e.RecipeId == SelectedId);
            Assert.Equal(new DateOnly(2026, 10, 12), selected.Date);
            Assert.Equal(SentinelId, (await db.CalendarEvents.AsNoTracking().SingleAsync(e => e.Date == new DateOnly(2026, 10, 18))).RecipeId);
        });
    }

    [CalendarPostgresFact]
    public async Task GroceryPublication_UsesThePinnedAbsoluteMonday()
    {
        await WithDatabase(async settings =>
        {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                db.WeeklyPlans.Add(new WeeklyPlan
                {
                    WeekStartDate = new DateOnly(2026, 10, 5),
                    GroceryState = "{\"Carrot\":true,\"obsolete\":true}",
                    GroceryItems = JsonSerializer.Serialize(new[] { new RecipeApi.Dto.GroceryLineItemDto("Carrot", "carrot", "Produce", null, null, [SelectedId]) }),
                });
                await db.SaveChangesAsync();
            }
            using var client = factory.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("Cookie", $"x-family-member-id={factory.DefaultFamilyMemberId}");
            using var stream = await client.GetAsync("/api/stream", HttpCompletionOption.ResponseHeadersRead);
            stream.EnsureSuccessStatusCode();
            using var reader = new StreamReader(await stream.Content.ReadAsStreamAsync());
            using var connected = await ReadEvent(reader, "connected");
            Assert.Equal("2026-10-05", connected.RootElement.GetProperty("schedule").GetProperty("weekStartDate").GetString());
            (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05",
                new { weekOffset = 0, dayIndex = 6, recipeId = SelectedId })).EnsureSuccessStatusCode();
            using var grocery = await ReadEvent(reader, "grocery_updated");
            Assert.Equal(0, grocery.RootElement.GetProperty("weekOffset").GetInt32());
            Assert.False(grocery.RootElement.GetProperty("groceryState").TryGetProperty("Carrot", out _));
            Assert.True(grocery.RootElement.GetProperty("groceryState").GetProperty("carrot").GetBoolean());
            Assert.True(grocery.RootElement.GetProperty("groceryState").GetProperty("obsolete").GetBoolean());
            output.WriteLine("Received grocery_updated for connected/reference Monday 2026-10-05: " + grocery.RootElement.GetRawText());
        });
    }

    internal static async Task<JsonDocument> ReadEvent(StreamReader reader, string expected)
    {
        var eventName = "";
        string? payload = null;
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (await reader.ReadLineAsync(timeout.Token) is { } line)
        {
            if (line.StartsWith("event: ")) eventName = line[7..];
            else if (line.StartsWith("data: ")) payload = line[6..];
            else if (line.Length == 0)
            {
                if (eventName == expected && payload is not null) return JsonDocument.Parse(payload);
                eventName = ""; payload = null;
            }
        }
        throw new InvalidOperationException("Stream ended before " + expected);
    }

    [CalendarPostgresFact]
    public async Task OverdueCutoff_PreservesSundayUntilDeploymentMidnightAndExistingHistory()
    {
        await WithDatabase(async settings =>
        {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T03:59:59Z") };
            await using var factory = await CreateFactory(settings, clock: clock);
            await Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.CalendarEvents.AddRange(
                new CalendarEvent { Date = new DateOnly(2026, 10, 9), RecipeId = SelectedId, Status = CalendarEventStatus.Planned },
                new CalendarEvent { Date = new DateOnly(2026, 10, 10), RecipeId = SelectedId, Status = CalendarEventStatus.Locked },
                new CalendarEvent { Date = new DateOnly(2026, 10, 11), RecipeId = SelectedId, Status = CalendarEventStatus.Planned },
                new CalendarEvent { Date = new DateOnly(2026, 10, 8), RecipeId = SelectedId, Status = CalendarEventStatus.Skipped },
                new CalendarEvent { Date = new DateOnly(2026, 10, 7), RecipeId = SelectedId, Status = CalendarEventStatus.AwaitingConsensus },
                new CalendarEvent { Date = new DateOnly(2026, 10, 6), Status = CalendarEventStatus.Planned },
                new CalendarEvent { Date = new DateOnly(2026, 10, 12), RecipeId = SelectedId, Status = CalendarEventStatus.Cooked });
            await db.SaveChangesAsync();
            var service = scope.ServiceProvider.GetRequiredService<ScheduleService>();
            await service.FinalizeOverdueMealsAsync();
            db.ChangeTracker.Clear();
            Assert.Equal(CalendarEventStatus.Planned, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 11))).Status);
            Assert.Equal(DateTimeOffset.Parse("2026-10-12T00:00:00Z"), (await db.Recipes.FindAsync(SelectedId))!.LastCookedDate);
            clock.UtcNow = DateTimeOffset.Parse("2026-10-12T04:00:00Z");
            await service.FinalizeOverdueMealsAsync();
            db.ChangeTracker.Clear();
            Assert.Equal(CalendarEventStatus.Cooked, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 11))).Status);
            Assert.Equal(CalendarEventStatus.Skipped, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 8))).Status);
            Assert.Equal(CalendarEventStatus.AwaitingConsensus, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 7))).Status);
            Assert.Equal(CalendarEventStatus.Planned, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 6))).Status);
            Assert.Equal(DateTimeOffset.Parse("2026-10-12T00:00:00Z"), (await db.Recipes.FindAsync(SelectedId))!.LastCookedDate);
        });
    }

    [CalendarPostgresFact]
    public async Task Completion_PreservesViewedIdentityAndExactUtcInstant()
    {
        await WithDatabase(async settings =>
        {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05", new { weekOffset = 0, dayIndex = 6, recipeId = SelectedId })).EnsureSuccessStatusCode();
            using var other = JsonDocument.Parse(await (await client.PostAsJsonAsync("/api/schedule/day/2026-10-11/validate", new { status = 2, recipeId = SentinelId })).Content.ReadAsStringAsync());
            Assert.False(other.RootElement.GetProperty("data").GetProperty("mealMarkedCooked").GetBoolean());
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal(CalendarEventStatus.Planned, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 11))).Status);
            Assert.Equal(DateTimeOffset.Parse("2026-10-12T01:30:00Z"), (await db.Recipes.FindAsync(SentinelId))!.LastCookedDate);
            using var matching = JsonDocument.Parse(await (await client.PostAsJsonAsync("/api/schedule/day/2026-10-11/validate", new { status = 2, recipeId = SelectedId })).Content.ReadAsStringAsync());
            Assert.True(matching.RootElement.GetProperty("data").GetProperty("mealMarkedCooked").GetBoolean());
            db.ChangeTracker.Clear();
            Assert.Equal(CalendarEventStatus.Cooked, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 11))).Status);
            Assert.Equal(DateTimeOffset.Parse("2026-10-12T01:30:00Z"), (await db.Recipes.FindAsync(SelectedId))!.LastCookedDate);
            Assert.Equal(SentinelId, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 18))).RecipeId);
        });
    }

    [CalendarLiveFact]
    public async Task LiveBrowser_UsesRealApiPostgresAndGeneratedClient()
    {
        await WithDatabase(async settings =>
        {
            var pwaUrl = $"http://127.0.0.1:{FreePort()}";
            await using var factory = await CreateFactory(settings, pwaUrl);
            await Seed(factory);
            var root = RepositoryRoot();
            var pwa = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(root, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true };
            foreach (var arg in new[] { "node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", new Uri(pwaUrl).Port.ToString() }) pwa.ArgumentList.Add(arg);
            ConfigureEnvironment(pwa, factory.HttpAddress, pwaUrl);
            using var server = Process.Start(pwa)!;
            server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.BeginOutputReadLine(); server.BeginErrorReadLine();
            try
            {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 60; attempt++)
                {
                    try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; }
                    catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(500);
                }
                Assert.True(ready, "Task-owned PWA failed to start.");
                output.WriteLine($"API {factory.HttpAddress}; PWA {pwaUrl}; DB {settings.Database}; clock 2026-10-12T01:30Z; zone America/Toronto");
                var acceptance = new ProcessStartInfo("task") { WorkingDirectory = root, RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in new[] { "test:e2e", "--", "deployment-calendar-live.spec.ts" }) acceptance.ArgumentList.Add(arg);
                ConfigureEnvironment(acceptance, factory.HttpAddress, pwaUrl);
                using var browser = Process.Start(acceptance)!;
                var stdout = browser.StandardOutput.ReadToEndAsync();
                var stderr = browser.StandardError.ReadToEndAsync();
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(3));
                    output.WriteLine(await stdout); output.WriteLine(await stderr);
                    Assert.Equal(0, browser.ExitCode);
                    using var databaseScope = factory.Services.CreateScope();
                    var persisted = databaseScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    Assert.Equal(DateTimeOffset.Parse("2026-10-12T01:30:00Z"), (await persisted.Recipes.FindAsync(SelectedId))!.LastCookedDate);
                    Assert.Equal(DateTimeOffset.Parse("2026-10-12T01:30:00Z"), (await persisted.Recipes.FindAsync(SentinelId))!.LastCookedDate);
                }
                finally
                {
                    if (!browser.HasExited) browser.Kill(entireProcessTree: true);
                    await browser.WaitForExitAsync();
                }
            }
            finally
            {
                if (!server.HasExited) server.Kill(entireProcessTree: true);
                await server.WaitForExitAsync();
            }
        });
    }

    private static void ConfigureEnvironment(ProcessStartInfo process, string apiUrl, string pwaUrl)
    {
        process.Environment["BASE_URL"] = apiUrl;
        process.Environment["CALENDAR_API_URL"] = apiUrl;
        process.Environment["API_INTERNAL_URL"] = apiUrl;
        process.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
        process.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
        process.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
        process.Environment["TZ"] = "UTC";
    }

    private static Task<TestWebApplicationFactory> CreateFactory(NpgsqlConnectionStringBuilder settings, string? browserOrigin = null, DeploymentCalendarIntegrationTests.CalendarClock? clock = null)
    {
        var calendarClock = clock ?? new DeploymentCalendarIntegrationTests.CalendarClock();
        var calendarAvailable = 1;
        TaskCompletionSource? completionRelease = null;
        var completionHeld = 0;
        ScheduleDays? delayedSnapshot = null;
        return TestWebApplicationFactory.CreateWithAuthAsync(calendarClock, new()
        {
            ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
            ["Tests:HttpUrl"] = browserOrigin is null ? null : "http://127.0.0.1:0",
        }, browserOrigin is null ? null : app =>
        {
            app.Use(async (context, next) =>
            {
                if (context.Request.Method == "GET" && context.Request.Path == "/api/schedule" && Volatile.Read(ref calendarAvailable) == 0)
                {
                    context.Response.StatusCode = 503;
                    await context.Response.WriteAsJsonAsync(new { message = "Calendar temporarily unavailable" });
                    return;
                }
                var gate = completionRelease;
                if (gate is not null && context.Request.Method == "POST" && context.Request.Path.Value!.EndsWith("/validate", StringComparison.Ordinal))
                {
                    var original = context.Response.Body;
                    await using var buffer = new MemoryStream();
                    context.Response.Body = buffer;
                    try
                    {
                        await next(context);
                        Interlocked.Exchange(ref completionHeld, 1);
                        await gate.Task.WaitAsync(context.RequestAborted);
                        buffer.Position = 0;
                        await buffer.CopyToAsync(original, context.RequestAborted);
                    }
                    finally { context.Response.Body = original; }
                    return;
                }
                await next(context);
            });
            app.MapPost("/_test/calendar/availability", (JsonElement body) =>
            {
                Interlocked.Exchange(ref calendarAvailable, body.GetProperty("available").GetBoolean() ? 1 : 0);
                return Results.Ok();
            }).RequireAuthorization();
            app.MapPost("/_test/calendar/instant", (JsonElement body) =>
            {
                calendarClock.UtcNow = body.GetProperty("instant").GetDateTimeOffset();
                return Results.Ok();
            }).RequireAuthorization();
            app.MapPost("/_test/calendar/completion-gate", (JsonElement body) =>
            {
                if (body.GetProperty("hold").GetBoolean())
                {
                    Interlocked.Exchange(ref completionHeld, 0);
                    completionRelease = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
                }
                else { completionRelease?.TrySetResult(); completionRelease = null; }
                return Results.Ok();
            }).RequireAuthorization();
            app.MapGet("/_test/calendar/completion-gate", () => Results.Ok(new { held = Volatile.Read(ref completionHeld) == 1 })).RequireAuthorization();
            app.MapPost("/_test/calendar/snapshot", async (JsonElement body, ScheduleService schedule, IScheduleEventPublisher publisher) =>
            {
                if (body.GetProperty("capture").GetBoolean()) delayedSnapshot = await schedule.GetScheduleAsync(0);
                else if (delayedSnapshot is not null) await publisher.PublishWeekUpdatedAsync(delayedSnapshot);
                return Results.Ok();
            }).RequireAuthorization();
            app.MapFallback("{**path}", async context =>
            {
            // Same-origin test gateway mirrors deployment routing without modifying the PWA client.
            try
            {
            using var client = new HttpClient();
            using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method),
                browserOrigin + context.Request.Path + context.Request.QueryString);
            if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
            foreach (var header in context.Request.Headers)
                if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
                    request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
            context.Response.StatusCode = (int)response.StatusCode;
            foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
            context.Response.Headers.Remove("transfer-encoding");
            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
            }
            catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
            });
        });
    }

    private static async Task Seed(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.AddRange(
            new Recipe { Id = SelectedId, Name = "Sunday Chicken", Ingredients = "[\"Carrot\"]", IsReady = true, IsDiscoverable = true },
            new Recipe { Id = SentinelId, Name = "Next Sunday Lasagna", Ingredients = "[\"Potato\"]", IsReady = true, IsDiscoverable = true });
        foreach (var entry in db.ChangeTracker.Entries<Recipe>().ToArray())
        {
            var content = new RecipeSearchDocumentBuilder().Build(entry.Entity);
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument
            {
                RecipeId = entry.Entity.Id, DocumentText = content.DocumentText,
                SearchMetadata = content.SearchMetadata, SchemaVersion = content.SchemaVersion,
                IndexStatus = "ready", EmbeddingStatus = "pending", SourceFingerprint = "calendar-fixture",
            });
        }
        db.RecipeVotes.Add(new RecipeVote { RecipeId = SelectedId, FamilyMemberId = factory.DefaultFamilyMemberId, Vote = VoteType.Like });
        db.CalendarEvents.Add(new CalendarEvent { Date = new DateOnly(2026, 10, 18), RecipeId = SentinelId });
        await db.SaveChangesAsync();
    }

    private static void AssertWeek(JsonElement data, string monday, string sunday, Guid id, string present, string absent)
    {
        Assert.Equal(monday, data.GetProperty("weekStartDate").GetString());
        Assert.Equal(sunday, data.GetProperty("days")[6].GetProperty("date").GetString());
        Assert.Equal(id, data.GetProperty("days")[6].GetProperty("recipe").GetProperty("id").GetGuid());
        Assert.Contains(present, data.GetProperty("groceryItems").GetRawText());
        Assert.DoesNotContain(absent, data.GetProperty("groceryItems").GetRawText());
    }

    private async Task WithDatabase(Func<NpgsqlConnectionStringBuilder, Task> check)
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_calendar_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using (var connection = new NpgsqlConnection(settings.ConnectionString))
            {
                await connection.OpenAsync();
                await new NpgsqlCommand(File.ReadAllText(Path.Combine(RepositoryRoot(), "api/database/schema.sql")), connection).ExecuteNonQueryAsync();
            }
            output.WriteLine($"Disposable PostgreSQL database {database}, host {settings.Host}, port {settings.Port}");
            await check(settings);
        }
        finally { await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }

    private static string RepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Taskfile.yml"))) directory = directory.Parent;
        return directory?.FullName ?? throw new DirectoryNotFoundException("Repository root");
    }

    private static int FreePort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }

    public class CalendarPostgresFactAttribute : FactAttribute
    {
        public CalendarPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Requires an isolated PostgreSQL admin connection.";
        }
    }
    public sealed class CalendarLiveFactAttribute : CalendarPostgresFactAttribute
    {
        public CalendarLiveFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("WFS_CALENDAR_LIVE") != "1") Skip = "Set WFS_CALENDAR_LIVE=1 to launch isolated real API/PWA browser acceptance.";
        }
    }
}
