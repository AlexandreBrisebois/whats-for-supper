using System.Text.Json;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CanonicalRecipeMigrationManifestTests
{
    private const string Id = "09000000-0000-4000-8000-000000000001";
    private static JsonElement Rows(string json) => JsonSerializer.Deserialize<JsonElement>(json);
    private static CanonicalMigrationTable Table(string name, string json) => CanonicalRecipeMigrationManifest.ObserveTable(name, ["id"], Rows(json));

    [Theory]
    [InlineData("status")]
    [InlineData("date")]
    [InlineData("recipe_id")]
    [InlineData("meal_slot")]
    [InlineData("prepared_servings")]
    [InlineData("prepared_original_servings")]
    [InlineData("prepared_at_utc")]
    [InlineData("preparation_plan_token")]
    [InlineData("preparation_serving_version")]
    [InlineData("candidate_ids")]
    [InlineData("non_cooking_label")]
    public void ProtectedCalendarFacts_CannotBeHiddenByUnchangedCountsOrIdentity(string field)
    {
        var before = Table("calendar_events", "[{\"id\":\"" + Id + "\",\"" + field + "\":null}]");
        var after = Table("calendar_events", "[{\"id\":\"" + Id + "\",\"" + field + "\":\"changed\"}]");
        var difference = Assert.Single(CanonicalRecipeMigrationManifest.CompareTables([before], [after]));
        Assert.Equal(("protected", "calendar_events", field), (difference.Scope, difference.Table, difference.Column));
    }

    [Theory]
    [InlineData("recipes")]
    [InlineData("supper_servings")]
    [InlineData("grocery_extra_occurrences")]
    [InlineData("household_food_overrides")]
    [InlineData("ingredient_categories")]
    [InlineData("workflow_lifecycle_records")]
    [InlineData("canonical_recipe_operations")]
    [InlineData("recipe_file_publications")]
    public void CompleteProtectedRows_RetainNullClearsSourceNotationBasisAndHistory(string table)
    {
        var before = Table(table, "[{\"id\":\"" + Id + "\",\"facts\":{\"amount\":null,\"amountText\":\"⅓–½\",\"basis\":null,\"sourceRef\":null,\"protectedFields\":[\"amount\"]}}]");
        var after = Table(table, "[{\"id\":\"" + Id + "\",\"facts\":{\"amount\":{\"n\":\"1\",\"d\":\"3\"},\"amountText\":\"⅓–½\",\"basis\":null,\"sourceRef\":null,\"protectedFields\":[\"amount\"]}}]");
        Assert.Equal("protected", Assert.Single(CanonicalRecipeMigrationManifest.CompareTables([before], [after])).Scope);
    }

    [Fact]
    public void GroceryDerivedColumns_AreClassifiedExplicitlyAndNeverHideOtherWeeklyPlanChanges()
    {
        foreach (var field in CanonicalRecipeMigrationManifest.GroceryDerivedColumns)
        {
            var before = Table("weekly_plans", "[{\"id\":\"" + Id + "\",\"" + field + "\":null}]");
            var after = Table("weekly_plans", "[{\"id\":\"" + Id + "\",\"" + field + "\":\"changed\"}]");
            Assert.Equal("grocery-derived", Assert.Single(CanonicalRecipeMigrationManifest.CompareTables([before], [after])).Scope);
        }
        foreach (var field in new[] { "status", "voting_round_id", "last_closed_round_id", "requires_round_identity", "notified_at", "created_at", "future_unknown_column" })
        {
            var before = Table("weekly_plans", "[{\"id\":\"" + Id + "\",\"" + field + "\":null}]");
            var after = Table("weekly_plans", "[{\"id\":\"" + Id + "\",\"" + field + "\":\"changed\"}]");
            Assert.Equal("protected", Assert.Single(CanonicalRecipeMigrationManifest.CompareTables([before], [after])).Scope);
        }
    }

    [Fact]
    public void CompleteWeekUnion_IncludesStoredOnlyAndEveryAssignmentStatusWithoutUsingToday()
    {
        var plans = Rows("[{\"id\":\"" + Id + "\",\"week_start_date\":\"2025-01-06\"}]");
        var events = Rows("""
        [
          {"id":"09000000-0000-4000-8000-000000000002","date":"2024-12-29","recipe_id":"09000000-0000-4000-8000-000000000010","status":2},
          {"id":"09000000-0000-4000-8000-000000000003","date":"2026-11-15","recipe_id":"09000000-0000-4000-8000-000000000010","status":3},
          {"id":"09000000-0000-4000-8000-000000000004","date":"2026-11-09","recipe_id":"09000000-0000-4000-8000-000000000010","status":4},
          {"id":"09000000-0000-4000-8000-000000000005","date":"2027-01-01","recipe_id":null,"status":3}
        ]
        """);
        var weeks = CanonicalRecipeMigrationManifest.ObserveWeeks(plans, events);
        Assert.Equal(new[] { new DateOnly(2024, 12, 23), new DateOnly(2025, 1, 6), new DateOnly(2026, 11, 9) }, weeks.Select(x => x.WeekStart));
        Assert.Equal(Guid.Parse(Id), Assert.Single(weeks[1].StoredPlanIds));
        Assert.Empty(weeks[1].AssignmentIds);
        Assert.Equal(2, weeks[2].AssignmentIds.Count);
        Assert.Empty(weeks[2].StoredPlanIds);
    }

    [Fact]
    public void InventoryRejectsDuplicateOrMissingStableKeysAndPreservesMissingVersusNull()
    {
        Assert.Throws<InvalidDataException>(() => Table("calendar_events", "[{\"id\":\"" + Id + "\"},{\"id\":\"" + Id + "\"}]"));
        Assert.Throws<InvalidDataException>(() => Table("calendar_events", "[{\"status\":0}]"));
        var before = Table("recipes", "[{\"id\":\"" + Id + "\",\"clear\":null}]");
        var after = Table("recipes", "[{\"id\":\"" + Id + "\"}]");
        Assert.Equal("clear", Assert.Single(CanonicalRecipeMigrationManifest.CompareTables([before], [after])).Column);
        Assert.Equal("membership", Assert.Single(CanonicalRecipeMigrationManifest.CompareTables([before], [Table("recipes", "[]")])).Scope);
    }

    [Fact]
    public void RowOrderingAndJsonPropertyOrdering_DoNotChangeAnExactObservation()
    {
        var first = Table("recipes", "[{\"id\":\"" + Id + "\",\"facts\":{\"a\":null,\"b\":\"½\"}}]");
        var second = Table("recipes", "[{\"facts\":{\"b\":\"½\",\"a\":null},\"id\":\"" + Id + "\"}]");
        Assert.Equal(first.Sha256, second.Sha256);
        Assert.Empty(CanonicalRecipeMigrationManifest.CompareTables([first], [second]));
    }

    [Fact]
    public void SelectedOperationRequest_IsExactAndDoesNotAllocateOrRetainMutableCallerCollections()
    {
        var selected = new List<CanonicalMigrationSelection> { new(Guid.Parse(Id), Guid.NewGuid()) };
        var request = new CanonicalMigrationRequest(Guid.NewGuid(), new string('a', 64), new string('b', 64), "canonical-v2/food-policy-1", Guid.NewGuid(), selected);
        var frozen = CanonicalRecipeMigrationManifest.FreezeRequest(request);
        selected.Clear();
        Assert.Single(frozen.Selected);
        Assert.Equal(request.OperationId, frozen.OperationId);
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.FreezeRequest(frozen with { OperationId = Guid.Empty }));
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.FreezeRequest(frozen with { CandidateSha256 = "candidate-not-a-hash" }));
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.FreezeRequest(frozen with { Selected = [frozen.Selected[0], frozen.Selected[0]] }));
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.FreezeRequest(frozen with { Selected = [frozen.Selected[0], new(Guid.NewGuid(), frozen.Selected[0].OperationId)] }));
    }

    [Fact]
    public void WeekInventoryRejectsNonMondayStoredWeekDuplicateEventsAndMissingRecipeObservation()
    {
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.ObserveWeeks(
            Rows("[{\"id\":\"" + Id + "\",\"week_start_date\":\"2026-11-10\"}]"), Rows("[]")));
        var item = "{\"id\":\"" + Id + "\",\"date\":\"2026-11-10\",\"recipe_id\":null}";
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.ObserveWeeks(Rows("[]"), Rows("[" + item + "," + item + "]")));
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeMigrationManifest.ObserveWeeks(Rows("[]"), Rows("[{\"id\":\"" + Id + "\",\"date\":\"2026-11-10\"}]")));
    }
}
