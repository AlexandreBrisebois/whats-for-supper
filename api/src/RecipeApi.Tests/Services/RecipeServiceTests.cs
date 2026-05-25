using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Integration tests for RecipeService via the RecipeController HTTP layer.
/// Focuses on areas with known fragility: ingredients JSON format resilience.
/// </summary>
public class RecipeServiceTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

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

    // ── GET /api/recipes — ingredients deserialization resilience ─────────────

    [Fact]
    public async Task GetRecipes_WithNullIngredients_Returns_EmptyList()
    {
        // Arrange: seed a recipe with null ingredients
        using (var seedScope = _factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "No Ingredients Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                Ingredients = null,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync("/api/recipes?page=1&limit=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipes = doc.RootElement.GetProperty("recipes");
        // Find the one we added and verify ingredients is an empty array
        var recipe = recipes.EnumerateArray().First(r => r.GetProperty("name").GetString() == "No Ingredients Recipe");
        Assert.Equal(JsonValueKind.Array, recipe.GetProperty("ingredients").ValueKind);
        Assert.Equal(0, recipe.GetProperty("ingredients").GetArrayLength());
    }

    [Fact]
    public async Task GetRecipes_WithStringArrayIngredients_Returns_Correctly()
    {
        // Arrange: seed a recipe with ingredients as a JSON string array
        using (var seedScope = _factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            seedDb.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "String Ingredients Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                Ingredients = """["flour","eggs","butter"]""",
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await seedDb.SaveChangesAsync();
        }

        var response = await _client.GetAsync("/api/recipes?page=1&limit=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipes = doc.RootElement.GetProperty("recipes");
        var recipe = recipes.EnumerateArray().First(r => r.GetProperty("name").GetString() == "String Ingredients Recipe");
        var ingredients = recipe.GetProperty("ingredients");
        Assert.Equal(JsonValueKind.Array, ingredients.ValueKind);
        Assert.Equal(3, ingredients.GetArrayLength());
        Assert.Equal("flour", ingredients[0].GetString());
    }

    [Fact]
    public async Task GetRecipes_WithObjectArrayIngredients_DoesNotCrash()
    {
        // Arrange: seed a recipe with ingredients as JSON objects (legacy/agent format)
        // This is the format that was previously causing 500 errors.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = Guid.NewGuid(),
                Name = "Object Ingredients Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                Ingredients = """[{"name":"chicken","amount":"500g"},{"name":"garlic","amount":"3 cloves"}]""",
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // Previously threw 500 — must now return 200
        var response = await _client.GetAsync("/api/recipes?page=1&limit=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipes = doc.RootElement.GetProperty("recipes");
        var recipe = recipes.EnumerateArray().First(r => r.GetProperty("name").GetString() == "Object Ingredients Recipe");
        // Should have 2 ingredients (serialized as raw JSON strings of the objects)
        var ingredients = recipe.GetProperty("ingredients");
        Assert.Equal(JsonValueKind.Array, ingredients.ValueKind);
        Assert.Equal(2, ingredients.GetArrayLength());
    }

    [Fact]
    public async Task PatchRecipe_WithEditableCardFields_PersistsFieldsAndQueuesSearchIndexWorkflow()
    {
        var recipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Old Soup",
                Description = "Old description",
                Ingredients = """["old ingredient"]""",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new
        {
            name = "Weeknight Chicken Soup",
            description = "A calmer bowl for busy evenings.",
            ingredients = new[] { "Chicken thighs", "Carrots", "Broth" }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.FindAsync(recipeId);

            Assert.NotNull(recipe);
            Assert.Equal("Weeknight Chicken Soup", recipe.Name);
            Assert.Equal("A calmer bowl for busy evenings.", recipe.Description);
            Assert.Equal(["Chicken thighs", "Carrots", "Broth"], RecipeApi.Services.RecipeService.DeserializeIngredients(recipe.Ingredients));

            var workflow = Assert.Single(db.WorkflowInstances.Where(instance => instance.WorkflowId == "index-recipe-search"));
            using var parameters = JsonDocument.Parse(workflow.Parameters!);
            Assert.Equal(recipeId.ToString(), parameters.RootElement.GetProperty("recipeId").GetString());
            Assert.False(string.IsNullOrWhiteSpace(parameters.RootElement.GetProperty("fingerprint").GetString()));
        }
    }

    [Fact]
    public async Task PatchRecipe_WhenMultipleEditableFieldsChange_QueuesSearchIndexWorkflowOnce()
    {
        var recipeId = Guid.NewGuid();

        using (var seedScope = _factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            seedDb.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Original",
                Description = "Original description",
                Ingredients = """["one"]""",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await seedDb.SaveChangesAsync();
        }

        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new
        {
            name = "Updated",
            description = "Updated description",
            ingredients = new[] { "one", "two" },
            notes = "Keep this one"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var assertScope = _factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Single(assertDb.WorkflowInstances.Where(instance => instance.WorkflowId == "index-recipe-search"));
    }

    [Fact]
    public async Task PatchRecipe_WithCuisineTypeAndMealTypes_PersistsFields()
    {
        var recipeId = Guid.NewGuid();

        using (var seedScope = _factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            seedDb.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Original",
                Category = "Lunch",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await seedDb.SaveChangesAsync();
        }

        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new
        {
            cuisineType = "Italian",
            mealTypes = new[] { "Supper", "Lunch" }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var assertScope = _factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await assertDb.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.Equal("Italian", recipe!.CuisineType);
        Assert.NotNull(recipe.MealTypes);
        Assert.Equal(["Supper", "Lunch"], recipe.MealTypes!);
    }

    [Fact]
    public async Task PatchRecipe_WithEmptyMealTypes_FallsBackCategoryToSupper()
    {
        var recipeId = Guid.NewGuid();

        using (var seedScope = _factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            seedDb.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Original",
                Category = "Lunch",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await seedDb.SaveChangesAsync();
        }

        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new
        {
            mealTypes = Array.Empty<string>()
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var assertScope = _factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await assertDb.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.Equal("Supper", recipe!.Category);
    }

    [Fact]
    public async Task GetRecipe_Returns_FinishedDishIndex()
    {
        var recipeId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Cooked Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 3,
                FinishedDishIndex = 2,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync($"/api/recipes/{recipeId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recipe = doc.RootElement.GetProperty("recipe");
        Assert.Equal(2, recipe.GetProperty("finishedDishIndex").GetInt32());
    }

    // ── Export/Import Share Bundle duplicate prevention tests ───────────────

    [Fact]
    public async Task ExportRecipeShareBundle_PopulatesRecipeId()
    {
        var recipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = recipeId,
                Name = "Export Test Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            // We need to write a fake hero image because recipeService.ExportRecipeShareBundle expects a hero image
            var store = _factory.Services.GetRequiredService<IRecipeStore>();
            await store.SaveHeroImageAsync(recipeId, new MemoryStream([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]));

            await db.SaveChangesAsync();
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/recipes/{recipeId}/share");
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var info = doc.RootElement.GetProperty("info");
        
        Assert.True(info.TryGetProperty("recipeId", out var recipeIdProp));
        Assert.Equal(recipeId, recipeIdProp.GetGuid());
    }

    [Fact]
    public async Task ImportRecipeShareBundle_UsesOriginalRecipeId_WhenNotDuplicate()
    {
        var originalRecipeId = Guid.NewGuid();

        var bundle = new
        {
            version = "1.0",
            recipe = new
            {
                name = "Imported Recipe",
                description = "Yummy imported recipe",
                ingredients = new[] { "Salt", "Pepper" },
                instructions = new[]
                {
                    new { name = "Instructions", itemListElement = new[] { new { text = "Cook it." } } }
                },
                totalTimeMinutes = 15,
                sourceUrl = "https://example.com/imported",
                isSynthesized = false
            },
            info = new
            {
                exportedAtUtc = DateTimeOffset.UtcNow.ToString("o"),
                bundleSource = "wfs-share",
                recipeId = originalRecipeId.ToString()
            },
            originals = new object[] { }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/import-bundle")
        {
            Content = JsonContent.Create(bundle)
        };
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.FindAsync(originalRecipeId);
            Assert.NotNull(recipe);
            Assert.Equal("Imported Recipe", recipe.Name);
        }
    }

    [Fact]
    public async Task ImportRecipeShareBundle_GeneratesNewGuid_WhenDuplicateIdExists()
    {
        var existingRecipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.Recipes.Add(new RecipeApi.Models.Recipe
            {
                Id = existingRecipeId,
                Name = "Already Existing Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                ImageCount = 1,
                IsReady = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var bundle = new
        {
            version = "1.0",
            recipe = new
            {
                name = "Imported Recipe Duplicate",
                description = "Another yummy imported recipe",
                ingredients = new[] { "Salt", "Pepper" },
                instructions = new[]
                {
                    new { name = "Instructions", itemListElement = new[] { new { text = "Cook it." } } }
                },
                totalTimeMinutes = 15,
                sourceUrl = "https://example.com/imported",
                isSynthesized = false
            },
            info = new
            {
                exportedAtUtc = DateTimeOffset.UtcNow.ToString("o"),
                bundleSource = "wfs-share",
                recipeId = existingRecipeId.ToString() // same ID!
            },
            originals = new object[] { }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/import-bundle")
        {
            Content = JsonContent.Create(bundle)
        };
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var importedRecipeId = doc.RootElement.GetProperty("data").GetProperty("id").GetGuid();

        Assert.NotEqual(existingRecipeId, importedRecipeId);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var existingRecipe = await db.Recipes.FindAsync(existingRecipeId);
            var importedRecipe = await db.Recipes.FindAsync(importedRecipeId);

            Assert.NotNull(existingRecipe);
            Assert.NotNull(importedRecipe);
            Assert.Equal("Already Existing Recipe", existingRecipe.Name);
            Assert.Equal("Imported Recipe Duplicate", importedRecipe.Name);
        }
    }
}
