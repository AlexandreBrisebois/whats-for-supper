using System.Net;
using System.Net.Http.Json;
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
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeProtectedReimportPostgresTests(ITestOutputHelper output)
{
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task GuidedIngredientRepair_PreservesHumanEditedIngredientsAndWritesSchemaOrgRecipe() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:LocalRecipeStore"] = "true",
                ["Tests:RealWorkflowOrchestrator"] = "true",
                ["Tests:PostgresConnectionString"] = settings.ConnectionString
            });

            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipeStore = services.GetRequiredService<IRecipeStore>();
            var recipeRepository = services.GetRequiredService<RecipeRepository>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            var clock = services.GetRequiredService<IClock>();

            var recipeId = Guid.NewGuid();
            const string initialJson = """
                {
                  "@context": "https://schema.org/",
                  "@type": "Recipe",
                  "name": "Tomato Soup",
                  "recipeYield": "4 portions",
                  "recipeIngredient": ["500 g tomatoes", "1 onion"],
                  "recipeInstructions": [
                    { "@type": "HowToSection", "itemListElement": [{ "@type": "HowToStep", "text": "Simmer 20 minutes." }] }
                  ]
                }
                """;
            var (initialContent, initialEvidence) = StructuredRecipeContentStore.FromSchemaOrg(
                recipeId, initialJson, sourceUrl: null, authority: null, operationId: Guid.NewGuid(), origin: "source");

            // Mark first ingredient as human-protected
            var lines = initialContent.IngredientLines.ToArray();
            lines[0] = lines[0] with
            {
                Description = "heirloom tomatoes",
                Provenance = lines[0].Provenance with
                {
                    Origin = "human",
                    ProtectedFields = ["description", "amount", "amountText", "unit"]
                }
            };
            var protectedContent = initialContent with { IngredientLines = lines };

            await recipeStore.SaveOriginalImageAsync(recipeId, 0, "image/jpeg", new MemoryStream([1, 2, 3]), default);
            await recipeStore.WriteInfoAsync(new RecipeInfo { Id = recipeId, Name = "Tomato Soup", ImageCount = 1, IsReady = true }, default);
            await recipeStore.WriteRecipeJsonAsync(recipeId, initialJson, default);

            db.Recipes.Add(new Recipe
            {
                Id = recipeId,
                Name = "Tomato Soup",
                ImageCount = 1,
                IsReady = true,
                AddedBy = factory.DefaultFamilyMemberId,
                RawMetadata = initialJson,
                StructuredContent = JsonSerializer.Serialize(protectedContent, WebJson),
                FoodMappingEvidence = initialEvidence,
                Servings = protectedContent.Servings,
                Ingredients = JsonSerializer.Serialize(protectedContent.IngredientLines.Select(StructuredRecipeContentStore.Render), WebJson),
                CreatedAt = clock.UtcNow,
                UpdatedAt = clock.UtcNow
            });
            db.RecipeImportReports.Add(new RecipeImportReport
            {
                RecipeId = recipeId,
                Reasons = ["ingredients"],
                Note = "Second ingredient should be 2 onions",
                Status = RecipeImportReportStatus.Reimporting,
                ReportedBy = factory.DefaultFamilyMemberId,
                UpdatedBy = factory.DefaultFamilyMemberId,
                CreatedAt = clock.UtcNow,
                UpdatedAt = clock.UtcNow
            });
            await db.SaveChangesAsync();

            var chat = new Mock<IChatClient>();
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, """
                    {
                      "@context": "https://schema.org/",
                      "@type": "Recipe",
                      "name": "Tomato Soup",
                      "recipeYield": "4 portions",
                      "recipeIngredient": ["500 g tomatoes", "2 onion"],
                      "recipeInstructions": [
                        { "@type": "HowToSection", "itemListElement": [{ "@type": "HowToStep", "text": "Simmer 20 minutes." }] }
                      ]
                    }
                    """)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe.");

            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                "ExtractRecipe", db, recipeStore, recipeRepository, vocabulary, clock);
            await agent.ExecuteAsync(new WorkflowTask
            {
                TaskId = Guid.NewGuid(),
                Payload = JsonSerializer.Serialize(new { recipeId, repairReasons = "ingredients", repairNote = "Second ingredient should be 2 onions" })
            }, CancellationToken.None);

            db.ChangeTracker.Clear();
            var repaired = await db.Recipes.AsNoTracking().SingleAsync(r => r.Id == recipeId);
            var repairedContent = StructuredRecipeContentStore.Read(repaired)!;
            Assert.Contains(repairedContent.IngredientLines, l => l.Description == "heirloom tomatoes");
            Assert.Contains(repairedContent.IngredientLines, l => l.Description.Contains("onion", StringComparison.OrdinalIgnoreCase));

            var savedJson = await recipeStore.ReadRecipeJsonAsync(recipeId, default);
            Assert.NotNull(savedJson);
            using var doc = JsonDocument.Parse(savedJson);
            Assert.Equal("https://schema.org/", doc.RootElement.GetProperty("@context").GetString());
            Assert.Equal("Recipe", doc.RootElement.GetProperty("@type").GetString());
            Assert.False(doc.RootElement.TryGetProperty("format", out _));
            Assert.False(Directory.Exists(Path.Combine(services.GetRequiredService<RecipesRootResolver>().Root, recipeId.ToString(), ".publications")));
        });
}
