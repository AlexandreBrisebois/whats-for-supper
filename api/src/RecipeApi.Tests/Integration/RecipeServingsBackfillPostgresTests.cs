using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public class RecipeServingsBackfillPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TriggerAndRepeatBackfill_PreserveKnownUnknownDeletedAndOriginalContent()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:RealWorkflowOrchestrator"] = "true",
            });
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var storage = scope.ServiceProvider.GetRequiredService<IStorageProvider>();
            await storage.SaveAsync("workflows", "recipe-servings-backfill.yaml", await File.ReadAllTextAsync(Path.Combine(TomorrowPushPostgresTests.Root(), "api/src/RecipeApi/Workflows/recipe-servings-backfill.yaml")));
            var rows = new[] {
                Row(1, "2 portions"), Row(2, "2 portions"), Row(3, "4 portions"),
                Row(4, "2 or 4 portions"), Row(5, "2–4 servings"), Row(6, "12 muffins"),
                Row(7, "0 servings"), Row(8, "-1 portion"), Row(9, "1.5 portions"), Row(10, "2147483648 servings"),
                Row(11, "2 portions"), Row(12, "4 portions"), Row(13, "4 portions"),
            };
            rows[0].Ingredients = "[\"360 g chicken\",\"500 g potatoes\"]";
            rows[1].Ingredients = "[\"2 chicken breasts\",\"225 g Brussels sprouts\"]";
            rows[2].Ingredients = "[\"510 g beef\",\"340 g pasta\"]";
            rows[10].Servings = 7; rows[11].DeletedAt = DateTimeOffset.UtcNow;
            rows[12].RawMetadata = "{\"recipeYield\":2}";
            db.Recipes.AddRange(rows); await db.SaveChangesAsync();
            var before = (await db.Recipes.IgnoreQueryFilters().AsNoTracking().ToListAsync()).ToDictionary(r => r.Id, r => (r.RawMetadata, r.Ingredients));
            using var client = factory.CreateAuthenticatedClient();
            for (var repeat = 0; repeat < 2; repeat++) {
                var response = await client.PostAsJsonAsync("/api/workflows/recipe-servings-backfill/trigger", new { parameters = new { } });
                Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
                var task = await db.WorkflowTasks.OrderByDescending(t => t.CreatedAt).FirstAsync();
                var processor = new BackfillRecipeServingsProcessor(db, scope.ServiceProvider.GetRequiredService<IWorkflowOrchestrator>(), new SystemClock());
                Assert.Equal(processor.ProcessorName, task.ProcessorName);
                await processor.ExecuteAsync(task, CancellationToken.None);
                db.ChangeTracker.Clear();
                var saved = await db.Recipes.IgnoreQueryFilters().OrderBy(r => r.Id).ToListAsync();
                Assert.Equal(new int?[] { 2, 2, 4, null, null, null, null, null, null, null, 7, 4, null }, saved.Select(r => r.Servings));
                foreach (var row in saved) Assert.Equal(before[row.Id], (row.RawMetadata, row.Ingredients));
                Assert.All(await db.WorkflowTasks.ToListAsync(), t => Assert.Equal("BackfillRecipeServings", t.ProcessorName));
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task InterruptedBoundedBackfill_ResumesCommittedProgressAndQueuesKeysetContinuation()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            using var cancellation = new CancellationTokenSource();
            var faults = new UpdateFaults { After = () => cancellation.Cancel() };
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(faults).Options);
            db.Recipes.AddRange(Enumerable.Range(1, 30).Select(i => Row(i, "2 portions"))); await db.SaveChangesAsync();
            var queued = new Queue<WorkflowTask>();
            var orchestrator = new Mock<IWorkflowOrchestrator>(MockBehavior.Strict);
            orchestrator.Setup(o => o.TriggerAsync("recipe-servings-backfill", It.IsAny<Dictionary<string, string>>(), null))
                .Returns((string _, Dictionary<string, string> parameters, DateTimeOffset? _) => {
                    queued.Enqueue(new WorkflowTask { Payload = System.Text.Json.JsonSerializer.Serialize(parameters) });
                    return Task.FromResult(new WorkflowInstance());
                });
            var processor = new BackfillRecipeServingsProcessor(db, orchestrator.Object, new SystemClock());
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => processor.ExecuteAsync(new WorkflowTask(), cancellation.Token));
            Assert.Equal(1, await db.Recipes.CountAsync(r => r.Servings == 2));
            faults.After = null;
            queued.Enqueue(new WorkflowTask());
            var batches = 0;
            while (queued.TryDequeue(out var task)) { await processor.ExecuteAsync(task, CancellationToken.None); Assert.True(++batches <= 3); }
            Assert.Equal(2, batches);
            Assert.Equal(30, await db.Recipes.CountAsync(r => r.Servings == 2));
            orchestrator.Verify(o => o.TriggerAsync("recipe-servings-backfill", It.IsAny<Dictionary<string, string>>(), null), Times.Once);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ConcurrentSourceAndKnownCountChanges_RejectStaleProjection()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var faults = new UpdateFaults();
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(faults).Options);
            db.Recipes.AddRange(Row(1, "2 portions"), Row(2, "2 portions")); await db.SaveChangesAsync();
            var updates = 0;
            faults.Before = async () => {
                await using var other = new NpgsqlConnection(settings.ConnectionString); await other.OpenAsync();
                var sql = ++updates == 1
                    ? "UPDATE recipes SET raw_metadata='{\"recipeYield\":\"unknown\"}' WHERE id='00000000-0000-0000-0000-000000000001'"
                    : "UPDATE recipes SET servings=7 WHERE id='00000000-0000-0000-0000-000000000002'";
                await new NpgsqlCommand(sql, other).ExecuteNonQueryAsync();
            };
            await new BackfillRecipeServingsProcessor(db, Mock.Of<IWorkflowOrchestrator>(), new SystemClock()).ExecuteAsync(new WorkflowTask(), CancellationToken.None);
            db.ChangeTracker.Clear();
            var saved = await db.Recipes.OrderBy(r => r.Id).ToListAsync();
            Assert.Equal(2, updates);
            Assert.Null(saved[0].Servings); Assert.Contains("unknown", saved[0].RawMetadata);
            Assert.Equal(7, saved[1].Servings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ConcurrentManualHttpCorrection_IsNotReplacedByBackfill()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() { ["Tests:PostgresConnectionString"] = settings.ConnectionString });
            var faults = new UpdateFaults();
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(faults).Options);
            var recipe = Row(1, "4 portions"); db.Recipes.Add(recipe); await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            faults.Before = async () => {
                var response = await client.PatchAsync($"/api/recipes/{recipe.Id}", new StringContent("{\"servings\":3}", System.Text.Encoding.UTF8, "application/json"));
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            };
            await new BackfillRecipeServingsProcessor(db, Mock.Of<IWorkflowOrchestrator>(), new SystemClock()).ExecuteAsync(new WorkflowTask(), CancellationToken.None);
            db.ChangeTracker.Clear(); var saved = await db.Recipes.SingleAsync();
            Assert.Equal(3, saved.Servings); Assert.True(System.Text.Json.JsonElement.DeepEquals(System.Text.Json.JsonDocument.Parse(recipe.RawMetadata!).RootElement, System.Text.Json.JsonDocument.Parse(saved.RawMetadata!).RootElement)); Assert.Equal(RecipeService.DeserializeIngredients(recipe.Ingredients), RecipeService.DeserializeIngredients(saved.Ingredients));
        });
    }

    private static Recipe Row(int i, string yield) => new() {
        Id = Guid.Parse($"00000000-0000-0000-0000-{i:D12}"), Name = "Synthetic fixture", Ingredients = "[\"340 g pasta\"]",
        RawMetadata = System.Text.Json.JsonSerializer.Serialize(new { recipeYield = yield }),
    };

    private sealed class UpdateFaults : DbCommandInterceptor
    {
        public Func<Task>? Before { get; set; }
        public Action? After { get; set; }
        private static bool IsProjection(DbCommand command) => command.CommandText.StartsWith("UPDATE recipes", StringComparison.Ordinal);
        public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (IsProjection(command) && Before is not null) await Before();
            return result;
        }
        public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
        {
            if (IsProjection(command)) After?.Invoke();
            return ValueTask.FromResult(result);
        }
    }
}
