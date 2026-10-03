using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Integration.Fixtures;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>Actual PostgreSQL/schema and disk storage; native rendering is qualified separately.
/// The factory persists workflow tasks; this test drives the standard failed-task transition.</summary>
public sealed class PdfCapturePostgresTests : IAsyncLifetime
{
    private readonly string database = "wfs_pdf_" + Guid.NewGuid().ToString("N");
    private NpgsqlConnection admin = null!;
    private TestWebApplicationFactory factory = null!;

    public async Task InitializeAsync()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        connection.Database = database;
        await using (var schema = new NpgsqlConnection(connection.ConnectionString))
        {
            await schema.OpenAsync();
            var root = new DirectoryInfo(AppContext.BaseDirectory);
            while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
            var sql = await File.ReadAllTextAsync(Path.Combine(root!.FullName, "api", "database", "schema.sql"));
            await new NpgsqlCommand(sql, schema).ExecuteNonQueryAsync();
        }
        factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:PostgresConnectionString"] = connection.ConnectionString,
            ["Tests:LocalRecipeStore"] = "true",
            ["Tests:PdfWorkflow"] = "true",
            ["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = "on"
        });
    }

    public async Task DisposeAsync()
    {
        if (factory is not null) await factory.DisposeAsync();
        if (admin is not null)
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
            await admin.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task Accepted_source_failure_retry_with_flag_off_and_delete_use_existing_recovery()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        var bytes = "%PDF-corrupt"u8.ToArray();
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", "supper.pdf");
        form.Add(new StringContent("2"), "rating");
        form.Add(new StringContent("  less salt  "), "notes");
        using var accepted = await client.PostAsync("/api/recipes/capture-pdf", form);
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        using var json = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.True(db.Database.IsNpgsql());
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        Assert.IsType<LocalRecipeStore>(store);
        var instance = await db.WorkflowInstances.Include(w => w.Tasks).SingleAsync(w => w.WorkflowId == "recipe-import");
        var task = Assert.Single(instance.Tasks);
        Assert.Equal("ConvertPdf", task.ProcessorName);
        var renderer = new ControlledRenderer();
        var processor = new PdfConversionProcessor(db, store, renderer);
        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, CancellationToken.None));
        task.Status = RecipeApi.Models.TaskStatus.Failed;
        instance.Status = WorkflowStatus.Paused;
        await db.SaveChangesAsync();
        using (var failed = await client.GetAsync("/api/captures/failures"))
        {
            var body = await failed.Content.ReadAsStringAsync();
            Assert.Contains(instance.Id.ToString(), body);
            Assert.Contains(factory.DefaultFamilyMemberId.ToString(), body);
            Assert.Contains("ConvertPdf", body);
        }
        await AssertSourceAsync(store, id, bytes);
        factory.Services.GetRequiredService<IConfiguration>()["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = "off";
        using var retry = await client.PostAsync($"/api/captures/failures/{instance.Id}/retry", null);
        Assert.Equal(HttpStatusCode.Accepted, retry.StatusCode);
        await db.Entry(task).ReloadAsync();
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, task.Status);
        renderer.Fail = false;
        await processor.ExecuteAsync(task, CancellationToken.None);
        await processor.ExecuteAsync(task, CancellationToken.None); // Already-published pages are reused.
        Assert.Equal(2, renderer.Calls);
        var recipe = await db.Recipes.SingleAsync(r => r.Id == id);
        Assert.False(recipe.IsReady);
        Assert.Equal(2, (int)recipe.Rating);
        Assert.Equal("less salt", recipe.Notes);
        Assert.Equal(-1, recipe.FinishedDishIndex);
        await AssertSourceAsync(store, id, bytes);
        task.Status = RecipeApi.Models.TaskStatus.Failed;
        instance.Status = WorkflowStatus.Paused;
        await db.SaveChangesAsync();
        using var cleared = await client.DeleteAsync($"/api/captures/failures/{instance.Id}");
        Assert.Equal(HttpStatusCode.Accepted, cleared.StatusCode);
        var result = await scope.ServiceProvider.GetRequiredService<ManagementService>().ProcessMaintenanceCommandsAsync();
        Assert.Equal(1, result.Completed);
        Assert.Null(await store.ReadSourcePdfAsync(id));
        Assert.Null(await store.ReadOriginalImageAsync(id, 0));
    }

    private static async Task AssertSourceAsync(IRecipeStore store, Guid id, byte[] expected)
    {
        await using var source = await store.ReadSourcePdfAsync(id);
        Assert.NotNull(source);
        using var memory = new MemoryStream();
        await source!.CopyToAsync(memory);
        Assert.Equal(expected, memory.ToArray());
    }

    private sealed class ControlledRenderer : IPdfPageRenderer
    {
        public bool Fail = true;
        public int Calls;
        public Task<IReadOnlyList<byte[]>> RenderAsync(Stream source, CancellationToken ct)
        {
            Calls++;
            if (Fail) throw new InvalidDataException("Corrupt PDF.");
            return Task.FromResult<IReadOnlyList<byte[]>>([new byte[] { 137, 80, 78, 71 }]);
        }
    }
}
