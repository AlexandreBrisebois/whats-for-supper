using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeSynthesisCanonicalTests
{
    [Theory]
    [InlineData("valid")]
    [InlineData("malformed")]
    [InlineData("missing-name")]
    public async Task DescribeBootstrap_RealSynthesisPublishesCanonicalGeneratedFactsOrHonestEmptyFallback(string mode)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
            new Integration.DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") }, new()
        { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true" });
        await QualifySynthesisAsync(factory, mode);
    }

    internal static async Task QualifySynthesisAsync(TestWebApplicationFactory factory, string mode)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var storage = services.GetRequiredService<IStorageProvider>();
        await storage.SaveAsync("workflows", "goto-synthesis.yaml", await File.ReadAllTextAsync(Path.Combine(
            Integration.DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/goto-synthesis.yaml")));
        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        const string description = "Make a simple pasta supper.";
        using var response = await client.PostAsJsonAsync("/api/recipes/describe", new { name = "Requested pasta", description });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetGuid();
        var db = services.GetRequiredService<RecipeDbContext>();
        var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "goto-synthesis");
        var task = Assert.Single(workflow.Tasks, x => x.ProcessorName == "SynthesizeRecipe");
        const string source = """{"name":"Synthesized pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","salt to taste"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}}],"recipeInstructions":[{"name":"Cook","itemListElement":[{"text":"Cook all 200 g pasta for 10 minutes."}]}]}""";
        var chat = new Mock<IChatClient>();
        var calls = 0;
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<ChatMessage> messages, ChatOptions _, CancellationToken _) =>
            {
                calls++;
                var result = messages.Any(x => x.Text.StartsWith("Description: ", StringComparison.Ordinal))
                    ? mode == "valid" ? source : mode == "malformed" ? "not valid JSON" : "{}"
                    : "A generated pasta dish.";
                return new ChatResponse(new ChatMessage(ChatRole.Assistant, result));
            });
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Generate the selected recipe response.");
        var agent = ActivatorUtilities.CreateInstance<RecipeAgent>(services, chat.Object, prompts.Object, "SynthesizeRecipe");
        var returned = await agent.ExecuteAsync(task, default);
        db.ChangeTracker.Clear();
        var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var canonical = StructuredRecipeContentStore.Read(saved);
        Assert.NotNull(canonical);
        Assert.True(saved.IsSynthesized);
        Assert.False(saved.IsReady);
        if (mode == "valid")
        {
            Assert.Equal(4, saved.Servings);
            Assert.Equal(4, canonical.Servings);
            Assert.Equal("200", canonical.IngredientLines[0].Amount!.Value!.N);
            Assert.Equal("g", canonical.IngredientLines[0].Unit!.Text);
            Assert.Equal(new[] { "200 g pasta", "salt to taste" }, canonical.IngredientLines.Select(StructuredRecipeContentStore.Render));
            Assert.All(canonical.IngredientLines, line =>
            {
                Assert.Equal("source", line.Provenance.Origin);
                Assert.Equal(canonical.SourceRevision, line.Provenance.SourceRef);
            });
        }
        else
        {
            Assert.Equal(description, saved.Name);
            Assert.Empty(canonical.IngredientLines);
            Assert.Empty(canonical.InstructionSections);
            Assert.Null(canonical.Servings);
        }
        var beforeReplay = calls;
        await agent.ExecuteAsync(task, default);
        Assert.Equal(beforeReplay, calls);

        var recipeStore = services.GetRequiredService<IRecipeStore>();
        await using (var heroStream = new MemoryStream([1, 2, 3]))
            await recipeStore.SaveHeroImageAsync(id, heroStream, default);

        var sync = Assert.Single(workflow.Tasks, x => x.ProcessorName == "SyncRecipe");
        var syncProcessor = ActivatorUtilities.CreateInstance<SyncRecipeProcessor>(services);
        var syncReturned = await syncProcessor.ExecuteAsync(sync, default);
        var validateSync = typeof(SyncRecipeProcessor).GetMethod("ValidateOriginalHistory", BindingFlags.Static | BindingFlags.NonPublic)!;
        Assert.Equal(id, validateSync.Invoke(null, [sync.Payload, JsonSerializer.Serialize(syncReturned, JsonDefaults.CamelCase),
            workflow, sync.TaskId, false]));

        var categorization = Assert.Single(workflow.Tasks, x => x.ProcessorName == "CategorizeRecipe");
        var catChat = new Mock<IChatClient>();
        catChat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, """{"cuisineType":"Italian","mealTypes":["Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
        var categorizeProcessor = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, catChat.Object);
        await categorizeProcessor.ExecuteAsync(categorization, default);
        db.ChangeTracker.Clear();
        var completed = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal("Supper", completed.Category);
        Assert.Equal(saved.CanonicalContent, completed.CanonicalContent);

        var ready = Assert.Single(workflow.Tasks, x => x.ProcessorName == "RecipeReady");
        var readyProcessor = ActivatorUtilities.CreateInstance<RecipeReadyProcessor>(services);
        await readyProcessor.ExecuteAsync(ready, default);
        await readyProcessor.ExecuteAsync(ready, default);
        db.ChangeTracker.Clear();
        var finalized = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.True(finalized.IsReady);
        Assert.True(finalized.IsSynthesized);
        Assert.Equal(saved.CanonicalContent, finalized.CanonicalContent);
        var read = await client.GetFromJsonAsync<RecipeDetailResponseDto>($"/api/recipes/{id}");
        Assert.Equal("synthesized", read!.Recipe.SourceType);
        if (mode == "valid")
        {
            const string week = "2026-10-12";
            var portions = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule/servings?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
            using var chosen = await client.PutAsJsonAsync("/api/schedule/servings", new
            {
                referenceWeekStartDate = week, weekOffset = 0, expectedVersion = portions.GetProperty("version").GetString(),
                days = new[] { new { date = week, servings = 8 } }
            });
            Assert.Equal(HttpStatusCode.OK, chosen.StatusCode);
            using var assigned = await client.PostAsJsonAsync($"/api/schedule/assign?referenceWeekStartDate={week}",
                new { weekOffset = 0, dayIndex = 0, recipeId = id, requireEmpty = true });
            Assert.Equal(HttpStatusCode.OK, assigned.StatusCode);
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
            var schedule = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
            var pasta = Assert.Single(schedule.GetProperty("groceryItems").EnumerateArray(), row => row.GetProperty("normalizedKey").GetString() == "pasta");
            Assert.Equal("400", pasta.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
            Assert.Equal("1", pasta.GetProperty("quantity").GetProperty("value").GetProperty("d").GetString());
            using var cleared = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            {
                expectedContentRevision = canonical.ContentRevision, servings = 4,
                ingredientLines = canonical.IngredientLines.Select((line, index) => new
                {
                    id = line.Id, description = line.Description,
                    amount = index == 0 ? null : line.Amount, amountText = index == 0 ? null : line.AmountText,
                    unit = line.Unit is null ? null : new RecipeUnitDto(line.Unit.Text, line.Unit.DefinitionId),
                    scaling = line.Scaling, package = line.Package, shopping = line.Shopping
                }).ToArray()
            });
            Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
            db.ChangeTracker.Clear();
            var human = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var protectedContent = StructuredRecipeContentStore.Read(human)!;
            Assert.Null(protectedContent.IngredientLines[0].Amount);
            Assert.Contains("amount", protectedContent.IngredientLines[0].Provenance.ProtectedFields);
            var callsBeforeLateReplay = calls;
            await agent.ExecuteAsync(task, default);
            Assert.Equal(callsBeforeLateReplay, calls);
            db.ChangeTracker.Clear();
            var afterReplay = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal(human.CanonicalContent, afterReplay.CanonicalContent);
            Assert.Equal(human.RawMetadata, afterReplay.RawMetadata);
            Assert.Equal([1, 2, 3], await services.GetRequiredService<RecipeRepository>().StorageProvider.LoadAsync("recipes", $"{id}/hero.webp"));
        }
    }

    [Fact]
    public async Task SynthesizeRecipe_TolerantSchemaOrgPayload_WritesSchemaOrgWithoutPublicationsAndResolvesBilingualFoodIds()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
            new Integration.DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") }, new()
            {
                ["Calendar:TimeZone"] = "America/Toronto",
                ["Tests:LocalRecipeStore"] = "true",
                ["Tests:RealWorkflowOrchestrator"] = "true"
            });
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var storage = services.GetRequiredService<IStorageProvider>();
        await storage.SaveAsync("workflows", "goto-synthesis.yaml", await File.ReadAllTextAsync(Path.Combine(
            Integration.DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/goto-synthesis.yaml")));
        await services.GetRequiredService<FoodVocabularySeeder>().EnsureSeededAsync(default);

        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var response = await client.PostAsJsonAsync("/api/recipes/describe", new { name = "Bilingual Beef Skillet", description = "Savory beef skillet" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetGuid();

        var db = services.GetRequiredService<RecipeDbContext>();
        var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "goto-synthesis");
        var synthTask = Assert.Single(workflow.Tasks, x => x.ProcessorName == "SynthesizeRecipe");

        const string tolerantSchemaOrg = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Bilingual Beef Skillet",
              "recipeYield": "4 portions",
              "recipeIngredient": [
                "500 g ground beef",
                "30 ml of All-Purpose Flour",
                "2 c. à soupe d'huile d'olive",
                "1 onion, diced",
                "Salt"
              ],
              "supply": [
                { "@type": "HowToSupply", "name": "Ground beef", "requiredQuantity": { "@type": "QuantitativeValue", "value": 500, "unitText": "g" } },
                { "@type": "HowToSupply", "name": "All-purpose flour", "requiredQuantity": { "@type": "QuantitativeValue", "value": 30, "unitText": "ml" } },
                { "@type": "HowToSupply", "name": "Olive oil", "requiredQuantity": { "@type": "QuantitativeValue", "value": 2, "unitText": "tablespoon" } },
                { "@type": "HowToSupply", "name": "Onion", "requiredQuantity": { "@type": "QuantitativeValue", "value": 1 } },
                { "@type": "HowToSupply", "name": "Salt" }
              ],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Brown 500 g ground beef with 1 onion, diced." }] }
              ]
            }
            """;

        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<ChatMessage> messages, ChatOptions _, CancellationToken _) =>
            {
                var text = messages.Any(x => x.Text.StartsWith("Description: ", StringComparison.Ordinal))
                    ? tolerantSchemaOrg
                    : """{"cuisineType":"Canadian","mealTypes":["Supper"],"primaryMealType":"Supper","isVegetarian":false}""";
                return new ChatResponse(new ChatMessage(ChatRole.Assistant, text));
            });
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Prompt");

        var agent = ActivatorUtilities.CreateInstance<RecipeAgent>(services, chat.Object, prompts.Object, "SynthesizeRecipe");
        await agent.ExecuteAsync(synthTask, default);

        var recipeRepo = services.GetRequiredService<RecipeRepository>();
        var rawDiskJson = await recipeRepo.GetRecipeJsonAsync(id, default);
        using var diskDoc = JsonDocument.Parse(rawDiskJson);
        Assert.Equal("https://schema.org/", diskDoc.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Recipe", diskDoc.RootElement.GetProperty("@type").GetString());
        Assert.False(diskDoc.RootElement.TryGetProperty("format", out _));
        Assert.False(diskDoc.RootElement.TryGetProperty("backupContentVersion", out _));

        var root = services.GetRequiredService<RecipesRootResolver>().Root;
        Assert.False(Directory.Exists(Path.Combine(root, id.ToString(), ".publications")));

        db.ChangeTracker.Clear();
        var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var structured = StructuredRecipeContentStore.Read(saved);
        Assert.NotNull(structured);
        Assert.Equal(4, structured.Servings);
        Assert.Equal(5, structured.IngredientLines.Count);
        Assert.Equal("500", structured.IngredientLines[0].Amount?.Value?.N);
        Assert.Equal("30", structured.IngredientLines[1].Amount?.Value?.N);
        Assert.Equal("2", structured.IngredientLines[2].Amount?.Value?.N);
        Assert.Equal("1", structured.IngredientLines[3].Amount?.Value?.N);
        Assert.Null(structured.IngredientLines[4].Amount);
        Assert.Contains(structured.IngredientLines, l => l.Shopping.FoodId is not null);

        var categorizeTask = Assert.Single(workflow.Tasks, x => x.ProcessorName == "CategorizeRecipe");
        var categorizeProcessor = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object);
        await categorizeProcessor.ExecuteAsync(categorizeTask, default);

        var readyTask = Assert.Single(workflow.Tasks, x => x.ProcessorName == "RecipeReady");
        var readyProcessor = ActivatorUtilities.CreateInstance<RecipeReadyProcessor>(services);
        await readyProcessor.ExecuteAsync(readyTask, default);

        db.ChangeTracker.Clear();
        var finalized = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.True(finalized.IsReady);
        Assert.Equal("Canadian", finalized.CuisineType);
    }
}
