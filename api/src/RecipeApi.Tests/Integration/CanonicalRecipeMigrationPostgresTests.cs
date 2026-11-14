using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalRecipeMigrationPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task NoWriteManifest_ObservesCompleteProtectedRowsAndEveryStoredOrAssignmentWeek() => WithFixture(async (services, request, root, backup) =>
    {
        var before = await DatabaseDigest(services);
        var files = FileDigest(root, backup);
        var manifest = await Capture(services, request);
        Assert.Equal(before, await DatabaseDigest(services));
        Assert.Equal(files, FileDigest(root, backup));
        Assert.Equal(new[] { new DateOnly(2024, 12, 23), new DateOnly(2025, 1, 6), new DateOnly(2026, 11, 9), new DateOnly(2027, 2, 8) }, manifest.Weeks.Select(x => x.WeekStart));
        Assert.Contains(manifest.Weeks, x => x.StoredPlanIds.Count == 1 && x.AssignmentIds.Count == 0);
        Assert.Contains(manifest.Weeks, x => x.StoredPlanIds.Count == 0 && x.AssignmentIds.Count == 1);
        await using var connection = new NpgsqlConnection(services.GetRequiredService<RecipeDbContext>().Database.GetConnectionString());
        await connection.OpenAsync();
        var count = (long)(await new NpgsqlCommand("SELECT count(*) FROM pg_tables WHERE schemaname='public'", connection).ExecuteScalarAsync())!;
        Assert.Equal(count, manifest.Tables.Count);
        Assert.Contains(manifest.Tables, x => x.Name == "calendar_events" && x.Rows.Count == 4);
        Assert.Contains(manifest.Tables, x => x.Name == "grocery_extra_occurrences" && x.Rows.Count == 3);
        Assert.Contains(manifest.Tables, x => x.Name == "household_food_overrides" && x.Rows.Count == 1);
        Assert.Contains(manifest.Tables, x => x.Name == "maintenance_commands" && x.Rows.Count == 1);
        Assert.Equal(request.SnapshotId, manifest.SourceSnapshot.SnapshotId);
        Assert.NotEmpty(manifest.SourceSnapshot.References);
        Assert.Equal(64, manifest.SourceSnapshot.ManifestSha256.Length);
        Assert.Contains(manifest.Recipes, x => x.Status == "observed-canonical" && x.IngredientCount == 2 && x.StepCount == 1 && x.BindingCount == 0);
        Assert.Contains(manifest.Recipes, x => x.Status == "requires-forward-assessment");
        Assert.Contains(manifest.Recipes, x => x.Status == "defer");
        Assert.Contains(manifest.Recipes, x => x.Status == "missing");
        var again = await Capture(services, request);
        Assert.Equal(manifest.ObservationSha256, again.ObservationSha256);
        Assert.Empty(CanonicalRecipeMigrationManifest.CompareTables(manifest.Tables, again.Tables));
        Assert.Equal(before, await DatabaseDigest(services));
        Assert.Equal(files, FileDigest(root, backup));
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task NoWriteManifest_RejectsCorruptOrHistoricalSnapshotIdentityWithoutCreatingStagesOrChangingState() => WithFixture(async (services, request, root, backup) =>
    {
        var path = Path.Combine(backup, request.SnapshotId.ToString("N"), "manifest.json");
        var original = await File.ReadAllTextAsync(path);
        var historical = System.Text.Json.Nodes.JsonNode.Parse(original)!;
        historical["version"] = 1;
        foreach (var changed in new[] { "{}", historical.ToJsonString() })
        {
            Assert.NotEqual(original, changed);
            await File.WriteAllTextAsync(path, changed);
            var before = await DatabaseDigest(services); var files = FileDigest(root, backup);
            await Assert.ThrowsAsync<InvalidDataException>(() => Capture(services, request));
            Assert.Equal(before, await DatabaseDigest(services));
            Assert.Equal(files, FileDigest(root, backup));
        }
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task NoWriteManifest_RejectsWrongSchemaAndReportsNewHumanFactsAsProtectedDifferences() => WithFixture(async (services, request, root, backup) =>
    {
        var before = await Capture(services, request);
        var database = await DatabaseDigest(services); var files = FileDigest(root, backup);
        await Assert.ThrowsAsync<InvalidDataException>(() => Capture(services, request with { SchemaSha256 = new('0', 64) }));
        Assert.Equal(database, await DatabaseDigest(services)); Assert.Equal(files, FileDigest(root, backup));
        var db = services.GetRequiredService<RecipeDbContext>();
        var cooked = await db.CalendarEvents.SingleAsync(x => x.Status == CalendarEventStatus.Cooked);
        cooked.PreparedServings = 7;
        var extra = await db.GroceryExtraOccurrences.OrderBy(x => x.WeekStartDate).FirstAsync(); extra.Name = "Newer private extra";
        await db.SaveChangesAsync();
        var changed = await Capture(services, request);
        var differences = CanonicalRecipeMigrationManifest.CompareTables(before.Tables, changed.Tables);
        Assert.Contains(differences, x => x.Table == "calendar_events" && x.Column == "prepared_servings" && x.Scope == "protected");
        Assert.Contains(differences, x => x.Table == "grocery_extra_occurrences" && x.Column == "name" && x.Scope == "protected");
        Assert.Equal(7, (await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Id == cooked.Id)).PreparedServings);
        Assert.NotEqual(before.ObservationSha256, changed.ObservationSha256);
        var canonical = Assert.Single(before.Recipes, x => x.Status == "observed-canonical");
        File.Delete(Path.Combine(root, "recipes", canonical.RecipeId.ToString("D"), "original", "0.jpg"));
        var unmatched = await Capture(services, request);
        Assert.Contains(unmatched.Recipes, x => x.RecipeId == canonical.RecipeId && x.Status == "conflict"
            && x.Reason == "declared-source-media-missing-or-ambiguous");
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SourceAdmission_ChangedProtectedFactsCannotBecomeExecutableManifest() => WithFixture(async (services, request, root, backup) =>
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var extra = await db.GroceryExtraOccurrences.FirstAsync();
        extra.Name = "Changed after protected snapshot";
        await db.SaveChangesAsync();
        var before = await DatabaseDigest(services);
        await Assert.ThrowsAsync<InvalidDataException>(() => CaptureAdmitted(services, request));
        Assert.Equal(before, await DatabaseDigest(services));
    });

    private static Task<CanonicalMigrationInventory> CaptureAdmitted(IServiceProvider services, CanonicalMigrationRequest request) =>
        Capture(services, request, admitted: true);

    private async Task WithFixture(Func<IServiceProvider, CanonicalMigrationRequest, string, string, Task> check, bool unrepresentable = false, bool canonicalShadowMismatch = false) =>
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var directory = Path.Combine(Path.GetTempPath(), "wfs-migration-observation-" + Guid.NewGuid().ToString("N"));
            var live = Path.Combine(directory, "live"); var backup = Path.Combine(directory, "backup");
            try
            {
                await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(clock: new MigrationClock(), configurationOverrides: new()
                { ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true",
                    ["DataRoot"] = Path.Combine(live, "data"), ["RecipesRoot"] = Path.Combine(live, "recipes"), ["Recovery:BackupRoot"] = backup });
                using var scope = factory.Services.CreateScope(); var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>(); var at = DateTimeOffset.Parse("2026-11-13T16:00:00Z");
                var known = new Recipe { Name = "Retained exact original", Servings = null, ImageCount = 1, Ingredients = "[\"⅓ cup flour\",\"salt\"]",
                    RawMetadata = "{\"recipeIngredient\":[\"⅓ cup flour\",\"salt\"],\"recipeInstructions\":[{\"name\":\"Mix\",\"itemListElement\":[{\"text\":\"Mix flour.\"}]}]}" };
                var legacy = new Recipe { Name = "Legacy usable", Ingredients = "[\"⅓ cup flour\"]", RawMetadata = "{\"recipeIngredient\":[\"⅓ cup flour\"],\"supply\":[{\"name\":\"flour\",\"quantity\":0.33,\"unitText\":\"cup\"}],\"recipeInstructions\":[\"Mix flour.\"]}", Servings = 4 };
                var retired = new Recipe { Name = "Retained retired", Ingredients = "[]", DeletedAt = at, DeleteNote = "Preserve membership" };
                if (unrepresentable) legacy.RawMetadata = "{\"recipeInstructions\":[4]}";
                db.Recipes.AddRange(known, legacy, retired); await db.SaveChangesAsync();
                await services.GetRequiredService<IStorageProvider>().SaveAsync("recipes", known.Id.ToString("D") + "/original/0.jpg", new byte[] { 1, 2, 3 });
                await services.GetRequiredService<IStorageProvider>().SaveAsync("recipes", known.Id.ToString("D") + "/hero.webp", new byte[] { 4, 5, 6 });
                var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
                await vocabulary.PublishReviewedAsync(await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json")), null, Guid.NewGuid(), "test-review:migration-observation");
                var converter = services.GetRequiredService<CanonicalRecipeContentStore>();
                await converter.ConvertAsync(known.Id, CanonicalRecipeContentStore.InspectContentRevision(known), CanonicalRecipeContentStore.InspectSourceRevision(known), Guid.NewGuid());
                if (canonicalShadowMismatch)
                {
                    await using var connection = new NpgsqlConnection(db.Database.GetConnectionString()); await connection.OpenAsync();
                    await using var transaction = await connection.BeginTransactionAsync();
                    await new NpgsqlCommand("SET LOCAL session_replication_role=replica", connection, transaction).ExecuteNonQueryAsync();
                    await using var clear = new NpgsqlCommand("UPDATE recipes SET ingredients=NULL WHERE id=@id", connection, transaction);
                    clear.Parameters.AddWithValue("id", known.Id); await clear.ExecuteNonQueryAsync(); await transaction.CommitAsync();
                    db.ChangeTracker.Clear();
                }
                db.WeeklyPlans.AddRange(new WeeklyPlan { WeekStartDate = new(2025, 1, 6), Status = WeeklyPlanStatus.Locked,
                    GroceryState = "{\"legacy flour\":true}", GroceryCheckedDemandBaselines = "{\"legacy flour\":null}" },
                    new WeeklyPlan { WeekStartDate = new(2026, 11, 9), Status = WeeklyPlanStatus.VotingOpen, VotingRoundId = Guid.NewGuid() });
                db.CalendarEvents.AddRange(
                    new CalendarEvent { Id = Guid.NewGuid(), Date = new(2024, 12, 29), RecipeId = known.Id, Status = CalendarEventStatus.Cooked,
                        PreparedOn = new(2024, 12, 28), PreparedAtUtc = at, PreparedServings = 6, PreparedOriginalServings = 4,
                        PreparationPlanToken = "retained-plan", PreparationServingVersion = "retained-serving", VoteCount = 2, CandidateIds = [known.Id, legacy.Id] },
                    new CalendarEvent { Id = Guid.NewGuid(), Date = new(2026, 11, 15), RecipeId = known.Id, Status = CalendarEventStatus.Skipped },
                    new CalendarEvent { Id = Guid.NewGuid(), Date = new(2027, 2, 10), RecipeId = legacy.Id, Status = CalendarEventStatus.Locked },
                    new CalendarEvent { Id = Guid.NewGuid(), Date = new(2028, 1, 1), Status = CalendarEventStatus.Skipped, NonCookingKind = "custom", NonCookingLabel = "Preserved away" });
                db.SupperServings.Add(new SupperServing { Date = new(2026, 11, 15), OverrideServings = 4, InheritedServings = 2, CreatedAt = at, UpdatedAt = at });
                var first = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2025, 1, 6), "Coffee", "coffee", "Grocery", at);
                first.Checked = true; first.RemovedAt = at;
                var recurring = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 11, 9), "Tea", "tea", "Grocery", at);
                db.GroceryExtraOccurrences.AddRange(first, recurring,
                    GroceryExtraOccurrence.Create(Guid.NewGuid(), recurring.LineageId, new(2026, 11, 16), "Tea", "tea", "Grocery", at, recurring.Id));
                db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "opaque.retained-clear", FallbackKey = "salt",
                    ProtectedFields = ["shoppingName"], PresentationSequence = "1", CreatedAt = at, UpdatedAt = at });
                db.MaintenanceCommands.Add(new MaintenanceCommand { CommandType = "inert-observation-fixture", Status = "completed",
                    Payload = "{\"clear\":null,\"id\":\"09000000-0000-4000-8000-00000000000A\"}", Result = "{}", CreatedAt = at, CompletedAt = at });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 11, 9), default);
                var checkedPlan = await db.WeeklyPlans.SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 11, 9));
                var checkedRows = JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(checkedPlan.GroceryItems)!;
                var display = await services.GetRequiredService<GroceryPresentationService>().DecorateAsync(new RecipeApi.Dto.GroceryMutationResult(at,
                    checkedPlan.WeekStartDate, checkedPlan.GroceryListVersion, JsonSerializer.Deserialize<Dictionary<string, bool>>(checkedPlan.GroceryState)!, checkedRows));
                await services.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0, new RecipeApi.Dto.GroceryItemMutationDto(
                    Guid.Parse(checkedRows[0].RowId!), checkedPlan.WeekStartDate, checkedRows[0].RowVersion, true, Guid.NewGuid(), display.PresentationEpoch), reference: checkedPlan.WeekStartDate);
                var snapshot = await services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
                using var manifest = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(backup, snapshot.SnapshotId!.Value.ToString("N"), "manifest.json")));
                Assert.Equal(3, manifest.RootElement.GetProperty("version").GetInt32());
                var request = new CanonicalMigrationRequest(Guid.NewGuid(), new('c', 64), await SchemaSha256(services),
                    "canonical-v2/food-policy-1", snapshot.SnapshotId.Value,
                    new[] { known.Id, legacy.Id, retired.Id, Guid.NewGuid() }.Select(id => new CanonicalMigrationSelection(id, Guid.NewGuid())).ToArray());
                await check(services, request, live, backup);
            }
            finally { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
        });

    private static Task<CanonicalMigrationInventory> Capture(IServiceProvider services, CanonicalMigrationRequest request, bool admitted = false) =>
        (Task<CanonicalMigrationInventory>)typeof(CanonicalRecipeContentStore).GetMethod(admitted ? "CaptureMigrationManifestAsync" : "ObserveMigrationManifestAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(services.GetRequiredService<CanonicalRecipeContentStore>(), [request, services.GetRequiredService<RecoverySnapshotService>(),
                services.GetRequiredService<RecoveryBoundary>(), services.GetRequiredService<RecipesRootResolver>(), CancellationToken.None])!;

    private static string FileDigest(params string[] roots) => string.Join("\n", roots.SelectMany(root => Directory.Exists(root)
        ? Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Select(path => path + ":" + Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))) : []).Order(StringComparer.Ordinal));

    private static async Task<string> DatabaseDigest(IServiceProvider services)
    {
        await using var connection = new NpgsqlConnection(services.GetRequiredService<RecipeDbContext>().Database.GetConnectionString());
        await connection.OpenAsync();
        var tables = new List<string>();
        await using (var reader = await new NpgsqlCommand("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", connection).ExecuteReaderAsync())
            while (await reader.ReadAsync()) tables.Add(reader.GetString(0));
        var text = new StringBuilder();
        foreach (var table in tables)
        {
            var quoted = new NpgsqlCommandBuilder().QuoteIdentifier(table);
            var json = (string)(await new NpgsqlCommand("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM public." + quoted + " t", connection).ExecuteScalarAsync())!;
            text.Append(table).Append(':').Append(json).Append('\n');
        }
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text.ToString())));
    }

    private static async Task<string> SchemaSha256(IServiceProvider services)
    {
        await using var connection = new NpgsqlConnection(services.GetRequiredService<RecipeDbContext>().Database.GetConnectionString());
        await connection.OpenAsync();
        var names = new List<string>();
        await using (var reader = await new NpgsqlCommand("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", connection).ExecuteReaderAsync())
            while (await reader.ReadAsync()) names.Add(reader.GetString(0));
        return (await (Task<string>)typeof(RecoverySnapshotService).GetMethod("SchemaAsync", BindingFlags.Static | BindingFlags.NonPublic)!
            .Invoke(null, [connection, CancellationToken.None, names.ToArray()])!).ToLowerInvariant();
    }
}
