using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class GroceryMutationEpochTests
{
    private static readonly DateOnly Monday = new(2026, 11, 9);
    private static readonly Guid Row = Guid.Parse("05000000-0000-4000-8000-000000000001");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task ActiveGeneration_MissingOrDifferentEpochRejectsBeforeAnyWrite(bool bulk, bool missing)
    {
        await using var factory = await Factory();
        await Seed(factory);
        var capturedEpoch = Guid.NewGuid(); SelectGeneration(factory, capturedEpoch);
        var body = Body(bulk, Guid.NewGuid(), missing ? null : capturedEpoch);
        SelectGeneration(factory, Guid.NewGuid());
        var before = await Observe(factory);
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("epoch_conflict", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(before, await Observe(factory));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CurrentEpochSucceeds_ButOldEpochCannotReplayRetainedOutcome(bool bulk)
    {
        await using var factory = await Factory(); await Seed(factory);
        var first = Guid.NewGuid(); SelectGeneration(factory, first);
        var body = Body(bulk, Guid.NewGuid(), first);
        using var client = factory.CreateAuthenticatedClient();
        using var accepted = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        var before = await Observe(factory);
        SelectGeneration(factory, Guid.NewGuid());
        using var replay = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.Conflict, replay.StatusCode);
        Assert.Equal("epoch_conflict", (await replay.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(before, await Observe(factory));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DirectServiceInvocation_HasTheSameGenerationFence(bool bulk)
    {
        await using var factory = await Factory(); await Seed(factory); SelectGeneration(factory, Guid.NewGuid());
        var before = await Observe(factory);
        using var scope = factory.Services.CreateScope(); var service = scope.ServiceProvider.GetRequiredService<ScheduleService>();
        var json = JsonSerializer.Serialize(Body(bulk, Guid.NewGuid(), Guid.NewGuid()), Json);
        var error = await Assert.ThrowsAsync<GroceryMutationConflictException>(() => bulk
            ? service.MutateGroceryBulkAsync(0, JsonSerializer.Deserialize<GroceryBulkMutationDto>(json, Json)!)
            : service.MutateGroceryItemAsync(0, JsonSerializer.Deserialize<GroceryItemMutationDto>(json, Json)!));
        Assert.Equal("epoch_conflict", error.Code); Assert.Equal(before, await Observe(factory));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ExplicitNullEpoch_ActiveGenerationAlsoRejectsWithoutWrites(bool bulk)
    {
        await using var factory = await Factory(); await Seed(factory); SelectGeneration(factory, Guid.NewGuid());
        var before = await Observe(factory); var body = Body(bulk, Guid.NewGuid(), null);
        body["expectedPresentationEpoch"] = null;
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("epoch_conflict", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(before, await Observe(factory));
    }

    [Fact]
    public async Task LegacyInternalConstruction_WithoutRealOwnersCannotMutate()
    {
        await using var factory = await Factory(); await Seed(factory); var before = await Observe(factory);
        using var scope = factory.Services.CreateScope();
        var constructor = typeof(ScheduleService).GetConstructors().Single();
        var args = constructor.GetParameters().Select(parameter => parameter.Name is "groceryVocabulary" or "groceryRecoveryBoundary"
            ? null : scope.ServiceProvider.GetService(parameter.ParameterType)).ToArray();
        var service = (ScheduleService)constructor.Invoke(args);
        var request = JsonSerializer.Deserialize<GroceryItemMutationDto>(JsonSerializer.Serialize(Body(false, Guid.NewGuid(), null), Json), Json)!;
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.MutateGroceryItemAsync(0, request));
        Assert.Equal(before, await Observe(factory));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task NilEpoch_PreservesTheExactLegacyReceiptHashAndExplicitEpochHasANewHash(bool bulk)
    {
        await using var factory = await Factory(); await Seed(factory);
        var mutation = Guid.NewGuid(); var body = Body(bulk, mutation, null);
        using var client = factory.CreateAuthenticatedClient();
        using var accepted = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        object oldInput = bulk
            ? new { kind = "bulk", WeekStartDate = (DateOnly?)Monday, ExpectedListVersion = "1", checks = new Dictionary<string, bool> { [Row.ToString("D")] = true } }
            : new { kind = "item", rowId = Row.ToString("D"), WeekStartDate = (DateOnly?)Monday, ExpectedRowVersion = "1", Checked = (bool?)true };
        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(oldInput))));
        Assert.Equal(expectedHash, (await db.GroceryMutationOutcomes.AsNoTracking().SingleAsync()).InputHash);
        var before = await Observe(factory);
        using var replay = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.OK, replay.StatusCode); Assert.Equal(before, await Observe(factory));
        body["expectedPresentationEpoch"] = null;
        using var explicitNullReplay = await client.PatchAsJsonAsync(Route(bulk), body);
        Assert.Equal(HttpStatusCode.OK, explicitNullReplay.StatusCode); Assert.Equal(before, await Observe(factory));
        using var changedBinding = await client.PatchAsJsonAsync(Route(bulk), Body(bulk, mutation, Guid.Empty));
        Assert.Equal(HttpStatusCode.Conflict, changedBinding.StatusCode);
        Assert.Equal("mutation_conflict", (await changedBinding.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(before, await Observe(factory));
    }

    private static string Route(bool bulk) => bulk ? "/api/schedule/0/grocery" : "/api/schedule/0/grocery/item";
    private static Dictionary<string, object?> Body(bool bulk, Guid mutation, Guid? epoch)
    {
        var body = new Dictionary<string, object?> { ["weekStartDate"] = Monday, ["clientMutationId"] = mutation };
        if (bulk) { body["expectedListVersion"] = "1"; body["checks"] = new Dictionary<string, bool> { [Row.ToString("D")] = true }; }
        else { body["rowId"] = Row; body["expectedRowVersion"] = "1"; body["checked"] = true; }
        if (epoch is not null) body["expectedPresentationEpoch"] = epoch;
        return body;
    }
    private static Task<TestWebApplicationFactory> Factory() => TestWebApplicationFactory.CreateWithAuthAsync(clock: new Clock());
    internal static async Task QualifyDirectMaintenanceHold(TestWebApplicationFactory factory, bool bulk)
    {
        await Seed(factory);
        var roots = factory.Services.GetRequiredService<RecipesRootResolver>();
        Assert.Contains("wfs-test-", roots.BaseRoot, StringComparison.Ordinal);
        Directory.CreateDirectory(roots.BaseRoot);
        var marker = Path.Combine(roots.BaseRoot, ".maintenance-hold.json");
        await File.WriteAllTextAsync(marker, JsonSerializer.Serialize(new { version = 1, operationId = Guid.NewGuid(),
            candidate = new string('a', 40), createdAt = DateTimeOffset.UtcNow, apiImage = "sha256:" + new string('b', 64), databaseContainer = new string('c', 64) }));
        try
        {
            var before = await Observe(factory);
            using var scope = factory.Services.CreateScope(); var service = scope.ServiceProvider.GetRequiredService<ScheduleService>();
            var json = JsonSerializer.Serialize(Body(bulk, Guid.NewGuid(), null), Json);
            await Assert.ThrowsAsync<RecoveryBusyException>(() => bulk
                ? service.MutateGroceryBulkAsync(0, JsonSerializer.Deserialize<GroceryBulkMutationDto>(json, Json)!)
                : service.MutateGroceryItemAsync(0, JsonSerializer.Deserialize<GroceryItemMutationDto>(json, Json)!));
            Assert.Equal(before, await Observe(factory));
        }
        finally { File.Delete(marker); }
    }
    private static void SelectGeneration(TestWebApplicationFactory factory, Guid generation)
    {
        var roots = factory.Services.GetRequiredService<RecipesRootResolver>();
        Assert.Contains("wfs-test-", roots.BaseRoot, StringComparison.Ordinal);
        Directory.CreateDirectory(roots.BaseRoot);
        File.WriteAllText(Path.Combine(roots.BaseRoot, ".recovery-active"), generation.ToString("N"));
        Directory.CreateDirectory(roots.Root);
    }
    private static async Task Seed(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var row = new GroceryLineItemDto("Onion", "onion", "Produce", null, null, [])
        { RowId = Row.ToString("D"), RowVersion = "1", WeekStartDate = Monday, DemandIdentity = "retained-demand" };
        db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = Monday, GroceryListVersion = "1", GroceryItems = JsonSerializer.Serialize(new[] { row }),
            GroceryState = JsonSerializer.Serialize(new Dictionary<string, bool> { [Row.ToString("D")] = false }),
            GroceryCheckedDemandBaselines = "{}", GroceryDemandEvidence = "{}" });
        await db.SaveChangesAsync();
    }
    private static async Task<string> Observe(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        return JsonSerializer.Serialize(new { Plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(),
            Outcomes = await db.GroceryMutationOutcomes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync() });
    }
    private sealed class Clock : IClock { public DateTimeOffset UtcNow => DateTimeOffset.Parse("2026-11-13T18:00:00Z"); }
}

public sealed class GroceryMutationEpochPostgresTests(Xunit.Abstractions.ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task DirectItemMutation_CannotWriteThroughMaintenanceHold() => Check(false);
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task DirectBulkMutation_CannotWriteThroughMaintenanceHold() => Check(true);
    private Task Check(bool bulk) => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(clock: new Clock(),
            configurationOverrides: new() { ["Tests:PostgresConnectionString"] = settings.ConnectionString });
        await GroceryMutationEpochTests.QualifyDirectMaintenanceHold(factory, bulk);
    });
    private sealed class Clock : IClock { public DateTimeOffset UtcNow => DateTimeOffset.Parse("2026-11-13T18:00:00Z"); }
}
