using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task PreparedSupper_ExactRecoveryRoundTripPreservesReceiptAndReplacesDestinationMembership()
    {
        using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe=new Recipe{Name="Original pasta",Servings=2,Ingredients="[\"200 g pasta\"]",LastCookedDate=DateTimeOffset.Parse("2026-10-13T12:00:00Z")};
        db.Recipes.Add(recipe);var entry=PreparedCalendarMergeTests.Entry(recipe.Id);db.CalendarEvents.Add(entry);await db.SaveChangesAsync();
        var service=scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();var snapshot=await service.CaptureAsync(CancellationToken.None);
        db.CalendarEvents.Remove(entry);db.CalendarEvents.Add(new CalendarEvent{Id=Guid.NewGuid(),Date=new(2026,10,18),RecipeId=recipe.Id});recipe.Servings=9;await db.SaveChangesAsync();
        for(var i=0;i<2;i++){
            await service.RestoreExactAsync(snapshot.SnapshotId!.Value,CancellationToken.None);db.ChangeTracker.Clear();
            var restored=await db.CalendarEvents.SingleAsync();Assert.Equal(entry.Id,restored.Id);Assert.Equal(entry.Date,restored.Date);
            Assert.Equal(entry.PreparedOn,restored.PreparedOn);Assert.Equal(entry.PreparedAtUtc,restored.PreparedAtUtc);Assert.Equal(6,restored.PreparedServings);Assert.Equal(2,restored.PreparedOriginalServings);
            Assert.Equal(entry.PreparationPlanToken,restored.PreparationPlanToken);Assert.Equal(entry.PreparationServingVersion,restored.PreparationServingVersion);
            var original=await db.Recipes.SingleAsync();Assert.Equal(2,original.Servings);Assert.Contains("200 g",original.Ingredients);Assert.Equal(entry.PreparedAtUtc,original.LastCookedDate);
        }
    }

    [PostgresTheory]
    [InlineData("schema")]
    [InlineData("row")]
    public async Task PreparedSupper_ExactRecoveryPreflightRejectsMissingPreparationStateBeforePublication(string missing)
    {
        using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe=new Recipe{Name="Retained pasta"};db.Recipes.Add(recipe);var entry=PreparedCalendarMergeTests.Entry(recipe.Id);db.CalendarEvents.Add(entry);await db.SaveChangesAsync();
        if(missing=="schema") await db.Database.ExecuteSqlRawAsync("ALTER TABLE calendar_events DROP COLUMN prepared_servings");
        var snapshot=await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().CaptureAsync(CancellationToken.None);
        if(missing=="schema")await db.Database.ExecuteSqlRawAsync("ALTER TABLE calendar_events ADD COLUMN prepared_servings integer");
        else{
            var folder=Path.Combine(backup,snapshot.SnapshotId!.Value.ToString("N"));var path=Path.Combine(folder,"tables/calendar_events.json");
            var rows=JsonNode.Parse(await File.ReadAllTextAsync(path))!.AsArray();rows[0]!.AsObject().Remove("prepared_servings");await File.WriteAllTextAsync(path,rows.ToJsonString());
            var manifestPath=Path.Combine(folder,"manifest.json");var manifest=JsonNode.Parse(await File.ReadAllTextAsync(manifestPath))!;
            var file=manifest["files"]!.AsArray().Single(x=>x!["path"]!.GetValue<string>()=="tables/calendar_events.json")!;
            var bytes=await File.ReadAllBytesAsync(path);file["length"]=bytes.Length;file["sha256"]=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes));await File.WriteAllTextAsync(manifestPath,manifest.ToJsonString());
        }
        await db.Database.ExecuteSqlRawAsync("UPDATE calendar_events SET prepared_servings=9");
        using var client=app.CreateAuthenticatedClient();Assert.Equal(HttpStatusCode.BadRequest,(await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}",null)).StatusCode);
        db.ChangeTracker.Clear();Assert.Equal(9,(await db.CalendarEvents.SingleAsync()).PreparedServings);Assert.Equal("Retained pasta",(await db.Recipes.SingleAsync()).Name);Assert.Null(scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().Generation);
    }
}
