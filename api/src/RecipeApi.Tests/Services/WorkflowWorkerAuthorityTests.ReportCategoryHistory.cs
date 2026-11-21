using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Theory]
    [InlineData("ready")]
    [InlineData("duplicate")]
    [InlineData("missing")]
    [InlineData("other-workflow")]
    [InlineData("upper-alias")]
    [InlineData("both-aliases")]
    public Task ReportProcessorHistory_BindsOriginalReceiptWithoutClaimingTransition(string mode) =>
        CheckReportCategoryHistoryAsync(Memory(), "CompleteRecipeImportReport", mode);

    [Theory]
    [InlineData("published")]
    [InlineData("missing")]
    [InlineData("empty")]
    [InlineData("cached")]
    [InlineData("no-result")]
    [InlineData("caught-failure")]
    [InlineData("upper-alias")]
    [InlineData("both-aliases")]
    public Task CategoryProcessorHistory_BindsOriginalReceiptWithoutClaimingPublication(string mode) =>
        CheckReportCategoryHistoryAsync(Memory(), "CategorizeIngredients", mode);

    internal static async Task CheckReportCategoryHistoryAsync(Action<DbContextOptionsBuilder> configure,
        string processor, string mode)
    {
        await using var fixture = new Fixture(configure, processor);
        await using var db = fixture.CreateDb();
        var id = Guid.NewGuid();
        var isReport = processor == "CompleteRecipeImportReport";
        if (isReport || mode != "missing")
            db.Recipes.Add(new Recipe { Id = id, Name = "Original", RawMetadata = mode == "empty" ? "{}"
                : "{\"supply\":[{\"name\":\"tomato\"}]}" });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "report-category-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString() }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "observe", ProcessorName = processor, Status = TaskStatus.Pending, DependsOn = [],
            Payload = mode == "upper-alias" ? JsonSerializer.Serialize(new { RecipeId = id }) : JsonSerializer.Serialize(new { recipeId = id }),
            CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        if (mode == "both-aliases")
            task.Payload = new JsonObject { ["recipeId"] = id, ["RecipeId"] = Guid.NewGuid() }.ToJsonString();
        await TestPublicationStore.Create(db, new InMemoryStorageProvider(), fixture.Clock).CaptureLaunchAsync(parent);
        Guid? reportWorkflow = null;
        if (isReport && mode != "missing")
        {
            reportWorkflow = mode == "other-workflow" ? Guid.NewGuid() : task.InstanceId;
            db.RecipeImportReports.Add(new RecipeImportReport { RecipeId = id, Reasons = mode == "duplicate"
                ? ["duplicate", "ingredients"] : ["ingredients"], Note = "retained private report",
                Status = RecipeImportReportStatus.Reimporting, LastWorkflowInstanceId = reportWorkflow,
                LastError = "prior failure", CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow });
        }
        if (!isReport && mode == "cached")
            db.IngredientCategories.Add(new IngredientCategory { NormalizedKey = "tomato", GrocerySection = "Pantry",
                Source = "manual", CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow });
        await db.SaveChangesAsync();
        var chat = new Mock<IChatClient>(MockBehavior.Strict);
        var setup = chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(),
            It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()));
        if (mode == "caught-failure") setup.ThrowsAsync(new HttpRequestException("synthetic boundary failure"));
        else setup.ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, mode == "no-result" ? "[]"
            : "[{\"normalizedKey\":\"tomato\",\"section\":\"Produce\",\"confidence\":0.9}]")));
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            returned = isReport
                ? await new CompleteRecipeImportReportProcessor(new RecipeImportReportService(fixture.Clock, producing))
                    .ExecuteAsync(executing, default)
                : await new CategorizeIngredientsProcessor(fixture.Clock, producing, chat.Object,
                    NullLogger<CategorizeIngredientsProcessor>.Instance).ExecuteAsync(executing, default);
        };
        fixture.Result = _ => returned;
        Assert.Equal(1, await fixture.Worker.ProcessPendingTasksAsync(default));
        await using var read = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync()).Status);
        if (isReport)
        {
            var report = await read.RecipeImportReports.AsNoTracking().SingleOrDefaultAsync();
            if (mode == "missing") Assert.Null(report);
            else
            {
                Assert.Equal(reportWorkflow, report!.LastWorkflowInstanceId);
                Assert.Equal("retained private report", report.Note);
                Assert.Equal(mode == "other-workflow" ? RecipeImportReportStatus.Reimporting
                    : mode == "duplicate" ? RecipeImportReportStatus.Reported : RecipeImportReportStatus.ReadyToReview, report.Status);
                Assert.Equal(mode == "other-workflow" ? (DateTimeOffset?)null : fixture.Clock.UtcNow, report.ReimportedAt);
                Assert.Equal(mode == "other-workflow" ? "prior failure" : null, report.LastError);
            }
        }
        else
        {
            var calls = mode is "missing" or "empty" or "cached" ? 0 : 1;
            chat.Verify(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()), Times.Exactly(calls));
            var category = await read.IngredientCategories.AsNoTracking().SingleOrDefaultAsync();
            if (mode is "published" or "upper-alias" or "both-aliases" or "cached")
            {
                Assert.Equal(mode == "cached" ? "Pantry" : "Produce", category!.GrocerySection);
                Assert.Equal(mode == "cached" ? "manual" : "llm", category.Source);
            }
            else Assert.Null(category);
        }
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        var originalRequest = attempt.Request;
        // Frozen validation must not borrow a later report, dictionary or recipe.
        foreach (var report in await read.RecipeImportReports.ToArrayAsync())
        {
            report.Note = "new human report"; report.Reasons = ["steps"]; report.Status = RecipeImportReportStatus.Reported;
            report.LastWorkflowInstanceId = Guid.NewGuid(); report.LastError = "new error";
        }
        foreach (var category in await read.IngredientCategories.ToArrayAsync())
        { category.GrocerySection = "Frozen"; category.Source = "manual"; }
        foreach (var recipe in await read.Recipes.ToArrayAsync()) recipe.RawMetadata = "{}";
        await read.SaveChangesAsync();
        validate.Invoke(null, [attempt]);
        void Result(JsonNode wire, string result)
        { wire["returnedResult"] = result; wire["task"]!["result"] = result; }
        void Refuse(string result)
        {
            var wire = JsonNode.Parse(original)!; Result(wire, result);
            attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        if (isReport)
        {
            Refuse(JsonSerializer.Serialize(new { recipeId = Guid.NewGuid(), workflowInstanceId = task.InstanceId }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, workflowInstanceId = Guid.NewGuid() }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, workflowInstanceId = (string?)null }));
            Refuse(JsonSerializer.Serialize(new { recipeId = 42, workflowInstanceId = task.InstanceId }));
            Refuse($"{{\"recipeId\":\"{id}\",\"recipeId\":\"{id}\",\"workflowInstanceId\":\"{task.InstanceId}\"}}");
        }
        else
        {
            Refuse(JsonSerializer.Serialize(new { message = $"CategorizeIngredients completed for recipe {Guid.NewGuid()}." }));
            Refuse(JsonSerializer.Serialize(new { message = $"CategorizeIngredients published for recipe {id}." }));
            Refuse("{\"message\":null}"); Refuse("{\"message\":42}");
            Refuse($"{{\"message\":\"CategorizeIngredients completed for recipe {id}.\",\"message\":null}}");
        }
        Refuse("{}"); Refuse("null");
        // Unrecognized result extensions remain retained, without qualifying them.
        var extended = JsonNode.Parse(original)!;
        var receipt = JsonNode.Parse(extended["returnedResult"]!.GetValue<string>())!;
        receipt["futureObservation"] = new JsonObject { ["observed"] = null };
        Result(extended, receipt.ToJsonString());
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        // Even coherently rehashed request/outcome snapshots cannot change parent recipe association.
        var request = JsonNode.Parse(originalRequest)!;
        request["parameters"] = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid().ToString() });
        attempt.Request = request.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
        var changed = JsonNode.Parse(original)!; changed["requestHash"] = attempt.RequestHash;
        attempt.Outcome = changed.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
        attempt.Request = originalRequest; attempt.RequestHash = HistoryHash(originalRequest);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }
}
