using RecipeApi.Infrastructure;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FlaggedIncompleteRecipe_SearchOriginalCorrectionAndReopenPreserveFeedback()
    {
        await WithEditor(async (factory, before) =>
        {
            Guid workflowId;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                (await db.Recipes.SingleAsync(recipe => recipe.Id == Id)).IsReady = false;
                await scope.ServiceProvider.GetRequiredService<RecipeRepository>().SaveInfoAsync(
                    new RecipeInfo { Id = Id, Name = "Sunday Chicken", SourceUrl = "https://example.com/incomplete" }, default);
                var workflow = new WorkflowInstance
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = "url-import",
                    Status = WorkflowStatus.Paused,
                    Parameters = JsonSerializer.Serialize(new { recipeId = Id }),
                    CreatedAt = DateTimeOffset.UtcNow
                };
                workflowId = workflow.Id;
                db.WorkflowInstances.Add(workflow);
                db.WorkflowTasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "ExtractRecipe", ProcessorName = "ExtractRecipe", Status = RecipeApi.Models.TaskStatus.Failed });
                await scope.ServiceProvider.GetRequiredService<IStorageProvider>().SaveAsync("workflows", "url-import.yaml", """
                    name: content-review
                    parameters: [recipeId, url, repairReasons, repairNote]
                    tasks:
                      - name: extract
                        processor: ExtractRecipe
                        payload: {recipeId: "{{ recipeId }}"}
                    """);
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<RecipeImportReportService>().MarkFailedAsync(Id, workflowId, "ExtractRecipe", "Missing instructions", ["steps"]);
            }
            using var client = factory.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            using var search = await client.PostAsJsonAsync("/api/recipes/search", new { query = "", filters = new { readyToReviewOnly = true } });
            Assert.Equal(HttpStatusCode.OK, search.StatusCode);
            using var found = JsonDocument.Parse(await search.Content.ReadAsStringAsync());
            Assert.Contains(found.RootElement.GetProperty("results").EnumerateArray(), result => result.GetProperty("id").GetGuid() == Id);
            var section = before.InstructionSections[0];
            var step = section.Steps[0];
            using var save = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) },
                instructionSections = new[] { new { id = section.Id, name = section.Name, steps = new[] { new { id = step.Id, text = "Stir gently and taste." } } } }
            });
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
            using var savedResponse = JsonDocument.Parse(await save.Content.ReadAsStringAsync());
            Assert.Equal("readyToReview", savedResponse.RootElement.GetProperty("recipe").GetProperty("importIssue").GetProperty("status").GetString());
            using var detail = await client.GetAsync($"/api/recipes/{Id}");
            Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
            using var json = JsonDocument.Parse(await detail.Content.ReadAsStringAsync());
            var recipeJson = json.RootElement.GetProperty("recipe");
            Assert.False(recipeJson.GetProperty("isReady").GetBoolean());
            Assert.Equal("readyToReview", recipeJson.GetProperty("importIssue").GetProperty("status").GetString());
            Assert.Equal("Stir gently and taste.", recipeJson.GetProperty("instructionSections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
            using var readback = factory.Services.CreateScope();
            var readDb = readback.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await readDb.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(before.IngredientLines.Select(line => line.Id), content.IngredientLines.Select(line => line.Id));
            Assert.Equal("250", content.IngredientLines[0].AmountText);
            Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[1], Json), JsonSerializer.Serialize(content.IngredientLines[1], Json));
            var report = await readDb.RecipeImportReports.AsNoTracking().SingleAsync(report => report.RecipeId == Id);
            Assert.Equal(["steps"], report.Reasons);
            Assert.Equal(workflowId, report.LastWorkflowInstanceId);
            Assert.Contains("cooking steps", report.Note);
            Assert.Null(report.RepairIntentId);
            // Clearing the failed capture and its deferred maintenance cannot
            // erase the accepted correction or the existing review flag.
            Assert.Equal(CaptureFailureClearResultKind.Cleared,
                (await readback.ServiceProvider.GetRequiredService<CaptureFailureService>().ClearAsync(workflowId, factory.DefaultFamilyMemberId)).Kind);
            Assert.Equal(1, (await readback.ServiceProvider.GetRequiredService<ManagementService>().ProcessMaintenanceCommandsAsync()).Skipped);
            readDb.ChangeTracker.Clear();
            Assert.Null((await readDb.Recipes.SingleAsync(recipe => recipe.Id == Id)).DeletedAt);
            Assert.Equal(["steps"], (await readDb.RecipeImportReports.SingleAsync(flag => flag.RecipeId == Id)).Reasons);
            var existingWork = await readDb.WorkflowInstances.AsNoTracking().OrderBy(instance => instance.Id).Select(instance => instance.Id).ToArrayAsync();
            using var unchanged = await client.PostAsJsonAsync($"/api/recipes/{Id}/import-report", new { reasons = new[] { "steps" }, note = report.Note });
            Assert.True(unchanged.StatusCode == HttpStatusCode.OK, await unchanged.Content.ReadAsStringAsync());
            using var unchangedJson = JsonDocument.Parse(await unchanged.Content.ReadAsStringAsync());
            Assert.False(unchangedJson.RootElement.GetProperty("reimportStarted").GetBoolean());
            Assert.Equal(existingWork, await readDb.WorkflowInstances.AsNoTracking().OrderBy(instance => instance.Id).Select(instance => instance.Id).ToArrayAsync());
            using var changed = await client.PostAsJsonAsync($"/api/recipes/{Id}/import-report", new { reasons = new[] { "steps" }, note = "Please check the original steps." });
            Assert.True(changed.StatusCode == HttpStatusCode.OK, await changed.Content.ReadAsStringAsync());
            using var changedJson = JsonDocument.Parse(await changed.Content.ReadAsStringAsync());
            Assert.True(changedJson.RootElement.GetProperty("reimportStarted").GetBoolean(), await changed.Content.ReadAsStringAsync());
            var repair = Assert.Single(await readDb.WorkflowInstances.AsNoTracking().Where(instance => !existingWork.Contains(instance.Id)).ToListAsync());
            Assert.Equal("url-import", repair.WorkflowId);
            Assert.Equal(existingWork.Length + 1, await readDb.WorkflowInstances.CountAsync());
            Assert.NotEqual(workflowId, repair.Id);
            Assert.Contains("Please check the original steps.", repair.Parameters);
            var retained = CanonicalRecipeContentStore.Read(await readDb.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id))!;
            Assert.Equal(content.ContentRevision, retained.ContentRevision);
        }, sourceUrl: "https://example.com/incomplete", realWorkflow: true);
    }
}
