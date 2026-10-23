using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Moq;
using RecipeApi.Infrastructure;

namespace RecipeApi.Tests.Services;

public sealed class GroceryExtraServiceTests
{
    [Fact]
    public async Task Create_AllowsDistinctSameNamesAndReplaysClientIdentity()
    {
        await using var db = TestDbContextFactory.Create();
        var monday = new DateOnly(2026, 10, 19);
        var service = Create(db, new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero));
        var firstId = Guid.NewGuid();

        var first = await service.CreateAsync(new(firstId, monday, " Milk "));
        var replay = await service.CreateAsync(new(firstId, monday, "Milk"));
        var duplicate = await service.CreateAsync(new(Guid.NewGuid(), monday, "Milk"));

        Assert.True(first.Created);
        Assert.False(replay.Created);
        Assert.NotEqual(first.Extra.Id, duplicate.Extra.Id);
        Assert.Equal(2, await db.GroceryExtraOccurrences.CountAsync());
    }

    [Fact]
    public async Task Suggestions_DeduplicateRankAndSuppressOutstanding()
    {
        await using var db = TestDbContextFactory.Create();
        var current = new DateOnly(2026, 10, 19);
        db.GroceryExtraOccurrences.AddRange(
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 5), "Almond milk", "almond milk", "Beverages", DateTimeOffset.Parse("2026-10-05T12:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12), "Milk bags", "milk bags", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-12T12:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), current, "Milk", "milk", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-19T12:00:00Z")));
        await db.SaveChangesAsync();
        var service = Create(db, new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero));

        Assert.Equal(["Milk bags", "Almond milk"], await service.SuggestAsync("mi"));
    }

    [Fact]
    public async Task Suggestions_UseLatestSpellingSuppressLatestRemovalCapResultsAndKeepDiagnosticsNameFree()
    {
        await using var db = TestDbContextFactory.Create();
        var current = new DateOnly(2026, 10, 19);
        var removed = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12),
            "Milk powder", "milk powder", "Grocery", DateTimeOffset.Parse("2026-10-12T12:00:00Z"));
        removed.RemovedAt = DateTimeOffset.Parse("2026-10-13T12:00:00Z");
        db.GroceryExtraOccurrences.AddRange(
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 9, 28), "Milk", "milk", "Dairy & Eggs", DateTimeOffset.Parse("2026-09-28T12:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 5), "MILK", "milk", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-05T12:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12), "Milk bags", "milk bags", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-12T13:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 5), "Millet", "millet", "Pantry", DateTimeOffset.Parse("2026-10-05T13:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12), "Milk crates", "milk crates", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-12T14:00:00Z")),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), current, "Milk crates", "milk crates", "Dairy & Eggs", DateTimeOffset.Parse("2026-10-19T12:00:00Z")),
            removed,
            GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 12), "Almond milk", "almond milk", "Beverages", DateTimeOffset.Parse("2026-10-12T15:00:00Z")));
        await db.SaveChangesAsync();
        var logger = new Mock<ILogger<GroceryExtraService>>();
        var service = new GroceryExtraService(db,
            new FixedClock(new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero)),
            new DeploymentCalendar(new ConfigurationManager()), new AisleMapper(), logger: logger.Object);

        var suggestions = await service.SuggestAsync("mi");

        Assert.Equal(["Milk bags", "Millet", "MILK"], suggestions);
        logger.Verify(x => x.Log(
            LogLevel.Information,
            It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((state, _) => SuggestionLogIsNameFree(state.ToString())),
            null,
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
    }

    [Fact]
    public async Task VersionedMutationsPreserveRenameCategoryAndTombstone()
    {
        await using var db = TestDbContextFactory.Create();
        var monday = new DateOnly(2026, 10, 19);
        var service = Create(db, new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero));
        db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "milk", GrocerySection = "Dairy & Eggs", Source = "manual"
        });
        await db.SaveChangesAsync();
        var id = Guid.NewGuid();
        var created = (await service.CreateAsync(new(id, monday, "Milk"))).Extra;

        var renamed = await service.UpdateAsync(id, new(monday, created.Version, Name: "Oat milk"));
        Assert.Equal(created.GrocerySection, renamed.GrocerySection);
        var categorized = await service.UpdateAsync(id, new(monday, renamed.Version, GrocerySection: "Pantry"));
        Assert.Equal("Pantry", categorized.GrocerySection);
        Assert.Equal("Dairy & Eggs", (await db.IngredientCategories.SingleAsync()).GrocerySection);
        await service.DeleteAsync(id, monday, categorized.Version);

        Assert.Empty(await service.ReadForViewAsync(monday, monday));
        Assert.NotNull((await db.GroceryExtraOccurrences.SingleAsync()).RemovedAt);
    }

    [Fact]
    public async Task CreateAndUpdateCanonicalizeSectionCasing()
    {
        await using var db = TestDbContextFactory.Create();
        var monday = new DateOnly(2026, 10, 19);
        db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "milk", GrocerySection = "dairy & eggs", Source = "manual"
        });
        await db.SaveChangesAsync();
        var service = Create(db, new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero));
        var id = Guid.NewGuid();

        var created = (await service.CreateAsync(new(id, monday, "Milk"))).Extra;
        var updated = await service.UpdateAsync(id, new(monday, created.Version, GrocerySection: "pantry"));

        Assert.Equal("Dairy & Eggs", created.GrocerySection);
        Assert.Equal("Pantry", updated.GrocerySection);
        Assert.Equal("Pantry", (await db.GroceryExtraOccurrences.SingleAsync()).GrocerySection);
    }

    [Fact]
    public async Task RolloverFillsEveryMissedMondayAndStopsCheckedLineage()
    {
        await using var db = TestDbContextFactory.Create();
        var original = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 9, 28),
            "Coffee", "coffee", "Beverages", DateTimeOffset.Parse("2026-09-28T12:00:00Z"));
        db.GroceryExtraOccurrences.Add(original);
        await db.SaveChangesAsync();
        var clock = new FixedClock(new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero));
        var rollover = new GroceryExtraRolloverService(db, clock, new DeploymentCalendar(new ConfigurationManager()));

        Assert.Equal(3, (await rollover.ReconcileAsync(new(2026, 10, 19))).Created);
        Assert.Equal(0, (await rollover.ReconcileAsync(new(2026, 10, 19))).Created);
        Assert.Equal(4, await db.GroceryExtraOccurrences.CountAsync());
        Assert.Equal(4, await db.GroceryExtraOccurrences.Select(x => x.WeekStartDate).Distinct().CountAsync());
    }

    [Fact]
    public async Task PublicationFailureDoesNotTurnCommittedCreateIntoFailure()
    {
        await using var db = TestDbContextFactory.Create();
        var monday = new DateOnly(2026, 10, 19);
        var publisher = new Mock<IScheduleEventPublisher>();
        publisher.Setup(x => x.PublishGroceryExtrasUpdatedAsync(monday, It.IsAny<IReadOnlyList<GroceryExtraDto>>(), "origin"))
            .ThrowsAsync(new IOException("stream unavailable"));
        var service = new GroceryExtraService(db, new FixedClock(new DateTimeOffset(2026, 10, 20, 12, 0, 0, TimeSpan.Zero)),
            new DeploymentCalendar(new ConfigurationManager()), new AisleMapper(), publisher.Object);

        var result = await service.CreateAsync(new(Guid.NewGuid(), monday, "Coffee"), "origin");

        Assert.True(result.Created);
        Assert.Single(await db.GroceryExtraOccurrences.ToListAsync());
        publisher.VerifyAll();
    }

    private static GroceryExtraService Create(RecipeDbContext db, DateTimeOffset now) =>
        new(db, new FixedClock(now), new DeploymentCalendar(new ConfigurationManager()), new AisleMapper());

    private static bool SuggestionLogIsNameFree(string? message) =>
        message is not null && message.Contains("3 results") &&
        !message.Contains("Milk bags", StringComparison.OrdinalIgnoreCase) &&
        !message.Contains("Millet", StringComparison.OrdinalIgnoreCase) &&
        !message.Contains("MILK", StringComparison.OrdinalIgnoreCase);

    private sealed class FixedClock(DateTimeOffset now) : IClock { public DateTimeOffset UtcNow => now; }
}
