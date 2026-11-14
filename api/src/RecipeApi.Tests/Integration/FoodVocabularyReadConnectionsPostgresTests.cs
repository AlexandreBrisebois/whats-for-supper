using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class FoodVocabularyReadConnectionsPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task NoHeadActiveCapture_UsesOnePhysicalEfConnectionForCompleteReferenceInventory() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        Assert.False(new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString()).Pooling);
        counter.Reset();
        Assert.Null(await services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync());
        output.WriteLine("Physical EF opens for actual no-head active capture: " + counter.Opens);
        Assert.Equal(1, counter.Opens);
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task NoHeadPresentationCapture_UsesOnePhysicalEfConnectionAcrossNestedActiveCapture() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>(); counter.Reset();
        var capture = await services.GetRequiredService<FoodVocabularyStore>().CapturePresentationAsync([]);
        output.WriteLine("Physical EF opens for actual no-head presentation capture: " + counter.Opens);
        Assert.Equal(1, counter.Opens);
        Assert.Equal("0", capture.Version); Assert.Equal(Guid.Empty, capture.Epoch);
        Assert.Empty(capture.Overrides); Assert.Null(capture.Authority.ActiveRef);
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CapturedRead_PreservesCallerOpenConnectionAndTransactionOwnership() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>(); var store = services.GetRequiredService<FoodVocabularyStore>();
        await db.Database.OpenConnectionAsync();
        try
        {
            counter.Reset();
            await store.CapturePresentationAsync([]);
            Assert.Equal(0, counter.Opens); Assert.Equal(ConnectionState.Open, db.Database.GetDbConnection().State);
            await using var transaction = await db.Database.BeginTransactionAsync();
            await store.CaptureActiveAsync();
            Assert.Same(transaction, db.Database.CurrentTransaction);
            Assert.Equal(ConnectionState.Open, db.Database.GetDbConnection().State);
            Assert.Equal(0, counter.Opens);
            await transaction.RollbackAsync();
        }
        finally { await db.Database.CloseConnectionAsync(); }
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RejectedNoHeadReference_ClosesOnlyOwnedConnectionAndPreservesOriginalFacts() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>(); var at = DateTimeOffset.UtcNow;
        db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "opaque", FoodId = Guid.NewGuid(),
            DictionaryRevision = "retained", DocumentRevision = "missing-document", DocumentSha256 = new('a', 64),
            ProtectedFields = ["shoppingName"], PresentationSequence = "1", CreatedAt = at, UpdatedAt = at });
        await db.SaveChangesAsync(); counter.Reset();
        await Assert.ThrowsAsync<InvalidDataException>(() => services.GetRequiredService<FoodVocabularyStore>().CapturePresentationAsync([]));
        Assert.Equal(1, counter.Opens);
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
        Assert.Equal("opaque", (await db.HouseholdFoodOverrides.AsNoTracking().SingleAsync()).Revision);
        Assert.False(await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            counter.Reset();
            await Assert.ThrowsAsync<InvalidDataException>(() => services.GetRequiredService<FoodVocabularyStore>().CapturePresentationAsync([]));
            Assert.Equal(0, counter.Opens);
            Assert.Same(transaction, db.Database.CurrentTransaction);
            Assert.Equal(ConnectionState.Open, db.Database.GetDbConnection().State);
            await transaction.RollbackAsync();
        }
        finally { await db.Database.CloseConnectionAsync(); }
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task GroceryResponsePresentation_RetainsOnePhysicalConnectionAcrossItsCompleteRead() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>(); counter.Reset();
        var result = await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(
            new RecipeApi.Dto.GroceryMutationResult(DateTimeOffset.UtcNow, new DateOnly(2026, 5, 4), "1", [], []));
        output.WriteLine("Physical EF opens for complete grocery response presentation: " + counter.Opens);
        Assert.Equal(1, counter.Opens);
        Assert.Empty(result.Rows);
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task GroceryResponsePresentation_PreservesCallerConnectionAndTransaction() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(); counter.Reset();
            await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(
                new RecipeApi.Dto.GroceryMutationResult(DateTimeOffset.UtcNow, new DateOnly(2026, 5, 4), "1", [], []));
            Assert.Equal(0, counter.Opens);
            Assert.Same(transaction, db.Database.CurrentTransaction);
            Assert.Equal(ConnectionState.Open, db.Database.GetDbConnection().State);
            await transaction.RollbackAsync();
        }
        finally { await db.Database.CloseConnectionAsync(); }
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task GroceryResponsePresentation_ClosesOwnedConnectionWhenStrictAuthorityRejects() => WithDatabase(async (services, counter) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>(); var at = DateTimeOffset.UtcNow;
        db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "opaque", FoodId = Guid.NewGuid(),
            DictionaryRevision = "retained", DocumentRevision = "missing-document", DocumentSha256 = new('a', 64),
            ProtectedFields = ["shoppingName"], PresentationSequence = "1", CreatedAt = at, UpdatedAt = at });
        await db.SaveChangesAsync(); counter.Reset();
        await Assert.ThrowsAsync<InvalidDataException>(() => services.GetRequiredService<GroceryPresentationService>().DecorateAsync(
            new RecipeApi.Dto.GroceryMutationResult(DateTimeOffset.UtcNow, new DateOnly(2026, 5, 4), "1", [], [])));
        Assert.Equal(1, counter.Opens);
        Assert.Equal(ConnectionState.Closed, db.Database.GetDbConnection().State);
        Assert.Equal("opaque", (await db.HouseholdFoodOverrides.AsNoTracking().SingleAsync()).Revision);
    });

    private Task WithDatabase(Func<IServiceProvider, PhysicalOpenCounter, Task> check) => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        Assert.False(settings.Pooling); // Existing real-PG fixture policy is unchanged.
        var counter = new PhysicalOpenCounter();
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        { ["Tests:PostgresConnectionString"] = settings.ConnectionString },
            configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(counter)));
        using var scope = factory.Services.CreateScope();
        await check(scope.ServiceProvider, counter);
    });

    private sealed class PhysicalOpenCounter : DbConnectionInterceptor
    {
        private int opens;
        public int Opens => Volatile.Read(ref opens);
        public void Reset() => Interlocked.Exchange(ref opens, 0);
        public override Task ConnectionOpenedAsync(DbConnection connection, ConnectionEndEventData eventData, CancellationToken cancellationToken = default)
        { Interlocked.Increment(ref opens); return Task.CompletedTask; }
    }
}
