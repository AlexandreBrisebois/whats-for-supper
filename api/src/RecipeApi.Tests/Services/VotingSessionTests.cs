using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class VotingSessionTests : IAsyncLifetime
{
    private TestWebApplicationFactory _app = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ScheduleService _schedule = null!;
    private VotingSession _session = null!;
    private readonly DateOnly _monday = new(2026, 10, 19);

    public async Task InitializeAsync()
    {
        _app = await TestWebApplicationFactory.CreateAsync(new Integration.DeploymentCalendarIntegrationTests.CalendarClock());
        _scope = _app.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _schedule = _scope.ServiceProvider.GetRequiredService<ScheduleService>();
        _session = _app.Services.GetRequiredService<VotingSession>();
    }

    public async Task DisposeAsync() { _scope.Dispose(); await _app.DisposeAsync(); }

    private async Task<Recipe[]> SeedAsync(int otherPlans = 6, int candidates = 1)
    {
        for (var i = 0; i < otherPlans; i++)
            _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = _monday.AddDays(i),
                Status = CalendarEventStatus.Skipped, NonCookingKind = "eating_out" });
        var recipes = Enumerable.Range(0, candidates).Select(i => new Recipe
            { Id = Guid.NewGuid(), Name = $"Candidate {i}", LastCookedDate = DateTimeOffset.Parse("2026-10-01T00:00:00Z").AddDays(i) }).ToArray();
        _db.Recipes.AddRange(recipes);
        foreach (var recipe in recipes)
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id,
                FamilyMemberId = _app.DefaultFamilyMemberId, Vote = VoteType.Like });
        await _db.SaveChangesAsync();
        return recipes;
    }

    [Fact]
    public async Task EarlyVotesRemainUnownedAndReadDoesNotInitializeDurableState()
    {
        await SeedAsync();
        var result = await _session.ReadAsync();
        Assert.Equal("unowned", result.Phase);
        Assert.Null(result.RequiredSlots);
        Assert.Null(result.SmartDefaults);
        Assert.Null(result.RoundId);
        Assert.Empty(_db.VotingRoundStates);
        Assert.Empty(_db.WeeklyPlans);
        Assert.Single(_db.RecipeVotes);
    }

    [Fact]
    public async Task WithdrawalIsLatchedButRestartRecalculatesInsufficientCoverage()
    {
        await SeedAsync();
        await _schedule.OpenVotingAsync(1);
        var first = await _session.ReadAsync();
        Assert.Equal("converged", first.Phase);
        _db.RecipeVotes.RemoveRange(_db.RecipeVotes);
        await _db.SaveChangesAsync();
        var withdrawn = await _session.ReadAsync();
        Assert.Equal("converged", withdrawn.Phase);
        Assert.Equal(0, withdrawn.CoveredSlots);
        Assert.Empty(withdrawn.SmartDefaults!.PreSelectedRecipes);
        var restarted = new VotingSession(_app.Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<VotingSession>.Instance);
        var recovered = await restarted.ReadAsync();
        Assert.Equal("collecting", recovered.Phase);
        Assert.NotEqual(first.IncarnationId, recovered.IncarnationId);
        Assert.Equal(first.RoundId, recovered.RoundId);
    }

    [Fact]
    public async Task RestartWithCoverageAndRepeatedOpenRemainConverged()
    {
        await SeedAsync();
        await _schedule.OpenVotingAsync(1);
        var first = await _session.ReadAsync();
        await _schedule.OpenVotingAsync(1);
        var repeated = await _session.ReadAsync();
        Assert.Equal(first.RoundId, repeated.RoundId);
        Assert.True(repeated.Revision > first.Revision);
        var restarted = new VotingSession(_app.Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<VotingSession>.Instance);
        Assert.Equal("converged", (await restarted.ReadAsync()).Phase);
    }

    [Fact]
    public async Task ZeroCapacityConvergesWithoutAssignmentsAndNextRoundRevisionsRemainMonotonic()
    {
        await SeedAsync(7, 0);
        await _schedule.OpenVotingAsync(1);
        var first = await _session.ReadAsync();
        Assert.Equal("converged", first.Phase);
        Assert.Equal(0, first.RequiredSlots);
        await _schedule.LockScheduleAsync(1, votingRoundId: first.RoundId);
        var closed = await _session.ReadAsync();
        Assert.Equal("unowned", closed.Phase);
        Assert.NotEqual(first.RoundId, closed.RoundId);
        Assert.True(closed.Revision > first.Revision);
        await _schedule.RemoveRecipeAsync(_monday);
        await _schedule.OpenVotingAsync(1);
        var reopened = await _session.ReadAsync();
        Assert.Equal("collecting", reopened.Phase);
        Assert.Equal(1, reopened.RequiredSlots);
        Assert.True(reopened.Revision > closed.Revision);
        Assert.Equal(first.IncarnationId, reopened.IncarnationId);
    }

    [Fact]
    public async Task FailedScopedReadCannotFabricateProgressOrAdvanceRevision()
    {
        var scopes = new FallibleScopes(_app.Services.GetRequiredService<IServiceScopeFactory>());
        var session = new VotingSession(scopes, NullLogger<VotingSession>.Instance);
        var first = await session.ReadAsync();
        scopes.Fail = true;
        await Assert.ThrowsAsync<IOException>(() => session.ReadAsync());
        Assert.Null(await session.RefreshAfterMutationAsync());
        scopes.Fail = false;
        var recovered = await session.ReadAsync();
        Assert.Equal(first.Revision + 1, recovered.Revision);
        Assert.Equal("unowned", recovered.Phase);
        Assert.Null(recovered.CoveredSlots);
    }

    private sealed class FallibleScopes(IServiceScopeFactory inner) : IServiceScopeFactory
    {
        public bool Fail { get; set; }
        public IServiceScope CreateScope() => Fail ? throw new IOException("Unavailable test scope") : inner.CreateScope();
    }

    [Fact]
    public async Task CanceledReadDoesNotAdvanceProjectionRevision()
    {
        var first = await _session.ReadAsync();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _session.ReadAsync(cancellation.Token));
        Assert.Equal(first.Revision + 1, (await _session.ReadAsync()).Revision);
    }

    [Fact]
    public async Task LateUnanimousVoteReordersSuggestionsAndKeepsConvergence()
    {
        var recipes = await SeedAsync(6, 2);
        var members = Enumerable.Range(0, 2).Select(i => new FamilyMember { Id = Guid.NewGuid(), Name = $"Other {i}" }).ToArray();
        _db.FamilyMembers.AddRange(members);
        foreach (var recipe in recipes)
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = members[0].Id, Vote = VoteType.Like });
        await _db.SaveChangesAsync();
        await _schedule.OpenVotingAsync(1);
        var first = await _session.ReadAsync();
        Assert.Equal(recipes[1].Id, Assert.Single(first.SmartDefaults!.PreSelectedRecipes).RecipeId);
        await _scope.ServiceProvider.GetRequiredService<DiscoveryService>().SubmitVoteAsync(recipes[0].Id, members[1].Id, VoteType.Like);
        var late = await _session.ReadAsync();
        Assert.Equal("converged", late.Phase);
        Assert.Equal(2, late.CandidateCount);
        Assert.Equal(recipes[0].Id, Assert.Single(late.SmartDefaults!.PreSelectedRecipes).RecipeId);
        Assert.Equal(6, _db.CalendarEvents.Count());
        Assert.Empty(_db.WeeklyHouseholdInterests);
    }

    [Fact]
    public async Task LateVoteCreatesAdditionalCandidateWithoutSavingOrClosing()
    {
        var recipes = await SeedAsync(6, 2);
        _db.RecipeVotes.Remove(_db.RecipeVotes.Single(v => v.RecipeId == recipes[1].Id));
        await _db.SaveChangesAsync();
        await _schedule.OpenVotingAsync(1);
        var first = await _session.ReadAsync();
        Assert.Equal("converged", first.Phase);
        Assert.Equal(1, first.CandidateCount);
        await _scope.ServiceProvider.GetRequiredService<DiscoveryService>()
            .SubmitVoteAsync(recipes[1].Id, _app.DefaultFamilyMemberId, VoteType.Like);
        var late = await _session.ReadAsync();
        Assert.Equal("converged", late.Phase);
        Assert.Equal(2, late.CandidateCount);
        Assert.Single(late.SmartDefaults!.PreSelectedRecipes);
        Assert.Equal(6, _db.CalendarEvents.Count());
        Assert.Empty(_db.WeeklyHouseholdInterests);
        Assert.Equal(WeeklyPlanStatus.VotingOpen, Assert.Single(_db.WeeklyPlans).Status);
    }

    [Fact]
    public async Task FailedVoteRequestCannotEstablishConfirmedCoverage()
    {
        var recipes = await SeedAsync();
        _db.RecipeVotes.RemoveRange(_db.RecipeVotes);
        await _db.SaveChangesAsync();
        await _schedule.OpenVotingAsync(1);
        using var client = _app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", _app.DefaultFamilyMemberId.ToString());
        using var body = new StringContent("{\"vote\":\"invalid\"}", Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"/api/discovery/{recipes[0].Id}/vote", body);
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("collecting", (await _session.ReadAsync()).Phase);
        Assert.Empty(_db.RecipeVotes);
    }

    [Fact]
    public async Task UnrelatedWeekPublicationDoesNotNotifyTheOwnedSession()
    {
        await SeedAsync();
        await _schedule.OpenVotingAsync(1);
        var manager = _app.Services.GetRequiredService<SseConnectionManager>();
        using var body = new MemoryStream();
        var context = new DefaultHttpContext();
        context.Response.Body = body;
        var connection = manager.AddConnection(context.Response);
        try
        {
            await _scope.ServiceProvider.GetRequiredService<IScheduleEventPublisher>()
                .PublishWeekUpdatedAsync(await _schedule.GetScheduleAsync(0));
            Assert.DoesNotContain("voting_session_updated", Encoding.UTF8.GetString(body.ToArray()));
        }
        finally { manager.RemoveConnection(connection); }
    }

    [Theory]
    [InlineData("remove")]
    [InlineData("other")]
    [InlineData("close")]
    [InlineData("family")]
    [InlineData("delete-member")]
    [InlineData("recipe")]
    public async Task RelevantCommittedMutationPublishesRefreshedSession(string mutation)
    {
        await SeedAsync();
        await _schedule.OpenVotingAsync(1);
        var before = await _session.ReadAsync();
        var manager = _app.Services.GetRequiredService<SseConnectionManager>();
        using var body = new MemoryStream();
        var context = new DefaultHttpContext();
        context.Response.Body = body;
        var connection = manager.AddConnection(context.Response);
        try
        {
            switch (mutation)
            {
                case "remove": await _schedule.RemoveRecipeAsync(_monday); break;
                case "other": await _schedule.ValidateDayAsync(_monday.AddDays(6).ToString("yyyy-MM-dd"),
                    new ValidationDto(3, NonCooking: new NonCookingPlanDto("eating_out", null))); break;
                case "close": await _schedule.LockScheduleAsync(1, votingRoundId: before.RoundId); break;
                case "delete-member": await _scope.ServiceProvider.GetRequiredService<FamilyService>().DeleteFamilyMember(_app.DefaultFamilyMemberId); break;
                case "family": await _scope.ServiceProvider.GetRequiredService<FamilyService>().CreateFamilyMember("New member"); break;
                case "recipe": await _scope.ServiceProvider.GetRequiredService<IScheduleEventPublisher>().PublishAllSuggestionsInvalidatedAsync(); break;
            }
            var frame = Encoding.UTF8.GetString(body.ToArray()).Split("\n\n", StringSplitOptions.RemoveEmptyEntries)
                .LastOrDefault(f => f.StartsWith("event: voting_session_updated\n", StringComparison.Ordinal));
            Assert.NotNull(frame);
            using var json = JsonDocument.Parse(frame.Split('\n').Single(l => l.StartsWith("data: ", StringComparison.Ordinal))[6..]);
            var projection = json.RootElement.GetProperty("session");
            Assert.True(projection.GetProperty("revision").GetInt64() > before.Revision);
            Assert.Equal(mutation == "close" ? "unowned" : "converged", projection.GetProperty("phase").GetString());
            Assert.Equal(mutation == "close" ? JsonValueKind.Null : JsonValueKind.Number, projection.GetProperty("requiredSlots").ValueKind);
        }
        finally { manager.RemoveConnection(connection); }
    }
}
