using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests(Xunit.Abstractions.ITestOutputHelper output) : IAsyncLifetime
{
    private readonly string database = $"wfs_grocery_checks_{Guid.NewGuid():N}";
    private NpgsqlConnection admin = null!;
    private string connection = null!;
    private static readonly DateOnly Monday = new(2026, 10, 19);

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        connection = settings.ConnectionString;
        await using var sql = new NpgsqlConnection(connection);
        await sql.OpenAsync();
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), sql).ExecuteNonQueryAsync();
        await using var db = Context();
        db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = Monday, GroceryState = "{\"Tomato\":false,\"Lettuce\":false}" });
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        if (admin is null) return;
        await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        await admin.DisposeAsync();
    }

    private RecipeDbContext Context(IInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection);
        if (interceptor is not null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }

    private static ScheduleService Service(RecipeDbContext db, GroceryCheckCoordinator coordinator, IScheduleEventPublisher publisher)
    {
        var clock = new FixedClock();
        var calendar = new DeploymentCalendar(new ConfigurationManager());
        var recompute = new GroceryRecomputeService(db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance, clock, calendar, coordinator, publisher);
        return new(db, NullLogger<ScheduleService>.Instance, publisher, recompute, clock, calendar,
            TestHistoricalInterest.Create(db, clock, calendar), coordinator);
    }

    private async Task<Dictionary<string, bool>> ReadAsync()
    {
        await using var fresh = Context();
        return JsonSerializer.Deserialize<Dictionary<string, bool>>((await fresh.WeeklyPlans.SingleAsync()).GroceryState)!;
    }

    [PostgresFact]
    public async Task IntendedValuesReplacementAndClearRetainTheirProcessingSemantics()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new FixedClock(),
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        async Task Item(string name, bool value) => Assert.Equal(HttpStatusCode.NoContent,
            (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = name, @checked = value })).StatusCode);
        async Task Replace(Dictionary<string, bool> map)
        {
            var response = await client.PatchAsJsonAsync("/api/schedule/0/grocery", map);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(map, JsonSerializer.Deserialize<Dictionary<string, bool>>(json.GetProperty("data")));
            Assert.Equal(map, await ReadAsync());
        }
        await Item("Tomato", true);
        await Item("Tomato", true);
        Assert.True((await ReadAsync())["Tomato"]);
        await Item("Tomato", false);
        Assert.False((await ReadAsync())["Tomato"]);
        Assert.False((await ReadAsync())["Lettuce"]);
        await Item("Lettuce", true);
        await Replace(new() { ["Tomato"] = false }); // stale replacement intentionally removes Lettuce
        await Item("Lettuce", true);
        Assert.Equal(new() { ["Tomato"] = false, ["Lettuce"] = true }, await ReadAsync());
        await Replace([]);
        await Item("Lettuce", true);
        Assert.Equal(new() { ["Lettuce"] = true }, await ReadAsync());
        await Replace([]); // clear after an item removes it
    }

    [PostgresFact]
    public async Task OverlappingSameKeyRequestsFollowProcessingOrderAndRepeatedTrueIsIdempotent()
    {
        foreach (var laterValue in new[] { false, true })
        {
            await using var db = Context();
            var coordinator = TestGroceryChecks.Create(db);
            var entered = Signal();
            var release = Signal();
            var attempts = 0;
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(0, It.IsAny<Dictionary<string, bool>>(), Monday, null))
                .Returns(async () => { if (++attempts == 1) { entered.SetResult(); await release.Task; } });
            var service = Service(db, coordinator, publisher.Object);
            var first = service.ToggleGroceryItemAsync(0, "Tomato", true);
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            var second = service.ToggleGroceryItemAsync(0, "Tomato", laterValue);
            Assert.False(second.IsCompleted);
            Assert.True((await ReadAsync())["Tomato"]);
            release.SetResult();
            await Task.WhenAll(first, second).WaitAsync(TimeSpan.FromSeconds(10));
            Assert.Equal(laterValue, (await ReadAsync())["Tomato"]);
            Assert.False((await ReadAsync())["Lettuce"]);
        }
    }

    [PostgresFact]
    public async Task OverlappingClearAndItemShareOneGateInEitherProcessingOrder()
    {
        foreach (var clearFirst in new[] { true, false })
        {
            await using var db = Context();
            var coordinator = TestGroceryChecks.Create(db);
            var entered = Signal();
            var release = Signal();
            var attempts = 0;
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(0, It.IsAny<Dictionary<string, bool>>(), Monday, null))
                .Returns(async () => { if (++attempts == 1) { entered.SetResult(); await release.Task; } });
            var service = Service(db, coordinator, publisher.Object);
            Task Clear() => service.UpdateGroceryStateAsync(0, []);
            Task Item() => service.ToggleGroceryItemAsync(0, "Lettuce", true);
            var first = clearFirst ? Clear() : Item();
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            var second = clearFirst ? Item() : Clear();
            Assert.False(second.IsCompleted);
            release.SetResult();
            await Task.WhenAll(first, second).WaitAsync(TimeSpan.FromSeconds(10));
            Assert.Equal(clearFirst ? new Dictionary<string, bool> { ["Lettuce"] = true } : [], await ReadAsync());
        }
    }

    [PostgresFact]
    public async Task PublicationOwnsTheGateUntilCompletionAndWaitingCancellationDoesNotReleaseIt()
    {
        await using var db = Context();
        var coordinator = TestGroceryChecks.Create(db);
        var publishing = Signal();
        var release = Signal();
        var attempts = new List<Dictionary<string, bool>>();
        var publisher = new Mock<IScheduleEventPublisher>();
        publisher.Setup(p => p.PublishGroceryUpdatedAsync(0, It.IsAny<Dictionary<string, bool>>(), Monday, null))
            .Returns(async (int _, Dictionary<string, bool> map, DateOnly _, string? _) =>
            {
                attempts.Add(new(map));
                if (attempts.Count == 1)
                {
                    Assert.True((await ReadAsync())["Tomato"]); // save precedes publication
                    publishing.SetResult();
                    await release.Task;
                }
            });
        var service = Service(db, coordinator, publisher.Object);
        var first = service.ToggleGroceryItemAsync(0, "Tomato", true);
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(10));
        using var cancellation = new CancellationTokenSource();
        var canceled = service.ToggleGroceryItemAsync(0, "Canceled", true, ct: cancellation.Token);
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => canceled);
        var second = service.ToggleGroceryItemAsync(0, "Lettuce", true);
        Assert.False(second.IsCompleted);
        Assert.Single(attempts);
        Assert.False((await ReadAsync())["Lettuce"]);
        release.SetResult();
        await Task.WhenAll(first, second).WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(2, attempts.Count);
        Assert.True(attempts[1]["Tomato"]);
        Assert.True(attempts[1]["Lettuce"]);
        Assert.DoesNotContain("Canceled", (await ReadAsync()).Keys);
    }

    [PostgresFact]
    public async Task SaveFailureCancellationAndNotificationFailureReleaseTheGateAndRecoverOnlyCommittedWork()
    {
        var failure = new SaveFault();
        await using var db = Context(failure);
        var coordinator = TestGroceryChecks.Create(db);
        var publisher = new Mock<IScheduleEventPublisher>();
        var service = Service(db, coordinator, publisher.Object);
        failure.Next = _ => throw new InvalidOperationException("controlled pre-commit save failure");
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ToggleGroceryItemAsync(0, "Tomato", true));
        Assert.False((await ReadAsync())["Tomato"]);
        publisher.Verify(p => p.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()), Times.Never);
        using var canceled = new CancellationTokenSource();
        failure.Next = ct => { canceled.Cancel(); ct.ThrowIfCancellationRequested(); };
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => service.ToggleGroceryItemAsync(0, "Tomato", true, ct: canceled.Token));
        Assert.False((await ReadAsync())["Tomato"]);
        publisher.Setup(p => p.PublishGroceryUpdatedAsync(0, It.IsAny<Dictionary<string, bool>>(), Monday, null))
            .ThrowsAsync(new IOException("controlled response/notification loss after commit"));
        await Assert.ThrowsAsync<IOException>(() => service.ToggleGroceryItemAsync(0, "Tomato", true));
        Assert.True((await ReadAsync())["Tomato"]);
        publisher.Reset();
        await service.ToggleGroceryItemAsync(0, "Lettuce", true).WaitAsync(TimeSpan.FromSeconds(10));
        await using (var pending = Context())
        {
            await using var transaction = await pending.Database.BeginTransactionAsync();
            (await pending.WeeklyPlans.SingleAsync()).GroceryState = "{\"Uncommitted\":true}";
            await pending.SaveChangesAsync();
            await transaction.RollbackAsync();
        }
        // New coordinator and context model restart: no in-memory queue can replay pending work.
        await using var restarted = Context();
        await Service(restarted, TestGroceryChecks.Create(restarted), publisher.Object).ToggleGroceryItemAsync(0, "After restart", true);
        var recovered = await ReadAsync();
        Assert.True(recovered["Tomato"]);
        Assert.True(recovered["Lettuce"]);
        Assert.True(recovered["After restart"]);
        Assert.DoesNotContain("Uncommitted", recovered.Keys);
    }

    private sealed class SaveFault : SaveChangesInterceptor
    {
        public Action<CancellationToken>? Next { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            var fault = Next;
            Next = null;
            fault?.Invoke(cancellationToken);
            return ValueTask.FromResult(result);
        }
    }

    [PostgresFact]
    public async Task RecomputeUsesCurrentPredecessorsDespiteStaleTrackingAndOrdersItsPublication()
    {
        await using var db = Context();
        var recipe = new Recipe { Name = "Olive dish", RawMetadata = "{\"supply\":[{\"name\":\"huile d'olive\",\"quantity\":1,\"unitText\":\"ml\"},{\"name\":\"huile d’olive\",\"quantity\":1,\"unitText\":\"ml\"}]}" };
        db.Recipes.Add(recipe);
        db.CalendarEvents.Add(new CalendarEvent { Date = Monday, Recipe = recipe });
        var stale = await db.WeeklyPlans.SingleAsync();
        stale.GroceryItems = JsonSerializer.Serialize(new[]
        {
            new RecipeApi.Dto.GroceryLineItemDto("huile d'olive", "huile d'olive", "Pantry", 1, "ml", []),
            new RecipeApi.Dto.GroceryLineItemDto("huile d’olive", "huile d’olive", "Pantry", 1, "ml", [])
        });
        stale.GroceryState = "{\"huile d'olive\":false,\"huile d’olive\":false,\"unrelated\":true}";
        db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = Monday.AddDays(7), GroceryState = "{\"Other week\":true}" });
        await db.SaveChangesAsync();
        var coordinator = TestGroceryChecks.Create(db);
        var publishing = Signal();
        var release = Signal();
        var attempts = new List<Dictionary<string, bool>>();
        var publisher = new Mock<IScheduleEventPublisher>();
        publisher.Setup(p => p.PublishGroceryUpdatedAsync(0, It.IsAny<Dictionary<string, bool>>(), Monday, null))
            .Returns(async (int _, Dictionary<string, bool> map, DateOnly _, string? _) =>
            {
                attempts.Add(new(map));
                if (attempts.Count == 1) { publishing.SetResult(); await release.Task; throw new IOException("first publication fails"); }
            });
        var first = Service(db, coordinator, publisher.Object).ToggleGroceryItemAsync(0, "huile d'olive", true);
        await publishing.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var recompute = new GroceryRecomputeService(db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance,
            new FixedClock(), new DeploymentCalendar(new ConfigurationManager()), coordinator, publisher.Object);
        var second = recompute.RecomputeForWeekAsync(Monday, CancellationToken.None);
        Assert.False(second.IsCompleted);
        release.SetResult();
        await Assert.ThrowsAsync<IOException>(() => first);
        await second.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(2, attempts.Count);
        Assert.False(attempts[1]["huile d'olive"]); // all predecessors must be checked
        Assert.DoesNotContain("huile d’olive", attempts[1].Keys);
        Assert.True(attempts[1]["unrelated"]);
        Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>(stale.GroceryState)!["huile d'olive"]);
        // Saving an unrelated pending property on the original tracked plan must not restore old grocery fields.
        stale.Status = WeeklyPlanStatus.Locked;
        await db.SaveChangesAsync();
        await using var fresh = Context();
        var saved = await fresh.WeeklyPlans.SingleAsync(p => p.WeekStartDate == Monday);
        Assert.Equal(attempts[1], JsonSerializer.Deserialize<Dictionary<string, bool>>(saved.GroceryState));
        Assert.Single(JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(saved.GroceryItems)!);
        Assert.Equal("{\"Other week\": true}", (await fresh.WeeklyPlans.SingleAsync(p => p.WeekStartDate == Monday.AddDays(7))).GroceryState);
    }

    [PostgresFact]
    public async Task UnchangedNamesAndSupportedRenamePreserveACheckCommittedAfterTheCallerRead()
    {
        foreach (var (oldName, newName) in new[] { ("tomato", "tomato"), ("Zucchini(s)", "zucchini") })
        {
            await using var db = Context();
            var stale = await db.WeeklyPlans.SingleAsync();
            stale.GroceryItems = JsonSerializer.Serialize(new[] { new RecipeApi.Dto.GroceryLineItemDto(oldName, oldName.ToLowerInvariant(), "Produce", 1, null, []) });
            stale.GroceryState = JsonSerializer.Serialize(new Dictionary<string, bool> { [oldName] = false, ["unrelated"] = true });
            db.CalendarEvents.RemoveRange(await db.CalendarEvents.ToListAsync());
            var recipe = new Recipe { Name = "Vegetables", RawMetadata = JsonSerializer.Serialize(new { supply = new[] { new { name = oldName } } }) };
            db.CalendarEvents.Add(new CalendarEvent { Date = Monday, Recipe = recipe });
            await db.SaveChangesAsync();
            var coordinator = TestGroceryChecks.Create(db);
            var publishing = Signal();
            var release = Signal();
            var attempts = 0;
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(0, It.IsAny<Dictionary<string, bool>>(), Monday, null))
                .Returns(async () => { if (++attempts == 1) { publishing.SetResult(); await release.Task; } });
            var check = Service(db, coordinator, publisher.Object).ToggleGroceryItemAsync(0, oldName, true);
            await publishing.Task.WaitAsync(TimeSpan.FromSeconds(10));
            var recompute = new GroceryRecomputeService(db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance,
                new FixedClock(), new DeploymentCalendar(new ConfigurationManager()), coordinator, publisher.Object);
            var recomputing = recompute.RecomputeForWeekAsync(Monday, CancellationToken.None);
            Assert.False(recomputing.IsCompleted);
            release.SetResult();
            await Task.WhenAll(check, recomputing).WaitAsync(TimeSpan.FromSeconds(10));
            Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>(stale.GroceryState)![oldName]);
            var saved = await ReadAsync();
            Assert.True(saved[newName]);
            Assert.True(saved["unrelated"]);
            if (oldName != newName) Assert.DoesNotContain(oldName, saved.Keys);
            Assert.Equal(oldName == newName ? 1 : 2, attempts);
        }
    }

    [PostgresFact]
    public async Task OverlappingItemRequestsWithEarlierTrackedReadsRetainBothChecks()
    {
        var firstRead = Signal();
        var secondRead = Signal();
        var releaseFirst = Signal();
        var releaseSecond = Signal();
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new FixedClock(),
            new() { ["Tests:PostgresConnectionString"] = connection }, web => web.Use(async (http, next) =>
            {
                if (http.Request.Headers.TryGetValue("X-Test-Request", out var request))
                {
                    // Model two request scopes that have both observed the original map.
                    // Explicit barriers control reads and processing order without timing sleeps.
                    await http.RequestServices.GetRequiredService<RecipeDbContext>().WeeklyPlans.SingleAsync();
                    var first = request == "first";
                    (first ? firstRead : secondRead).TrySetResult();
                    await (first ? releaseFirst : releaseSecond).Task.WaitAsync(TimeSpan.FromSeconds(30));
                }
                await next(http);
            }));
        using var firstClient = app.CreateAuthenticatedClient();
        using var secondClient = app.CreateAuthenticatedClient();
        firstClient.DefaultRequestHeaders.Add("X-Test-Request", "first");
        secondClient.DefaultRequestHeaders.Add("X-Test-Request", "second");
        var first = firstClient.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "Tomato", @checked = true });
        var second = secondClient.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "Lettuce", @checked = true });
        await Task.WhenAll(firstRead.Task, secondRead.Task).WaitAsync(TimeSpan.FromSeconds(30));
        releaseFirst.SetResult();
        Assert.Equal(HttpStatusCode.NoContent, (await first).StatusCode);
        releaseSecond.SetResult();
        Assert.Equal(HttpStatusCode.NoContent, (await second).StatusCode);
        await using var fresh = Context();
        var map = JsonSerializer.Deserialize<Dictionary<string, bool>>((await fresh.WeeklyPlans.SingleAsync()).GroceryState!)!;
        Assert.True(map["Tomato"]);
        Assert.True(map["Lettuce"]);
    }

    private static TaskCompletionSource Signal() => new(TaskCreationOptions.RunContinuationsAsynchronously);
    private sealed class FixedClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 10, 20, 12, 0, 0, TimeSpan.Zero);
    }
}
