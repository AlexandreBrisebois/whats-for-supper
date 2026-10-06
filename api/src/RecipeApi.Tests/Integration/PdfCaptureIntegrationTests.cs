using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class PdfCaptureIntegrationTests
{
    private static MultipartFormDataContent Form(int size = 12, string type = "application/pdf", string name = "recipe.pdf", string? rating = "3", string? notes = "  less salt  ")
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(new byte[size]); // Deliberately corrupt: document parsing belongs to the workflow.
        file.Headers.ContentType = new MediaTypeHeaderValue(type);
        form.Add(file, "file", name);
        if (rating is not null) form.Add(new StringContent(rating), "rating");
        if (notes is not null) form.Add(new StringContent(notes), "notes");
        return form;
    }

    private static async Task<HttpResponseMessage> Send(TestWebApplicationFactory factory, HttpContent form)
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/capture-pdf") { Content = form };
        request.Headers.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task Default_off_rejects_without_recipe_source_or_workflow()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var response = await Send(factory, Form());
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Empty(await db.Recipes.ToListAsync());
        Assert.Empty(await db.WorkflowInstances.ToListAsync());
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<IRecipeStore>().ListRecipeIdsAsync());
    }

    [Theory]
    [InlineData("on")]
    [InlineData("opt-in")]
    public async Task Acceptance_persists_unchanged_source_and_metadata_before_conversion(string mode)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = mode });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        if (mode == "opt-in")
        {
            db.FeatureFlagOverrides.Add(new RecipeApi.Models.FeatureFlagOverride { MemberId = factory.DefaultFamilyMemberId, FlagKey = "preview-pdf-recipe-import", Enabled = true });
            await db.SaveChangesAsync();
        }
        using var response = await Send(factory, Form());
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(r => r.Id == id);
        Assert.False(recipe.IsReady);
        Assert.False(recipe.IsDiscoverable);
        Assert.Equal(0, recipe.ImageCount);
        Assert.Equal(-1, recipe.FinishedDishIndex);
        Assert.Equal(factory.DefaultFamilyMemberId, recipe.AddedBy);
        Assert.Equal(3, (int)recipe.Rating);
        Assert.Equal("less salt", recipe.Notes);
        Assert.Null(recipe.Name);
        var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
        await using var source = await store.ReadSourcePdfAsync(id);
        Assert.NotNull(source);
        using var bytes = new MemoryStream();
        await source!.CopyToAsync(bytes);
        Assert.Equal(new byte[12], bytes.ToArray());
        Assert.False(await store.HasOriginalImagesAsync(id));
        Assert.Null(await store.ReadOriginalImageAsync(id, 0));
        Assert.NotNull(await db.RecipeSearchDocuments.SingleOrDefaultAsync(x => x.RecipeId == id));
        var workflows = await db.WorkflowInstances.ToListAsync();
        Assert.Contains(workflows, w => w.WorkflowId == "recipe-import" && w.Parameters!.Contains(id.ToString()));
        Assert.DoesNotContain(workflows, w => w.WorkflowId == "index-recipe-search");
    }

    [Theory]
    [InlineData(20 * 1024 * 1024, "application/pdf", "recipe.pdf", "0", 202)]
    [InlineData(20 * 1024 * 1024 + 1, "application/pdf", "recipe.pdf", "0", 413)]
    [InlineData(12, "image/png", "recipe.pdf", "0", 415)]
    [InlineData(12, "application/pdf", "recipe.txt", "0", 415)]
    [InlineData(12, "application/pdf", "recipe.pdf", "4", 400)]
    [InlineData(12, "application/pdf", "recipe.pdf", "1.5", 400)]
    [InlineData(0, "application/pdf", "recipe.pdf", "0", 400)]
    public async Task Transport_boundaries_have_no_rejected_import_side_effects(int size, string type, string name, string rating, int status)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = "on" });
        using var response = await Send(factory, Form(size, type, name, rating));
        Assert.Equal(status, (int)response.StatusCode);
        if (status == 202) return;
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(status, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("message", out _));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Empty(await db.Recipes.ToListAsync());
        Assert.Empty(await db.WorkflowInstances.ToListAsync());
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<IRecipeStore>().ListRecipeIdsAsync());
    }

    [Fact]
    public async Task Missing_or_multiple_files_rejected()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = "on" });
        using var empty = await Send(factory, new MultipartFormDataContent());
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        using var form = Form();
        var second = new ByteArrayContent([1]);
        second.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(second, "file", "second.pdf");
        using var multiple = await Send(factory, form);
        Assert.Equal(HttpStatusCode.BadRequest, multiple.StatusCode);
    }

    [Fact]
    public async Task Omitted_rating_and_blank_notes_use_photo_defaults()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = "on" });
        using var response = await Send(factory, Form(rating: null, notes: "   "));
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var recipe = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.SingleAsync();
        Assert.Equal(0, (int)recipe.Rating);
        Assert.Null(recipe.Notes);
    }

    [Fact]
    public async Task Household_authentication_is_required()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync();
        using var response = await Send(factory, Form());
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
    [Fact]
    public async Task Live_PDF_operation_exposes_the_approved_multipart_and_response_shapes()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var operation = document.RootElement.GetProperty("paths").GetProperty("/api/recipes/capture-pdf").GetProperty("post");
        Assert.Equal("capturePdfRecipe", operation.GetProperty("operationId").GetString());
        var schema = operation.GetProperty("requestBody").GetProperty("content").GetProperty("multipart/form-data").GetProperty("schema");
        Assert.Equal("file", schema.GetProperty("required")[0].GetString());
        Assert.False(schema.GetProperty("additionalProperties").GetBoolean());
        var properties = schema.GetProperty("properties");
        Assert.Equal("binary", properties.GetProperty("file").GetProperty("format").GetString());
        Assert.Equal(0, properties.GetProperty("rating").GetProperty("minimum").GetInt32());
        Assert.Equal(3, properties.GetProperty("rating").GetProperty("maximum").GetInt32());
        Assert.Equal(0, properties.GetProperty("rating").GetProperty("default").GetInt32());
        foreach (var status in new[] { "202", "400", "401", "409", "413", "415" })
            Assert.True(operation.GetProperty("responses").TryGetProperty(status, out _));
        var accepted = operation.GetProperty("responses").GetProperty("202").GetProperty("content").GetProperty("application/json").GetProperty("schema");
        Assert.Equal("uuid", accepted.GetProperty("properties").GetProperty("data").GetProperty("properties").GetProperty("id").GetProperty("format").GetString());
    }

}
