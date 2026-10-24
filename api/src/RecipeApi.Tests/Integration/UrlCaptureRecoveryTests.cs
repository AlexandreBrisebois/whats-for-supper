using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Npgsql;
using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace RecipeApi.Tests.Integration;

public class UrlCaptureRecoveryTests
{
    [Fact]
    public async Task Saved_url_with_unavailable_workflow_is_recoverable_after_reload()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:RealWorkflowOrchestrator"] = "true",
            ["Tests:LocalRecipeStore"] = "true"
        });
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var accepted = await client.PostAsJsonAsync("/api/recipes/capture-url", new { url = "https://example.com/supper", notes = "less salt", rating = 2 });
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        using var json = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(r => r.Id == id);
        Assert.False(recipe.IsReady);
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        Assert.Equal("https://example.com/supper", (await store.ReadInfoAsync(id))!.SourceUrl);
        var failures = await client.GetStringAsync("/api/captures/failures");
        Assert.Contains(id.ToString(), failures);
        Assert.Contains("saved", failures, StringComparison.OrdinalIgnoreCase);
        var instance = await db.WorkflowInstances.SingleAsync();
        using var failedRetry = await client.PostAsync($"/api/captures/failures/{instance.Id}/retry", null);
        Assert.Equal(HttpStatusCode.InternalServerError, failedRetry.StatusCode);
        Assert.Contains(id.ToString(), await client.GetStringAsync("/api/captures/failures"));
        await scope.ServiceProvider.GetRequiredService<IStorageProvider>().SaveAsync("workflows", "url-import.yaml", "name: url-import\nparameters: [recipeId, url]\ntasks: []");
        using var emptyRetry = await client.PostAsync($"/api/captures/failures/{instance.Id}/retry", null);
        Assert.Equal(HttpStatusCode.InternalServerError, emptyRetry.StatusCode);
        Assert.Contains(id.ToString(), await client.GetStringAsync("/api/captures/failures"));
        await WriteWorkflowAsync(scope.ServiceProvider);
        using var retry = await client.PostAsync($"/api/captures/failures/{instance.Id}/retry", null);
        Assert.Equal(HttpStatusCode.Accepted, retry.StatusCode);
        Assert.DoesNotContain(id.ToString(), await client.GetStringAsync("/api/captures/failures"));
        db.ChangeTracker.Clear();
        var initialized = await db.WorkflowInstances.Include(w => w.Tasks).SingleAsync();
        Assert.Equal(instance.Id, initialized.Id);
        Assert.Equal(2, initialized.Tasks.Count);
        Assert.Single(await db.Recipes.ToListAsync());
        Assert.False((await db.Recipes.SingleAsync()).IsReady);
    }

    [Fact]
    public async Task Successful_url_intake_initializes_background_tasks_without_marking_recipe_ready()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:RealWorkflowOrchestrator"] = "true", ["Tests:LocalRecipeStore"] = "true"
        });
        using var scope = factory.Services.CreateScope();
        await WriteWorkflowAsync(scope.ServiceProvider);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var response = await client.PostAsJsonAsync("/api/recipes/capture-url", new { url = "https://example.com/ready-to-import" });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var workflow = await db.WorkflowInstances.Include(w => w.Tasks).SingleAsync();
        Assert.Equal(RecipeApi.Models.WorkflowStatus.Pending, workflow.Status);
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, workflow.Tasks.Single(t => t.TaskName == "acquire").Status);
        Assert.Equal(RecipeApi.Models.TaskStatus.Waiting, workflow.Tasks.Single(t => t.TaskName == "extract").Status);
        Assert.False((await db.Recipes.SingleAsync()).IsReady);
        Assert.Empty((await scope.ServiceProvider.GetRequiredService<CaptureFailureService>().GetActiveFailuresAsync()));
    }

    internal static Task WriteWorkflowAsync(IServiceProvider services) =>
        services.GetRequiredService<IStorageProvider>().SaveAsync("workflows", "url-import.yaml", """
            name: url-import
            parameters: [recipeId, url]
            tasks:
              - name: acquire
                processor: WebAcquisition
                payload: { recipeId: "{{recipeId}}", url: "{{url}}" }
              - name: extract
                processor: ExtractRecipe
                depends_on: [acquire]
                payload: { recipeId: "{{recipeId}}" }
            """);
}

public sealed class UrlCaptureRecoveryPostgresTests
{
    [PostgresFact]
    public async Task Real_database_storage_and_orchestrator_reconcile_failures_concurrency_and_uncertain_commit()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_url_capture_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            var root = new DirectoryInfo(AppContext.BaseDirectory);
            while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
            await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "api", "database", "schema.sql")), connection).ExecuteNonQueryAsync();
            await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                ["Tests:RealWorkflowOrchestrator"] = "true", ["Tests:LocalRecipeStore"] = "true"
            });
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            using var accepted = await client.PostAsJsonAsync("/api/recipes/capture-url", new { url = "https://example.com/supper", notes = "less salt", rating = 2 });
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
            using var json = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
            var recipeId = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.True(db.Database.IsNpgsql());
            var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
            Assert.IsType<LocalRecipeStore>(store);
            Assert.Equal("less salt", (await store.ReadInfoAsync(recipeId))!.Notes);
            var workflowId = (await db.WorkflowInstances.SingleAsync()).Id;
            Assert.Contains("was saved", await client.GetStringAsync("/api/captures/failures"));
            await UrlCaptureRecoveryTests.WriteWorkflowAsync(scope.ServiceProvider);

            // A genuine relational write rejection must roll back graph replacement, retaining recovery.
            await new NpgsqlCommand("""
                CREATE FUNCTION reject_url_task() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
                  IF NEW.task_name = 'acquire' THEN RAISE EXCEPTION 'injected task persistence failure'; END IF;
                  RETURN NEW; END $$;
                CREATE TRIGGER reject_url_task BEFORE INSERT ON workflow_tasks FOR EACH ROW EXECUTE FUNCTION reject_url_task();
                """, connection).ExecuteNonQueryAsync();
            using var rejected = await client.PostAsync($"/api/captures/failures/{workflowId}/retry", null);
            Assert.Equal(HttpStatusCode.InternalServerError, rejected.StatusCode);
            Assert.Contains(recipeId.ToString(), await client.GetStringAsync("/api/captures/failures"));
            db.ChangeTracker.Clear();
            Assert.Single((await db.WorkflowInstances.Include(w => w.Tasks).SingleAsync()).Tasks);
            await new NpgsqlCommand("DROP TRIGGER reject_url_task ON workflow_tasks; DROP FUNCTION reject_url_task();", connection).ExecuteNonQueryAsync();

            // The server commits, then the caller loses the acknowledgement. Reread must prevent replay.
            var fault = new LostCommitAcknowledgement();
            await using (var uncertainDb = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(settings.ConnectionString).AddInterceptors(fault).Options))
            {
                var orchestrator = new WorkflowOrchestrator(new RecipeApi.Services.SystemClock(),
                    new WorkflowRepository(scope.ServiceProvider.GetRequiredService<IStorageProvider>()), uncertainDb);
                await Assert.ThrowsAsync<IOException>(() => orchestrator.InitializeUrlCaptureAsync(workflowId));
                var reconciled = await orchestrator.InitializeUrlCaptureAsync(workflowId);
                Assert.Equal(workflowId, reconciled!.Id);
                Assert.Equal(2, reconciled.Tasks.Count);
            }
            Assert.DoesNotContain(recipeId.ToString(), await client.GetStringAsync("/api/captures/failures"));
            db.ChangeTracker.Clear();
            Assert.Equal(2, await db.WorkflowTasks.CountAsync());
            Assert.False((await db.Recipes.SingleAsync()).IsReady);

            // Seed another accepted capture with a missing definition, then race its public retries.
            var storage = scope.ServiceProvider.GetRequiredService<IStorageProvider>();
            await storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
            using var second = await client.PostAsJsonAsync("/api/recipes/capture-url", new { url = "https://example.com/second" });
            Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
            db.ChangeTracker.Clear();
            var secondId = (await db.WorkflowInstances.SingleAsync(w => w.Id != workflowId)).Id;
            await UrlCaptureRecoveryTests.WriteWorkflowAsync(scope.ServiceProvider);
            var retries = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => client.PostAsync($"/api/captures/failures/{secondId}/retry", null)));
            Assert.Contains(retries, r => r.StatusCode == HttpStatusCode.Accepted);
            Assert.All(retries, r => Assert.Contains(r.StatusCode, new[] { HttpStatusCode.Accepted, HttpStatusCode.UnprocessableEntity }));
            foreach (var retry in retries) retry.Dispose();
            db.ChangeTracker.Clear();
            Assert.Equal(2, await db.WorkflowInstances.CountAsync());
            Assert.Equal(2, await db.WorkflowTasks.CountAsync(t => t.InstanceId == secondId));
            Assert.Equal(2, await db.Recipes.CountAsync());

            // Unstarted work can also use the existing Clear + durable cleanup path.
            await storage.SaveAsync("workflows", "url-import.yaml", "invalid: [");
            using var third = await client.PostAsJsonAsync("/api/recipes/capture-url", new { url = "https://example.com/third" });
            Assert.Equal(HttpStatusCode.Accepted, third.StatusCode);
            db.ChangeTracker.Clear();
            var clearId = (await db.WorkflowInstances.SingleAsync(w => w.Id != workflowId && w.Id != secondId)).Id;
            using var cleared = await client.DeleteAsync($"/api/captures/failures/{clearId}");
            Assert.Equal(HttpStatusCode.Accepted, cleared.StatusCode);
            Assert.DoesNotContain(clearId.ToString(), await client.GetStringAsync("/api/captures/failures"));
            Assert.Equal(1, await db.MaintenanceCommands.CountAsync());

            // Initial database failure cannot commit only the recipe without its recovery workflow.
            var recipesBefore = await db.Recipes.IgnoreQueryFilters().CountAsync();
            await new NpgsqlCommand("""
                CREATE FUNCTION reject_url_workflow() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
                  RAISE EXCEPTION 'injected initialization persistence failure'; END $$;
                CREATE TRIGGER reject_url_workflow BEFORE INSERT ON workflow_instances FOR EACH ROW EXECUTE FUNCTION reject_url_workflow();
                """, connection).ExecuteNonQueryAsync();
            using var notAccepted = await client.PostAsJsonAsync("/api/recipes/capture-url", new { url = "https://example.com/rejected" });
            Assert.Equal(HttpStatusCode.InternalServerError, notAccepted.StatusCode);
            Assert.Equal(recipesBefore, await db.Recipes.IgnoreQueryFilters().CountAsync());
            Assert.Equal(2, await db.WorkflowInstances.CountAsync());
        }
        finally
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        }
    }

    private sealed class LostCommitAcknowledgement : DbTransactionInterceptor
    {
        private bool thrown;
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
        {
            if (!thrown) { thrown = true; throw new IOException("Injected loss of commit acknowledgement"); }
            return Task.CompletedTask;
        }
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION for isolated PostgreSQL qualification.";
        }
    }
}
