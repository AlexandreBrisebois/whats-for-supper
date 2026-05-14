using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
    public async Task CreateRecipe_With_Valid_Data_Returns_Accepted_With_RecipeId()
    {
        var form    = BuildRecipeForm(rating: 2, cookedIndex: 0, includeImage: true);
        var request = BuildPostRequest(form, familyMemberId: _factory.DefaultFamilyMemberId);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        Assert.True(data.TryGetProperty("id", out var idProp));
        var recipeId = idProp.GetGuid();
        Assert.NotEqual(Guid.Empty, recipeId);

        // Verify that a 'recipe-import' workflow instance was queued
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var workflow = await db.WorkflowInstances
                .FirstOrDefaultAsync(w => w.WorkflowId == "recipe-import" &&
                                          w.Parameters != null &&
                                          w.Parameters.Contains(recipeId.ToString()));
            Assert.NotNull(workflow);
        }
    }

    // ── GET /api/recipes?order=explore ───────────────────────────────────────

    [Fact]
    public async Task GetRecipes_WithOrderExplore_Returns_Paginated_List()
    {
        var response = await _client.GetAsync("/api/recipes?order=explore&page=1&limit=10");

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

    [Fact]
    public async Task GetRecipes_WithInvalidOrder_Returns_BadRequest()
    {
        var response = await _client.GetAsync("/api/recipes?order=invalid");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        // Response is wrapped in { data: { error: "..." } } by SuccessWrappingFilter
        var data = root.TryGetProperty("data", out var d) ? d : root;
        Assert.True(data.TryGetProperty("error", out var error), "missing 'error' field");
        Assert.Contains("explore", error.GetString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetRecipes_WithOrderExplore_NeverCookedRecipes_AppearFirst()
    {
        // Arrange: seed one recipe with a lastCookedDate and one without
        Guid neverCookedId;
        Guid cookedId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            var neverCooked = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Never Cooked",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                LastCookedDate = null,
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            var cooked = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Already Cooked",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                LastCookedDate = now.AddDays(-10),
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            db.Recipes.AddRange(neverCooked, cooked);
            await db.SaveChangesAsync();

            neverCookedId = neverCooked.Id;
            cookedId = cooked.Id;
        }

        // Act
        var response = await _client.GetAsync("/api/recipes?order=explore&page=1&limit=20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipes = doc.RootElement.GetProperty("recipes").EnumerateArray().ToList();

        // Find positions of our two seeded recipes
        var neverCookedIndex = recipes.FindIndex(r => r.GetProperty("id").GetGuid() == neverCookedId);
        var cookedIndex       = recipes.FindIndex(r => r.GetProperty("id").GetGuid() == cookedId);

        Assert.True(neverCookedIndex >= 0, "Never-cooked recipe not found in results");
        Assert.True(cookedIndex >= 0,      "Cooked recipe not found in results");
        Assert.True(neverCookedIndex < cookedIndex,
            $"Never-cooked recipe (index {neverCookedIndex}) should appear before cooked recipe (index {cookedIndex})");
    }

    [Fact]
    public async Task GetRecipes_WithOrderExplore_ExcludesSoftDeletedRecipes()
    {
        // Arrange: seed one active and one soft-deleted recipe
        Guid activeId;
        Guid deletedId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            var active = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Active Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            var deleted = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Deleted Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                DeletedAt = now.AddDays(-1),
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            db.Recipes.AddRange(active, deleted);
            await db.SaveChangesAsync();

            activeId  = active.Id;
            deletedId = deleted.Id;
        }

        // Act
        var response = await _client.GetAsync("/api/recipes?order=explore&page=1&limit=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipes = doc.RootElement.GetProperty("recipes").EnumerateArray().ToList();

        var ids = recipes.Select(r => r.GetProperty("id").GetGuid()).ToHashSet();
        Assert.Contains(activeId,  ids);
        Assert.DoesNotContain(deletedId, ids);
    }

    [Fact]
    public async Task GetRecipes_WithOrderExplore_OldestCookedAppearsBeforeRecentlyCooked()
    {
        // Arrange: two cooked recipes — one cooked long ago, one recently
        Guid oldCookedId;
        Guid recentCookedId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            var oldCooked = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Old Cooked",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                LastCookedDate = now.AddDays(-100),
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            var recentCooked = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Recent Cooked",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                LastCookedDate = now.AddDays(-1),
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            db.Recipes.AddRange(oldCooked, recentCooked);
            await db.SaveChangesAsync();

            oldCookedId    = oldCooked.Id;
            recentCookedId = recentCooked.Id;
        }

        // Act
        var response = await _client.GetAsync("/api/recipes?order=explore&page=1&limit=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipes = doc.RootElement.GetProperty("recipes").EnumerateArray().ToList();

        var oldIndex    = recipes.FindIndex(r => r.GetProperty("id").GetGuid() == oldCookedId);
        var recentIndex = recipes.FindIndex(r => r.GetProperty("id").GetGuid() == recentCookedId);

        Assert.True(oldIndex >= 0,    "Old-cooked recipe not found in results");
        Assert.True(recentIndex >= 0, "Recent-cooked recipe not found in results");
        Assert.True(oldIndex < recentIndex,
            $"Old-cooked recipe (index {oldIndex}) should appear before recently-cooked recipe (index {recentIndex})");
    }

    [Fact]
    public async Task GetRecipes_WithoutOrderParam_UsesDefaultOrdering()
    {
        // Absent order param should still return 200 with the standard list shape
        var response = await _client.GetAsync("/api/recipes?page=1&limit=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("recipes",    out _), "missing 'recipes'");
        Assert.True(doc.RootElement.TryGetProperty("pagination", out _), "missing 'pagination'");
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

    [Fact]
    public async Task GetRecipes_Excludes_NotReady_Recipes()
    {
        Guid readyId;
        Guid pendingPhotoImportId;
        Guid pendingUrlImportId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            var ready = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Ready Stack Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            var pendingPhotoImport = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = null,
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                CreatedAt = now.AddSeconds(1),
                UpdatedAt = now.AddSeconds(1)
            };

            var pendingUrlImport = new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Captured Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 0,
                IsSynthesized = false,
                IsReady = false,
                CreatedAt = now.AddSeconds(2),
                UpdatedAt = now.AddSeconds(2)
            };

            db.Recipes.AddRange(ready, pendingPhotoImport, pendingUrlImport);
            await db.SaveChangesAsync();

            readyId = ready.Id;
            pendingPhotoImportId = pendingPhotoImport.Id;
            pendingUrlImportId = pendingUrlImport.Id;
        }

        var response = await _client.GetAsync("/api/recipes?page=1&limit=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var ids = doc.RootElement.GetProperty("recipes")
            .EnumerateArray()
            .Select(r => r.GetProperty("id").GetGuid())
            .ToHashSet();

        Assert.Contains(readyId, ids);
        Assert.DoesNotContain(pendingPhotoImportId, ids);
        Assert.DoesNotContain(pendingUrlImportId, ids);
    }

    // ── GET /api/recipes/{id} ─────────────────────────────────────────────────

    [Fact]
    public async Task GetRecipeDetail_Returns_Recipe()
    {
        // Arrange: create a recipe
        var form    = BuildRecipeForm(rating: 3, cookedIndex: 0, includeImage: true);
        var create  = BuildPostRequest(form, familyMemberId: _factory.DefaultFamilyMemberId);
        var created = await _client.SendAsync(create);
        Assert.Equal(HttpStatusCode.Accepted, created.StatusCode);

        var createJson = await created.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var recipeId = createDoc.RootElement.GetProperty("data").GetProperty("id").GetGuid();

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
        // Arrange: write a fake image directly into the factory's store
        var recipeId = Guid.NewGuid();
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.SaveOriginalImageAsync(recipeId, 0, "image/jpeg", new MemoryStream(MinimalJpeg));

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
        // Arrange: write a fake hero image into the factory's store
        var recipeId = Guid.NewGuid();
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.SaveHeroImageAsync(recipeId, new MemoryStream(MinimalJpeg));

        // Act
        var response = await _client.GetAsync($"/api/recipes/{recipeId}/hero");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public async Task GetHero_Returns_CacheControl_Header()
    {
        // Arrange: write a fake hero image into the factory's store (same MinimalJpeg bytes as GetHero_Returns_Hero_Image_When_Present)
        var recipeId = Guid.NewGuid();
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.SaveHeroImageAsync(recipeId, new MemoryStream(MinimalJpeg));

        // Act
        var response = await _client.GetAsync($"/api/recipes/{recipeId}/hero");

        // Assert — Bug 2 exploration: this FAILS on unfixed code because Cache-Control is absent
        // Counterexample: GET /api/recipes/{known-id}/hero → 200 OK, Cache-Control header → null
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(
            response.Headers.TryGetValues("Cache-Control", out var values),
            "Cache-Control header is absent — Bug 2 confirmed: hero endpoint does not set Cache-Control"
        );
        Assert.Equal("public, max-age=31536000, immutable", string.Join(", ", values!));
    }

    [Fact]
    public async Task GetHero_Returns_NotFound_Before_Import_Completes()
    {
        // A new recipe with no hero.jpg should return 404
        var recipeId = Guid.NewGuid();
        var response = await _client.GetAsync($"/api/recipes/{recipeId}/hero");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST /api/recipes/imports/bulk ──────────────────────────────────────

    [Fact]
    public async Task BulkTriggerImport_WithNoUnimportedRecipes_Returns_Accepted_With_Zero_Count()
    {
        // No recipes in the DB — expect 202 with queuedCount = 0
        var response = await _client.PostAsync("/api/recipes/imports/bulk", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("queuedCount", out var count), "missing 'queuedCount'");
        Assert.Equal(0, count.GetInt32());
        Assert.True(root.TryGetProperty("instanceIds", out var ids), "missing 'instanceIds'");
        Assert.Equal(JsonValueKind.Array, ids.ValueKind);
        Assert.Equal(0, ids.GetArrayLength());
    }

    [Fact]
    public async Task BulkTriggerImport_WithUnimportedRecipes_Queues_Each_One()
    {
        // Arrange: seed two recipes with Name == null (unimported)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.AddRange(
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = null, AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                },
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = null, AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        // Act
        var response = await _client.PostAsync("/api/recipes/imports/bulk", null);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("queuedCount", out var count), "missing 'queuedCount'");
        Assert.Equal(2, count.GetInt32());

        Assert.True(root.TryGetProperty("instanceIds", out var ids), "missing 'instanceIds'");
        Assert.Equal(2, ids.GetArrayLength());
    }

    [Fact]
    public async Task BulkTriggerImport_DoesNot_Queue_Already_Imported_Recipes()
    {
        // Arrange: one imported (Name set) and one unimported (Name null)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.AddRange(
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = "Already imported", AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                },
                new RecipeApi.Models.Recipe
                {
                    Id = Guid.NewGuid(), Name = null, AddedBy = _factory.DefaultFamilyMemberId,
                    ImageCount = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsync("/api/recipes/imports/bulk", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(1, doc.RootElement.GetProperty("queuedCount").GetInt32());
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
