using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task ExactSnapshot_RetainsCheckedDemandBaselineAndItsRowAssociation()
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        const string id = "05000000-0000-4000-8000-000000000001";
        var baseline = JsonSerializer.Serialize(new Dictionary<string, object> { [id] = new { Quantity = new { kind = "range", min = new { n = "2", d = "1" }, max = new { n = "3", d = "1" } }, QuantityComplete = true, Unit = "g", DemandIdentity = "pasta:g", AcknowledgedAtRowVersion = "2" } });
        var plan = new WeeklyPlan { WeekStartDate = new(2026, 10, 5), GroceryCheckedDemandBaselines = baseline, GroceryState = JsonSerializer.Serialize(new Dictionary<string, bool> { [id] = true }), GroceryListVersion = "4" };
        var evidence = JsonSerializer.Serialize(new Dictionary<string, object> { [id] = new { InputFingerprint = new string('A', 64), Members = new[] { "recorded-occurrence:recorded-recipe:pasta" } } });
        plan.GroceryDemandEvidence = evidence;
        plan.GroceryItems = JsonSerializer.Serialize(new[] { new GroceryLineItemDto("pasta", "pasta", "Pantry", null, "g", [], true)
        {
            RowId = id, RowVersion = "3", WeekStartDate = plan.WeekStartDate, DemandIdentity = "pasta:g",
            ExactQuantity = new("range", Min: new("3", "1"), Max: new("4", "1")),
        } });
        db.WeeklyPlans.Add(plan);
        await db.SaveChangesAsync();
        var snapshot = await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
        Assert.NotNull(snapshot.SnapshotId);
        plan.GroceryCheckedDemandBaselines = "{}"; plan.GroceryState = "{}";
        plan.GroceryDemandEvidence = "{}";
        await db.SaveChangesAsync();
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null)).StatusCode);
        db.ChangeTracker.Clear();
        var restored = await db.WeeklyPlans.SingleAsync();
        Assert.True(JsonElement.DeepEquals(JsonDocument.Parse(baseline).RootElement, JsonDocument.Parse(restored.GroceryCheckedDemandBaselines).RootElement));
        Assert.True(JsonElement.DeepEquals(JsonDocument.Parse(evidence).RootElement, JsonDocument.Parse(restored.GroceryDemandEvidence).RootElement));
        Assert.True(JsonDocument.Parse(restored.GroceryState).RootElement.GetProperty(id).GetBoolean());
        Assert.Equal("4", restored.GroceryListVersion);
        var row = Assert.Single(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(restored.GroceryItems)!);
        Assert.Equal(id, row.RowId);
        Assert.Equal("3", row.ExactQuantity!.Min!.N);
    }
}
