using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    [Fact]
    public async Task SupperServings_AutomaticAndExplicitSameNumber_ApiContract()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock());
        await ExerciseUsualModes(factory);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_AutomaticAndExplicitSameNumber_MemberVersionAndPersistence()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await ExerciseUsualModes(factory);
        });
    }

    private static async Task ExerciseUsualModes(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        for (var i = await db.FamilyMembers.CountAsync(); i < 4; i++) db.FamilyMembers.Add(new() { Name = "Usual member " + i });
        await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var automatic = await Read(client);
        Assert.Equal(4, automatic.GetProperty("defaultServings").GetInt32());
        Assert.Equal("family", automatic.GetProperty("defaultServingsSource").GetString());
        Assert.Empty(await db.FamilySettings.Where(x => x.Key == SupperServingsService.DefaultKey).ToListAsync());
        (await Put(client, automatic, 4, [])).EnsureSuccessStatusCode();
        var explicitFour = await Read(client);
        Assert.Equal("explicit", explicitFour.GetProperty("defaultServingsSource").GetString());
        Assert.NotEqual(automatic.GetProperty("version").GetString(), explicitFour.GetProperty("version").GetString());
        db.ChangeTracker.Clear(); Assert.Equal(4, (await db.FamilySettings.SingleAsync(x => x.Key == SupperServingsService.DefaultKey)).Value.GetProperty("servings").GetInt32());
        (await Put(client, explicitFour, null, [])).EnsureSuccessStatusCode();
        var sameNumberAutomatic = await Read(client);
        Assert.Equal(4, sameNumberAutomatic.GetProperty("defaultServings").GetInt32());
        Assert.Equal("family", sameNumberAutomatic.GetProperty("defaultServingsSource").GetString());
        Assert.NotEqual(explicitFour.GetProperty("version").GetString(), sameNumberAutomatic.GetProperty("version").GetString());
        (await Put(client, sameNumberAutomatic, 4, [])).EnsureSuccessStatusCode(); explicitFour = await Read(client);
        var memberResponse = await client.PostAsJsonAsync("/api/family", new { name = "Fifth usual member" }); memberResponse.EnsureSuccessStatusCode();
        var explicitAfter = await Read(client);
        Assert.Equal(4, explicitAfter.GetProperty("defaultServings").GetInt32());
        Assert.Equal(explicitFour.GetProperty("version").GetString(), explicitAfter.GetProperty("version").GetString());
        (await Put(client, explicitAfter, null, [])).EnsureSuccessStatusCode();
        var familyFive = await Read(client); Assert.Equal(5, familyFive.GetProperty("defaultServings").GetInt32()); Assert.Equal("family", familyFive.GetProperty("defaultServingsSource").GetString());
        db.ChangeTracker.Clear(); Assert.Equal(JsonValueKind.Null, (await db.FamilySettings.SingleAsync(x => x.Key == SupperServingsService.DefaultKey)).Value.GetProperty("servings").ValueKind);
        var sixth = await client.PostAsJsonAsync("/api/family", new { name = "Sixth usual member" }); sixth.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await Put(client, familyFive, 7, [])).StatusCode);
        var familySix = await Read(client); Assert.Equal(6, familySix.GetProperty("defaultServings").GetInt32());
        (await Put(client, familySix, null, [], false)).EnsureSuccessStatusCode();
        Assert.Equal("family", (await Read(client)).GetProperty("defaultServingsSource").GetString());
        var member = JsonDocument.Parse(await sixth.Content.ReadAsStringAsync()).RootElement.GetProperty("data").GetProperty("id").GetGuid();
        (await client.DeleteAsync("/api/family/" + member)).EnsureSuccessStatusCode();
        Assert.Equal(5, (await Read(client)).GetProperty("defaultServings").GetInt32());
    }

    [Fact]
    public async Task SupperServings_EmptyFamilyIsUnavailable_AndCorruptStoredSettingFails()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock());
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.FamilyMembers.RemoveRange(db.FamilyMembers); await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient(); var unavailable = await Read(client);
        Assert.Equal("family", unavailable.GetProperty("defaultServingsSource").GetString()); Assert.Equal(JsonValueKind.Null, unavailable.GetProperty("defaultServings").ValueKind);
        db.FamilySettings.Add(new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 0 }) }); await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.InternalServerError, (await client.GetAsync(Url)).StatusCode);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_AutomaticMembershipSnapshotsOnlyEditableInheritedDates_AndRefreshesGroceries()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            for (var i = await db.FamilyMembers.CountAsync(); i < 4; i++) db.FamilyMembers.Add(new() { Name = "Snapshot member " + i });
            var recipe = new Recipe { Name = "Pasta", Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
            db.Recipes.Add(recipe);
            var past = new DateOnly(2026,10,10); var prepared = Wednesday.AddDays(1); var skipped = Wednesday.AddDays(2); var overridden = Wednesday.AddDays(3); var otherMeal = Wednesday.AddDays(4);
            db.CalendarEvents.AddRange(new CalendarEvent { Date = past, RecipeId = recipe.Id }, new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id },
                new CalendarEvent { Date = prepared, RecipeId = recipe.Id, PreparedAtUtc = DateTimeOffset.Parse("2026-10-14T10:00:00Z"), PreparedServings = null },
                new CalendarEvent { Date = skipped, RecipeId = recipe.Id, Status = CalendarEventStatus.Skipped }, new CalendarEvent { Date = overridden, RecipeId = recipe.Id },
                new CalendarEvent { Date = otherMeal, RecipeId = recipe.Id, MealSlot = 1 });
            foreach (var date in new[] {past, prepared, skipped}) db.SupperServings.Add(new() { Date = date, InheritedServings = null });
            db.SupperServings.Add(new() { Date = overridden, OverrideServings = 8, InheritedServings = 3 });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12), default);
            var frozen = await db.SupperServings.AsNoTracking().ToDictionaryAsync(x => x.Date, x => new { x.InheritedServings, x.OverrideServings, x.Version, x.UpdatedAt });
            using var client = factory.CreateAuthenticatedClient(); var before = await Read(client);
            (await client.PostAsJsonAsync("/api/family", new { name = "Added snapshot member" })).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Conflict, (await Put(client, before, 9, [])).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(5, (await db.SupperServings.SingleAsync(x => x.Date == Wednesday)).InheritedServings);
            foreach (var pair in frozen) { var row = await db.SupperServings.SingleAsync(x => x.Date == pair.Key); Assert.Equal(pair.Value.InheritedServings, row.InheritedServings); Assert.Equal(pair.Value.OverrideServings, row.OverrideServings); Assert.Equal(pair.Value.Version, row.Version); Assert.Equal(pair.Value.UpdatedAt, row.UpdatedAt); }
            var plan = await db.WeeklyPlans.SingleAsync(); Assert.Equal("updating", plan.ServingRefreshStatus); Assert.NotEqual(plan.ServingInputVersion, plan.ServingAppliedVersion);
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12), default);
            db.ChangeTracker.Clear(); plan = await db.WeeklyPlans.SingleAsync(); Assert.Equal(plan.ServingInputVersion, plan.ServingAppliedVersion);
            Assert.Contains("1900", plan.GroceryItems); Assert.Null((await db.CalendarEvents.SingleAsync(x => x.Date == prepared)).PreparedServings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ExactRecoveryAuditsFormerlyCurrentObsoleteDerivation()
    {
        await WithLifecycle(async (app, root) => {
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Restored automatic", Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
            db.Recipes.Add(recipe); db.CalendarEvents.Add(new() { Date = Wednesday, RecipeId = recipe.Id });
            db.WeeklyPlans.Add(new() { WeekStartDate = new(2026,10,12), ServingInputVersion = "old-current-derivation", ServingAppliedVersion = "old-current-derivation", GroceryItems = "[]" }); await db.SaveChangesAsync();
            var recovery = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>(); var snapshot = await recovery.CaptureAsync(default);
            await recovery.RestoreExactAsync(snapshot.SnapshotId!.Value, default); db.ChangeTracker.Clear();
            var plan = await db.WeeklyPlans.SingleAsync(); Assert.NotEqual("old-current-derivation", plan.ServingInputVersion); Assert.Equal("updating", plan.ServingRefreshStatus); Assert.NotEqual(plan.ServingInputVersion, plan.ServingAppliedVersion);
            Assert.NotNull(plan.ServingRefreshWorkflowId); Assert.Null(await db.FamilySettings.SingleOrDefaultAsync(x => x.Key == SupperServingsService.DefaultKey));
        });
    }
    [Fact]
    public async Task SupperServings_ActivationAuditsSavedSemanticVersions_Idempotently()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock());
        await ExerciseActivationAudit(factory);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ActivationStartupSeam_PostgresAuditIsDurableAndIdempotent()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await ExerciseActivationAudit(factory);
        });
    }

    private static async Task ExerciseActivationAudit(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Activation", Servings = 2, Ingredients = "[\"200 g pasta\"]" }; db.Recipes.Add(recipe);
        db.CalendarEvents.AddRange(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id }, new CalendarEvent { Date = Wednesday.AddDays(7), RecipeId = recipe.Id });
        db.WeeklyPlans.Add(new() { WeekStartDate = new(2026,10,12), ServingInputVersion = "old-current", ServingAppliedVersion = "old-current" }); await db.SaveChangesAsync();
        var owner = scope.ServiceProvider.GetRequiredService<SupperProjectionInvalidation>();
        var boundary = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>(); var recovery = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
        await owner.ReconcileActivationAsync(boundary, recovery, default);
        db.ChangeTracker.Clear(); var plan = await db.WeeklyPlans.SingleAsync(); Assert.NotEqual("old-current", plan.ServingInputVersion); Assert.Equal("updating", plan.ServingRefreshStatus);
        Assert.Equal(1, (await db.SupperServings.SingleAsync(x => x.Date == Wednesday)).InheritedServings);
        Assert.Equal(1, (await db.SupperServings.SingleAsync(x => x.Date == Wednesday.AddDays(7))).InheritedServings);
        Assert.Single(await db.WeeklyPlans.ToListAsync()); Assert.Empty(await db.FamilySettings.Where(x => x.Key == SupperServingsService.DefaultKey).ToListAsync());
        var job = plan.ServingRefreshWorkflowId; var row = await db.SupperServings.SingleAsync(x => x.Date == Wednesday); var rowVersion = row.Version;
        await owner.ReconcileActivationAsync(boundary, recovery, default);
        db.ChangeTracker.Clear(); Assert.Equal(job, (await db.WeeklyPlans.SingleAsync()).ServingRefreshWorkflowId); Assert.Equal(rowVersion, (await db.SupperServings.SingleAsync(x => x.Date == Wednesday)).Version);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_MembershipAndPreparationGuardEachOthersCapturedInputs()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Preparation usual", Servings = 2, Ingredients = "[\"200 g pasta\"]" }; var evt = new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id };
            db.Recipes.Add(recipe); db.CalendarEvents.Add(evt); await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Project() => JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=assigned&occurrenceId={evt.Id}")).RootElement.Clone();
            Task<HttpResponseMessage> Prepare(JsonElement p) => client.PostAsJsonAsync("/api/schedule/day/2026-10-14/prepare", new { recipeId = recipe.Id, expectedOccurrenceId = evt.Id, expectedPlanToken = p.GetProperty("preparationPlanToken").GetString(), expectedServingVersion = p.GetProperty("preparationServingVersion").GetString() });
            var old = await Project();
            (await client.PostAsJsonAsync("/api/family", new { name = "Preparation member two" })).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Conflict, (await Prepare(old)).StatusCode);
            var baseline = await Read(client); var current = await Project(); Assert.Equal(2, current.GetProperty("targetServings").GetInt32());
            (await Prepare(current)).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Conflict, (await Put(client, baseline, 8, [])).StatusCode);
            db.ChangeTracker.Clear(); var beforeRow = await db.SupperServings.AsNoTracking().SingleAsync(); var prepared = await db.CalendarEvents.AsNoTracking().SingleAsync();
            Assert.Equal(2, prepared.PreparedServings);
            (await client.PostAsJsonAsync("/api/family", new { name = "Preparation member three" })).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear(); var afterRow = await db.SupperServings.AsNoTracking().SingleAsync();
            Assert.Equal(beforeRow.InheritedServings, afterRow.InheritedServings); Assert.Equal(beforeRow.Version, afterRow.Version); Assert.Equal(2, (await db.CalendarEvents.SingleAsync()).PreparedServings);
            Assert.Equal(3, (await Read(client)).GetProperty("defaultServings").GetInt32());
        });
    }

    [Fact]
    public async Task SupperServings_MemberChangeEnlistsSemanticChangeEvenWhenStoredSnapshotAlreadyMatchesNewCount()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock());
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = CorrectionRecipe(); db.Recipes.Add(recipe); db.CalendarEvents.Add(new() { Date = Wednesday, RecipeId = recipe.Id });
        // A restored future snapshot may already equal tomorrow's new count, while today's effective usual is one.
        db.SupperServings.Add(new() { Date = Wednesday, InheritedServings = 2 }); await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12), default);
        db.ChangeTracker.Clear(); var previous = (await db.WeeklyPlans.SingleAsync()).ServingInputVersion;
        using var client = factory.CreateAuthenticatedClient(); (await client.PostAsJsonAsync("/api/family", new { name = "Matching snapshot member" })).EnsureSuccessStatusCode();
        db.ChangeTracker.Clear(); var plan = await db.WeeklyPlans.SingleAsync(); Assert.Equal("updating", plan.ServingRefreshStatus); Assert.NotEqual(previous, plan.ServingInputVersion);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_MemberMutationSerializesWithConcurrentDefaultBatch()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race = new PausedMemberInsert();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(race)));
            using var client = factory.CreateAuthenticatedClient(); var baseline = await Read(client);
            race.Enabled = true;
            var mutation = client.PostAsJsonAsync("/api/family", new { name = "Concurrent usual member" });
            try
            {
                await race.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
                var save = Put(client, baseline, 7, []);
                await Task.Delay(100); Assert.False(save.IsCompleted, "The portions writer must wait for the committed roster batch.");
                race.Release.TrySetResult(); (await mutation).EnsureSuccessStatusCode();
                Assert.Equal(HttpStatusCode.Conflict, (await save).StatusCode);
                Assert.Equal(2, (await Read(client)).GetProperty("defaultServings").GetInt32());
            }
            finally { race.Release.TrySetResult(); await mutation; }
        });
    }

    private sealed class PausedMemberInsert : DbCommandInterceptor
    {
        internal bool Enabled;
        internal readonly TaskCompletionSource Entered = new(TaskCreationOptions.RunContinuationsAsynchronously);
        internal readonly TaskCompletionSource Release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (Enabled && command.CommandText.Contains("INSERT INTO family_members", StringComparison.Ordinal))
            {
                Enabled = false; Entered.TrySetResult(); await Release.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            }
            return result;
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_AutomaticRosterFailureIsAnError_ExplicitChoiceDoesNotDependOnRosterRead()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var failure = new UnavailableFamilyCount();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(failure)));
            using var client = factory.CreateAuthenticatedClient(); failure.Enabled = true;
            Assert.Equal(HttpStatusCode.InternalServerError, (await client.GetAsync(Url)).StatusCode);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Empty(await db.FamilySettings.ToListAsync());
            db.FamilySettings.Add(new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) }); await db.SaveChangesAsync();
            var explicitChoice = await Read(client); Assert.Equal(4, explicitChoice.GetProperty("defaultServings").GetInt32()); Assert.Equal("explicit", explicitChoice.GetProperty("defaultServingsSource").GetString());
        });
    }

    private sealed class UnavailableFamilyCount : DbCommandInterceptor
    {
        internal bool Enabled;
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (Enabled && command.CommandText.Contains("FROM family_members", StringComparison.Ordinal) && command.CommandText.Contains("count(", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Test roster count unavailable");
            return ValueTask.FromResult(result);
        }
    }

    [Fact]
    public async Task SupperServings_VotingLockDoesNotInvalidateAnEditablePortionsDraft()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock());
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var evt = new CalendarEvent { Date = Wednesday, Status = CalendarEventStatus.Planned }; db.CalendarEvents.Add(evt); await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient(); var baseline = await Read(client);
        evt.Status = CalendarEventStatus.Locked; await db.SaveChangesAsync();
        Assert.Equal(baseline.GetProperty("version").GetString(), (await Read(client)).GetProperty("version").GetString());
        (await Put(client, baseline, null, [new { date = "2026-10-14", servings = 6 }], false)).EnsureSuccessStatusCode();
        Assert.Equal(6, (await Read(client)).GetProperty("days")[2].GetProperty("servings").GetInt32());
    }

}
