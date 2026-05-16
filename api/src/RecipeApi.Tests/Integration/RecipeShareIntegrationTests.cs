using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeShareIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    private static readonly byte[] MinimalJpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task GetShareBundle_ExportsAllowedFieldsOnly_AndCapsOriginalImagesAtFive()
    {
        var recipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
            var now = DateTimeOffset.UtcNow;

            db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = "Shareable Pasta",
                Description = "Tomato pasta for weeknights.",
                Ingredients = """["Pasta","Tomato sauce","Basil"]""",
                RawMetadata = """{"recipeInstructions":["Boil pasta","Finish in sauce"]}""",
                SourceUrl = "https://example.com/shareable-pasta",
                Category = "Dinner",
                AddedBy = _factory.DefaultFamilyMemberId,
                Notes = "Family note that must not leak",
                Rating = RecipeRating.Love,
                DietaryProfile = """{"primaryFoodGroup":"grain"}""",
                IsSynthesized = false,
                IsReady = true,
                ImageCount = 6,
                CreatedAt = now,
                UpdatedAt = now
            });
            await db.SaveChangesAsync();

            await store.SaveHeroImageAsync(recipeId, new MemoryStream(MinimalJpeg));
            for (var index = 0; index < 6; index++)
            {
                await store.SaveOriginalImageAsync(
                    recipeId,
                    index,
                    "image/jpeg",
                    new MemoryStream(MinimalJpeg));
            }
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/recipes/{recipeId}/share");
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var bundle = doc.RootElement;
        var exportedRecipe = bundle.GetProperty("recipe");

        Assert.Equal("1.0", bundle.GetProperty("version").GetString());
        Assert.Equal("Shareable Pasta", exportedRecipe.GetProperty("name").GetString());
        Assert.Equal("Tomato pasta for weeknights.", exportedRecipe.GetProperty("description").GetString());
        Assert.Equal("https://example.com/shareable-pasta", exportedRecipe.GetProperty("sourceUrl").GetString());
        Assert.Equal("Dinner", exportedRecipe.GetProperty("category").GetString());
        Assert.False(exportedRecipe.GetProperty("isSynthesized").GetBoolean());
        Assert.Equal(1, exportedRecipe.GetProperty("instructions").GetArrayLength());
        var section = exportedRecipe.GetProperty("instructions")[0];
        Assert.Equal("Instructions", section.GetProperty("name").GetString());
        Assert.Equal(2, section.GetProperty("itemListElement").GetArrayLength());
        Assert.Equal("Boil pasta", section.GetProperty("itemListElement")[0].GetProperty("text").GetString());

        Assert.False(exportedRecipe.TryGetProperty("addedBy", out _));
        Assert.False(exportedRecipe.TryGetProperty("rating", out _));
        Assert.False(exportedRecipe.TryGetProperty("notes", out _));
        Assert.False(exportedRecipe.TryGetProperty("dietaryProfile", out _));
        Assert.False(exportedRecipe.TryGetProperty("id", out _));

        Assert.Equal("wfs-share", bundle.GetProperty("info").GetProperty("bundleSource").GetString());
        Assert.Equal(5, bundle.GetProperty("originals").GetArrayLength());
        Assert.Equal("image/jpeg", bundle.GetProperty("hero").GetProperty("mimeType").GetString());
    }

    [Fact]
    public async Task GetShareBundle_PreservesStructuredInstructions_WhenPresentInRawMetadata()
    {
        var recipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = "High Fidelity Pasta",
                AddedBy = _factory.DefaultFamilyMemberId,
                RawMetadata = """
                {
                    "recipeInstructions": [
                        {
                            "@type": "HowToSection",
                            "name": "The Sauce",
                            "itemListElement": [
                                { "@type": "HowToStep", "text": "Sauté garlic" },
                                { "@type": "HowToStep", "text": "Add tomatoes" }
                            ]
                        },
                        {
                            "@type": "HowToSection",
                            "name": "The Pasta",
                            "itemListElement": [
                                { "@type": "HowToStep", "text": "Boil water" },
                                { "@type": "HowToStep", "text": "Cook pasta" }
                            ]
                        }
                    ]
                }
                """,
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            });
            await db.SaveChangesAsync();

            var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
            await store.SaveHeroImageAsync(recipeId, new MemoryStream(MinimalJpeg));
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/recipes/{recipeId}/share");
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var exportedRecipe = doc.RootElement.GetProperty("recipe");
        var instructions = exportedRecipe.GetProperty("instructions");

        Assert.Equal(2, instructions.GetArrayLength());
        Assert.Equal("The Sauce", instructions[0].GetProperty("name").GetString());
        Assert.Equal(2, instructions[0].GetProperty("itemListElement").GetArrayLength());
        Assert.Equal("Sauté garlic", instructions[0].GetProperty("itemListElement")[0].GetProperty("text").GetString());
        Assert.Equal("The Pasta", instructions[1].GetProperty("name").GetString());
    }

    [Fact]
    public async Task GetShareBundle_WrapsFlatInstructions_InDefaultSection()
    {
        var recipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = "Flat Instruction Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                RawMetadata = """{"recipeInstructions":["Step 1","Step 2"]}""",
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            });
            await db.SaveChangesAsync();

            var store = scope.ServiceProvider.GetRequiredService<IRecipeStore>();
            await store.SaveHeroImageAsync(recipeId, new MemoryStream(MinimalJpeg));
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/recipes/{recipeId}/share");
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var exportedRecipe = doc.RootElement.GetProperty("recipe");
        var instructions = exportedRecipe.GetProperty("instructions");

        Assert.Equal(1, instructions.GetArrayLength());
        Assert.Equal("Instructions", instructions[0].GetProperty("name").GetString());
        Assert.Equal(2, instructions[0].GetProperty("itemListElement").GetArrayLength());
        Assert.Equal("Step 1", instructions[0].GetProperty("itemListElement")[0].GetProperty("text").GetString());
    }

    [Fact]
    public async Task GetShareBundle_ReturnsBadRequest_IfHeroIsMissing()
    {
        var recipeId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var now = DateTimeOffset.UtcNow;

            db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = "No Hero Recipe",
                AddedBy = _factory.DefaultFamilyMemberId,
                IsReady = true,
                CreatedAt = now,
                UpdatedAt = now
            });
            await db.SaveChangesAsync();
            
            // NOTE: We do NOT save a hero image here.
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/recipes/{recipeId}/share");
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("hero image", json);
    }

    [Fact]
    public async Task ImportBundle_WithUnsupportedVersion_ReturnsBadRequest()
    {
        var request = BuildBundleRequest(
            new
            {
                version = "99.0",
                recipe = new
                {
                    name = "Imported",
                    ingredients = new[] { "A" },
                    instructions = new[]
                    {
                        new { name = "Instructions", itemListElement = new[] { new { text = "B" } } }
                    },
                    isSynthesized = true,
                },
                info = new
                {
                    exportedAtUtc = "2026-05-14T16:00:00Z",
                    bundleSource = "wfs-share",
                    appVersion = "0.1.0",
                },
                hero = (object?)null,
                originals = Array.Empty<object>(),
            });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ImportBundle_WithMalformedPayload_ReturnsBadRequest()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/import-bundle")
        {
            Content = new StringContent("""{"version":"1.0","recipe":null}""", Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ImportBundle_WithValidPayload_CreatesReadyRecipe_AndPreservesSynthesizedFlag()
    {
        var request = BuildBundleRequest(
            new
            {
                version = "1.0",
                recipe = new
                {
                    name = "Imported Shared Recipe",
                    description = "Bundle import description",
                    ingredients = new[] { "1 onion", "2 carrots" },
                    instructions = new[]
                    {
                        new
                        {
                            name = "Instructions",
                            itemListElement = new[]
                            {
                                new { text = "Chop vegetables" },
                                new { text = "Simmer gently" }
                            }
                        }
                    },
                    prepTimeMinutes = 10,
                    cookTimeMinutes = 20,
                    totalTimeMinutes = 30,
                    servings = 4,
                    sourceUrl = "https://example.com/imported-shared-recipe",
                    sourceName = "Bundle Sender",
                    category = "Soup",
                    isSynthesized = true,
                },
                info = new
                {
                    exportedAtUtc = "2026-05-14T16:00:00Z",
                    bundleSource = "wfs-share",
                    appVersion = "0.1.0",
                },
                hero = new
                {
                    mimeType = "image/jpeg",
                    base64 = Convert.ToBase64String(MinimalJpeg),
                },
                originals = new[]
                {
                    new
                    {
                        mimeType = "image/jpeg",
                        base64 = Convert.ToBase64String(MinimalJpeg),
                    },
                },
            });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        var recipeId = data.GetProperty("id").GetGuid();

        Assert.Equal("Imported Shared Recipe", data.GetProperty("name").GetString());
        Assert.True(data.GetProperty("isReady").GetBoolean());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.FindAsync(recipeId);

        Assert.NotNull(recipe);
        Assert.True(recipe!.IsReady);
        Assert.True(recipe.IsSynthesized);
        Assert.Equal("Imported Shared Recipe", recipe.Name);
        Assert.Equal("Bundle import description", recipe.Description);
        Assert.Equal("https://example.com/imported-shared-recipe", recipe.SourceUrl);
        Assert.Equal("Soup", recipe.Category);
    }

    [Fact]
    public async Task ImportBundle_RestoresNotesAndRating_WhenPresentInBundle()
    {
        var request = BuildBundleRequest(
            new
            {
                version = "1.0",
                recipe = new
                {
                    name = "Full Fidelity Recipe",
                    ingredients = new[] { "A" },
                    instructions = new[]
                    {
                        new { name = "Instructions", itemListElement = new[] { new { text = "B" } } }
                    },
                    notes = "Restored note",
                    rating = 3, // Love
                    isSynthesized = true,
                },
                info = new
                {
                    exportedAtUtc = "2026-05-14T16:00:00Z",
                    bundleSource = "wfs-share",
                },
                hero = (object?)null,
                originals = Array.Empty<object>(),
            });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        var recipeId = data.GetProperty("id").GetGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.FindAsync(recipeId);

        Assert.NotNull(recipe);
        Assert.Equal("Restored note", recipe!.Notes);
        Assert.Equal(RecipeRating.Love, recipe.Rating);
    }

    private HttpRequestMessage BuildBundleRequest<TBody>(TBody body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/import-bundle")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());
        return request;
    }
}
