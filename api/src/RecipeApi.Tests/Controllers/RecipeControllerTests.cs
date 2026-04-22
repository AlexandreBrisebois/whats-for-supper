using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class RecipeControllerTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    // A minimal valid JPEG header (enough to satisfy IFormFile.Length > 0).
    private static readonly byte[] MinimalJpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── POST /api/recipes — validation failures ───────────────────────────────

    [Fact]
    public async Task CreateRecipe_Without_Images_Returns_BadRequest()
    {
        var form    = BuildRecipeForm(rating: 2, cookedIndex: -1, includeImage: false);
        var request = BuildPostRequest(form, familyMemberId: _factory.DefaultFamilyMemberId);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateRecipe_With_Invalid_Rating_Returns_BadRequest()
    {
        // Rating=99 is outside [0,3] — fails [Range] model validation before reaching service.
        var form    = BuildRecipeForm(rating: 99, cookedIndex: -1, includeImage: true);
        var request = BuildPostRequest(form, familyMemberId: _factory.DefaultFamilyMemberId);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateRecipe_Without_FamilyMemberHeader_Returns_BadRequest()
    {
        var form    = BuildRecipeForm(rating: 2, cookedIndex: -1, includeImage: true);
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes") { Content = form };

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── POST /api/recipes — happy path ────────────────────────────────────────

    [Fact]
    public async Task CreateRecipe_With_Valid_Data_Returns_Ok_With_RecipeId()
    {
        var form    = BuildRecipeForm(rating: 2, cookedIndex: 0, includeImage: true);
        var request = BuildPostRequest(form, familyMemberId: _factory.DefaultFamilyMemberId);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        Assert.True(data.TryGetProperty("recipeId", out var idProp));
        Assert.NotEqual(Guid.Empty, idProp.GetGuid());
    }

    // ── GET /api/recipes ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetRecipes_Returns_Paginated_List()
    {
        var response = await _client.GetAsync("/api/recipes?page=1&limit=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("recipes",    out var recipes),    "missing 'recipes'");
        Assert.True(doc.RootElement.TryGetProperty("pagination", out var pagination), "missing 'pagination'");
        Assert.Equal(JsonValueKind.Array, recipes.ValueKind);
        Assert.True(pagination.TryGetProperty("page",  out _));
        Assert.True(pagination.TryGetProperty("limit", out _));
        Assert.True(pagination.TryGetProperty("total", out _));
    }

    // ── GET /api/recipes/{id} ─────────────────────────────────────────────────

    [Fact]
    public async Task GetRecipeDetail_Returns_Recipe()
    {
        // Arrange: create a recipe
        var form    = BuildRecipeForm(rating: 3, cookedIndex: 0, includeImage: true);
        var create  = BuildPostRequest(form, familyMemberId: _factory.DefaultFamilyMemberId);
        var created = await _client.SendAsync(create);
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        var createJson = await created.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var recipeId = createDoc.RootElement.GetProperty("data").GetProperty("recipeId").GetGuid();

        // Act
        var detail = await _client.GetAsync($"/api/recipes/{recipeId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);

        var detailJson = await detail.Content.ReadAsStringAsync();
        using var detailDoc = JsonDocument.Parse(detailJson);
        Assert.True(detailDoc.RootElement.TryGetProperty("recipe", out var recipe));
        Assert.Equal(recipeId, recipe.GetProperty("id").GetGuid());
    }

    // ── GET /api/recipes/{id}/original/{index} ────────────────────────────────

    [Fact]
    public async Task GetImage_Returns_Image_Binary()
    {
        // Arrange: write a fake image directly into the factory's temp recipes root
        var recipeId = Guid.NewGuid();
        var dir = Path.Combine(_factory.TempRecipesRoot, recipeId.ToString(), "original");
        Directory.CreateDirectory(dir);
        await File.WriteAllBytesAsync(Path.Combine(dir, "0.jpg"), MinimalJpeg);

        // Act — URL is now under /api/recipes/ (unified route convention)
        var response = await _client.GetAsync($"/api/recipes/{recipeId}/original/0");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
    }

    // ── GET /api/recipes/{id}/hero ────────────────────────────────────────────

    [Fact]
    public async Task GetHero_Returns_Hero_Image_When_Present()
    {
        // Arrange: write a fake hero image into the factory's temp recipes root
        var recipeId = Guid.NewGuid();
        var dir = Path.Combine(_factory.TempRecipesRoot, recipeId.ToString());
        Directory.CreateDirectory(dir);
        await File.WriteAllBytesAsync(Path.Combine(dir, "hero.jpg"), MinimalJpeg);

        // Act
        var response = await _client.GetAsync($"/api/recipes/{recipeId}/hero");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public async Task GetHero_Returns_NotFound_Before_Import_Completes()
    {
        // A new recipe with no hero.jpg should return 404
        var recipeId = Guid.NewGuid();
        var response = await _client.GetAsync($"/api/recipes/{recipeId}/hero");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private MultipartFormDataContent BuildRecipeForm(int rating, int cookedIndex, bool includeImage)
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(rating.ToString()),      "Rating");
        form.Add(new StringContent(cookedIndex.ToString()), "FinishedDishImageIndex");

        if (includeImage)
        {
            var imageContent = new ByteArrayContent(MinimalJpeg);
            imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
            // Field name must match the controller's parameter name ("files")
            // because [FromForm] IFormFileCollection binds by name.
            form.Add(imageContent, "files", "test.jpg");
        }

        return form;
    }

    private static HttpRequestMessage BuildPostRequest(
        MultipartFormDataContent form, Guid familyMemberId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes")
        {
            Content = form
        };
        request.Headers.Add("X-Family-Member-Id", familyMemberId.ToString());
        return request;
    }
}
