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
            Assert.Contains("convert_pdf", body);
        }
        await AssertSourceAsync(store, id, bytes);
        factory.Services.GetRequiredService<IConfiguration>()["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = "off";
        using var retry = await client.PostAsync($"/api/captures/failures/{instance.Id}/retry", null);
        Assert.Equal(HttpStatusCode.Accepted, retry.StatusCode);
        await db.Entry(instance).ReloadAsync();
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

    [PostgresFact]
    public async Task Backup_restore_soft_delete_and_purge_preserve_then_remove_PDF_aggregate()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        var bytes = "%PDF-original-retained"u8.ToArray();
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", "supper.pdf");
        using var accepted = await client.PostAsync("/api/recipes/capture-pdf", form);
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        using var json = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        var recipe = await db.Recipes.SingleAsync(r => r.Id == id);
        recipe.Name = "Lemon chicken";
        recipe.IsReady = true;
        recipe.ImageCount = 1;
        recipe.Rating = (RecipeRating)3;
        recipe.Notes = "less salt";
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNkwAAAAASUVORK5CYII=");
        await store.ReplacePdfPagesAsync(id, [png]);
        var info = (await store.ReadInfoAsync(id))!;
        info.ImageCount = 1;
        await store.WriteInfoAsync(info);
        await db.SaveChangesAsync();
        var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await management.BackupAsync();
        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        await management.RestoreAsync();
        var restored = await db.Recipes.SingleAsync(r => r.Id == id);
        Assert.True(restored.IsReady);
        Assert.Equal("less salt", restored.Notes);
        Assert.Equal(3, (int)restored.Rating);
        Assert.Equal(-1, restored.FinishedDishIndex);
        await AssertSourceAsync(store, id, bytes);
        var image = await store.ReadOriginalImageAsync(id, 0);
        Assert.NotNull(image);
        await image!.Value.Stream.DisposeAsync();
        using var deleted = await client.DeleteAsync($"/api/recipes/{id}");
        Assert.Equal(HttpStatusCode.OK, deleted.StatusCode);
        await AssertSourceAsync(store, id, bytes);
        Assert.NotNull(await store.ReadInfoAsync(id));
        using var recovered = await client.PostAsync($"/api/recipes/{id}/restore", null);
        Assert.Equal(HttpStatusCode.OK, recovered.StatusCode);
        await AssertSourceAsync(store, id, bytes);
        using var deletedAgain = await client.DeleteAsync($"/api/recipes/{id}");
        Assert.Equal(HttpStatusCode.OK, deletedAgain.StatusCode);
        var previous = Environment.GetEnvironmentVariable("ELEVATED_ACTIONS_PIN");
        try
        {
            Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", "pdf-qualification-pin");
            using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/recipes/{id}/purge");
            request.Headers.Add("X-Elevated-Pin", "pdf-qualification-pin");
            using var purged = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, purged.StatusCode);
        }
        finally { Environment.SetEnvironmentVariable("ELEVATED_ACTIONS_PIN", previous); }
        Assert.Null(await store.ReadSourcePdfAsync(id));
        Assert.Null(await store.ReadOriginalImageAsync(id, 0));
        Assert.Null(await store.ReadInfoAsync(id));
    }

    [PostgresFact]
    public async Task Named_but_unfinished_PDF_stays_pending_after_backup_and_restore()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent("%PDF-pending"u8.ToArray());
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", "supper.pdf");
        using var accepted = await client.PostAsync("/api/recipes/capture-pdf", form);
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        using var json = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        var recipe = await db.Recipes.SingleAsync(r => r.Id == id);
        recipe.Name = "Extracted name, final workflow tasks unfinished";
        recipe.ImageCount = 1;
        recipe.IsReady = false;
        await store.ReplacePdfPagesAsync(id, [new byte[] { 137, 80, 78, 71 }]);
        var info = (await store.ReadInfoAsync(id))!;
        info.Name = recipe.Name;
        info.ImageCount = 1;
        await store.WriteInfoAsync(info);
        await db.SaveChangesAsync();
        var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await management.BackupAsync();
        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        await management.RestoreAsync();
        Assert.False((await db.Recipes.SingleAsync(r => r.Id == id)).IsReady);
        Assert.NotNull(await store.ReadSourcePdfAsync(id));
    }

    private static async Task AssertSourceAsync(IRecipeStore store, Guid id, byte[] expected)
    {
        await using var source = await store.ReadSourcePdfAsync(id);
        Assert.NotNull(source);
        using var memory = new MemoryStream();
        await source!.CopyToAsync(memory);
        Assert.Equal(expected, memory.ToArray());
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION to run isolated PostgreSQL PDF recovery.";
        }
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
