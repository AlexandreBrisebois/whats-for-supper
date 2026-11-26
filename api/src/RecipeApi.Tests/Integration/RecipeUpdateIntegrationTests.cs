using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeUpdateIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Theory]
    [InlineData("Less chilli")]
    [InlineData("")]
    public async Task UpdateRecipe_Notes_PersistsExactTextForFreshDetailRead(string notes)
    {
        var id = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = id, Name = "Family notes", Notes = "Original note", IsReady = true });
        await _db.SaveChangesAsync();
        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = id, Name = "Family notes" });
        var response = await _client.PatchAsJsonAsync($"/api/recipes/{id}", new { notes });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _db.ChangeTracker.Clear();
        Assert.Equal(notes, (await _db.Recipes.FindAsync(id))!.Notes);
        using var detail = JsonDocument.Parse(await _client.GetStringAsync($"/api/recipes/{id}"));
        Assert.Equal(notes, detail.RootElement.GetProperty("recipe").GetProperty("notes").GetString());
    }

    [Fact]
    public async Task UpdateRecipe_WithInstructions_UpdatesDbAndRecipeInfo()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var initialInstructions = new[] { "Step 1", "Step 2" };
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Instruction Test Recipe",
            RawMetadata = JsonSerializer.Serialize(new { recipeInstructions = initialInstructions }),
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = recipeId, Name = "Instruction Test Recipe" });

        var newInstructions = new[] { "Updated Step 1", "Updated Step 2", "New Step 3" };
        var updateDto = new
        {
            recipeInstructions = newInstructions
        };

        // Act
        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify DB update
        var updatedRecipe = await _db.Recipes.FindAsync(recipeId);
        _db.Entry(updatedRecipe!).Reload();
        Assert.NotNull(updatedRecipe!.RawMetadata);
        
        using var doc = JsonDocument.Parse(updatedRecipe.RawMetadata);
        var instructions = doc.RootElement.GetProperty("recipeInstructions");
        Assert.Equal(3, instructions.GetArrayLength());
        Assert.Equal("Updated Step 1", instructions[0].GetString());

        // Verify recipe.info update
        var info = await store.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.NotNull(info.RecipeInstructions);
        var infoInstructions = (JsonElement)info.RecipeInstructions;
        Assert.Equal(3, infoInstructions.GetArrayLength());
        Assert.Equal("Updated Step 1", infoInstructions[0].GetString());

        _factory.WorkflowOrchestratorMock.Verify(o => o.TriggerAsync(
            "index-recipe-search",
            It.Is<Dictionary<string, string>>(parameters => parameters["recipeId"] == recipeId.ToString()),
            It.IsAny<DateTimeOffset?>()),
            Times.Once);
        _factory.WorkflowOrchestratorMock.Verify(o => o.TriggerAsync(
            "recipe_ready",
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<DateTimeOffset?>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateRecipe_StructuredEdit_SynchronizesSchemaOrgRecipeOnDiskAndRetainsExtensions()
    {
        var recipeId = Guid.NewGuid();
        const string initialRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Pasta Bake",
              "recipeYield": "4 portions",
              "recipeIngredient": ["200 g pasta", "salt"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "Prep", "itemListElement": [{ "@type": "HowToStep", "text": "Boil pasta." }] }
              ],
              "nutrition": { "@type": "NutritionInformation", "calories": "420 calories" },
              "suggestedPairing": "Crisp green salad"
            }
            """;
        var (content, evidence) = RecipeApi.Services.StructuredRecipeContentStore.FromSchemaOrg(
            recipeId, initialRaw, null, null, Guid.NewGuid(), "source");
        var webJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Pasta Bake",
            Servings = 4,
            RawMetadata = initialRaw,
            StructuredContent = JsonSerializer.Serialize(content, webJson),
            FoodMappingEvidence = evidence,
            Ingredients = JsonSerializer.Serialize(content.IngredientLines.Select(RecipeApi.Services.StructuredRecipeContentStore.Render), webJson),
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = recipeId, Name = "Pasta Bake", IsReady = true });
        await store.WriteRecipeJsonAsync(recipeId, initialRaw);

        var line0 = content.IngredientLines[0];
        var section0 = content.InstructionSections[0];
        var step0 = section0.Steps[0];
        var patch = new
        {
            expectedContentRevision = content.ContentRevision,
            servings = 6,
            ingredientLines = new object[]
            {
                new
                {
                    id = line0.Id,
                    description = "rigatoni pasta",
                    amount = new { kind = "scalar", value = new { n = "300", d = "1" } },
                    amountText = "300",
                    unit = new { text = "g", definitionId = (string?)null },
                    scaling = "proportional",
                    package = (object?)null,
                    shopping = new { name = "rigatoni pasta", foodId = (Guid?)null, mappingRevision = (string?)null }
                }
            },
            instructionSections = new object[]
            {
                new
                {
                    id = section0.Id,
                    name = "Boil & Bake",
                    steps = new object[]
                    {
                        new { id = step0.Id, text = "Boil rigatoni pasta until al dente." }
                    }
                }
            }
        };

        var response = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", patch);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var diskJson = await store.ReadRecipeJsonAsync(recipeId);
        Assert.NotNull(diskJson);
        using var doc = JsonDocument.Parse(diskJson);
        Assert.Equal("https://schema.org/", doc.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Recipe", doc.RootElement.GetProperty("@type").GetString());
        Assert.False(doc.RootElement.TryGetProperty("format", out _));
        Assert.Equal("6 portions", doc.RootElement.GetProperty("recipeYield").GetString());
        Assert.Contains("300 g rigatoni pasta", doc.RootElement.GetProperty("recipeIngredient")[0].GetString());
        Assert.Equal("rigatoni pasta", doc.RootElement.GetProperty("supply")[0].GetProperty("name").GetString());
        Assert.Equal("Boil & Bake", doc.RootElement.GetProperty("recipeInstructions")[0].GetProperty("name").GetString());
        Assert.Equal("420 calories", doc.RootElement.GetProperty("nutrition").GetProperty("calories").GetString());
        Assert.Equal("Crisp green salad", doc.RootElement.GetProperty("suggestedPairing").GetString());
    }

    [Fact]
    public async Task UpdateRecipe_TotalTime_UpdatesClearsAndPreservesAcrossDbInfoAndJson()
    {
        var recipeId = Guid.NewGuid();
        const string initialRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Quick Tacos",
              "totalTime": "PT20M",
              "recipeIngredient": ["200 g beef"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Brown beef." }] }
              ]
            }
            """;
        var (content, evidence) = RecipeApi.Services.StructuredRecipeContentStore.FromSchemaOrg(
            recipeId, initialRaw, null, null, Guid.NewGuid(), "source");
        var webJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Quick Tacos",
            TotalTime = "PT20M",
            RawMetadata = initialRaw,
            StructuredContent = JsonSerializer.Serialize(content, webJson),
            FoodMappingEvidence = evidence,
            Ingredients = JsonSerializer.Serialize(content.IngredientLines.Select(RecipeApi.Services.StructuredRecipeContentStore.Render), webJson),
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        var store = _factory.Services.GetRequiredService<IRecipeStore>();
        await store.WriteInfoAsync(new RecipeInfo { Id = recipeId, Name = "Quick Tacos", TotalTime = "PT20M", IsReady = true });
        await store.WriteRecipeJsonAsync(recipeId, initialRaw);

        // 1. Omitting totalTime preserves existing value
        var omitResponse = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new { name = "Quick Beef Tacos" });
        Assert.Equal(HttpStatusCode.OK, omitResponse.StatusCode);
        _db.ChangeTracker.Clear();
        Assert.Equal("PT20M", (await _db.Recipes.FindAsync(recipeId))!.TotalTime);
        Assert.Equal("PT20M", (await store.ReadInfoAsync(recipeId))!.TotalTime);

        // 2. Updating totalTime persists to DB, detail DTO, recipe.info, and recipe.json
        var updateResponse = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new { totalTime = "PT45M" });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        using (var updateBody = JsonDocument.Parse(await updateResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal("PT45M", updateBody.RootElement.GetProperty("recipe").GetProperty("totalTime").GetString());
        }
        _db.ChangeTracker.Clear();
        Assert.Equal("PT45M", (await _db.Recipes.FindAsync(recipeId))!.TotalTime);
        Assert.Equal("PT45M", (await store.ReadInfoAsync(recipeId))!.TotalTime);
        using (var diskDoc = JsonDocument.Parse((await store.ReadRecipeJsonAsync(recipeId))!))
        {
            Assert.Equal("PT45M", diskDoc.RootElement.GetProperty("totalTime").GetString());
        }

        // 3. Clearing totalTime with null clears DB, detail DTO, recipe.info, and recipe.json
        var clearResponse = await _client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new { totalTime = (string?)null });
        Assert.Equal(HttpStatusCode.OK, clearResponse.StatusCode);
        _db.ChangeTracker.Clear();
        Assert.Null((await _db.Recipes.FindAsync(recipeId))!.TotalTime);
        Assert.Null((await store.ReadInfoAsync(recipeId))!.TotalTime);
        using (var diskDoc = JsonDocument.Parse((await store.ReadRecipeJsonAsync(recipeId))!))
        {
            Assert.True(!diskDoc.RootElement.TryGetProperty("totalTime", out var tt) || tt.ValueKind == JsonValueKind.Null);
        }
    }
}
