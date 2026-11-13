using System.ClientModel;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OpenAI;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

// Explicit qualification only: never calls a paid provider in ordinary test runs.
public class RecipeServingsProviderQualificationTests(ITestOutputHelper output)
{
    [ProviderFact]
    public async Task ProviderQualification_AllOriginalPagesRetainTwoTwoFourAndPrintedQuantities()
    {
        var root = TomorrowPushPostgresTests.Root();
        var evidence = Path.Combine(root, ".task", "servings", "provider"); Directory.CreateDirectory(evidence);
        var configuration = new ConfigurationManager(); configuration.AddEnvironmentVariables();
        var model = configuration["GEMINI_MODEL_ID"] ?? "gemini-3-flash-preview";
        var endpoint = configuration["GEMINI_ENDPOINT"] ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
        var key = configuration["GEMINI_API_KEY"] ?? throw new InvalidOperationException("GEMINI_API_KEY required for explicit provider qualification.");
        var prompts = new EmbeddedPromptRepository();
        var cases = new[] {
            (Id: "6f0a0897-9066-4cf4-89ed-f78750311432", Count: 2, Quantities: new[] { "360", "500" }),
            (Id: "6fe2e84a-b531-4cae-85e0-e8877db99930", Count: 2, Quantities: new[] { "2", "225" }),
            (Id: "7f823333-47c3-4dd3-ab85-6ff649477b5e", Count: 4, Quantities: new[] { "510", "340" }),
        };
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            foreach (var example in cases) {
                var storage = new InMemoryStorageProvider(); var repository = new RecipeRepository(storage);
                var id = Guid.NewGuid(); var folder = Path.Combine(root, "data", "recipes", example.Id, "original");
                var files = Directory.GetFiles(folder, "*.jpg").Order().ToArray(); Assert.Equal(2, files.Length);
                var inputs = new Dictionary<string, string>();
                foreach (var file in files) {
                    var bytes = await File.ReadAllBytesAsync(file); inputs[Path.GetFileName(file)] = Convert.ToHexString(SHA256.HashData(bytes));
                    await storage.SaveAsync("recipes", $"{id}/original/{Path.GetFileName(file)}", bytes);
                }
                await repository.SaveInfoAsync(new RecipeInfo { Id = id, ImageCount = files.Length }, CancellationToken.None);
                db.Recipes.Add(new Recipe { Id = id, IsReady = true }); await db.SaveChangesAsync();
                var api = new OpenAIClient(new ApiKeyCredential(key), new OpenAIClientOptions { Endpoint = new Uri(endpoint), NetworkTimeout = TimeSpan.FromMinutes(5) }).GetChatClient(model).AsIChatClient();
                using var chat = new RecordingClient(api, Path.Combine(evidence, example.Id));
                var agent = new RecipeAgent(chat, prompts, configuration, NullLogger<RecipeAgent>.Instance,
            new RecipeFilePublicationStore(db, repository, new SystemClock(), new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new ConfigurationManager())), TestPublicationStore.Vocabulary(db, repository.StorageProvider, new SystemClock())), "ExtractRecipe");
                var producer = await RecipeServingsTests.ProducerTask(db, repository, id);
                await agent.ExecuteAsync(producer, CancellationToken.None);
                var normalized = await repository.GetRecipeJsonAsync(id, CancellationToken.None);
                await RecipeServingsTests.Sync(db, repository, producer);
                db.ChangeTracker.Clear();
                var saved = await db.Recipes.SingleAsync(r => r.Id == id);
                using var client = factory.CreateAuthenticatedClient(); var response = await client.GetAsync($"/api/recipes/{id}");
                var detail = await response.Content.ReadAsStringAsync();
                var record = new {
                    provider = "Gemini OpenAI-compatible endpoint", model, endpoint, inputs,
                    promptSha256 = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(prompts.GetPrompt(PromptType.RecipeExtraction)))),
                    targetLanguage = configuration["IMPORT_TARGET_LANGUAGE"], normalized = JsonDocument.Parse(normalized).RootElement,
                    httpStatus = (int)response.StatusCode, detail = JsonDocument.Parse(detail).RootElement,
                    runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                    assemblySha256 = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(typeof(RecipeAgent).Assembly.Location))),
                };
                await File.WriteAllTextAsync(Path.Combine(evidence, example.Id + ".json"), JsonSerializer.Serialize(record, new JsonSerializerOptions { WriteIndented = true }));
                Assert.Equal(example.Count, saved.Servings);
                Assert.Equal(200, (int)response.StatusCode);
                Assert.Equal(example.Count, JsonDocument.Parse(detail).RootElement.GetProperty("recipe").GetProperty("servings").GetInt32());
                var ingredients = string.Join("\n", RecipeService.DeserializeIngredients(saved.Ingredients));
                foreach (var amount in example.Quantities) Assert.Matches($@"\b{amount}\b", ingredients);
                var info = JsonDocument.Parse((await storage.LoadAsync("recipes", $"{id}/recipe.info"))!).RootElement;
                Assert.False(info.TryGetProperty("servings", out _)); Assert.False(info.TryGetProperty("recipeYield", out _));
                foreach (var file in files) Assert.Equal(inputs[Path.GetFileName(file)], Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(file))));
            }
        });
    }

    private sealed class RecordingClient(IChatClient inner, string prefix) : DelegatingChatClient(inner)
    {
        private int sequence;
        public override async Task<ChatResponse> GetResponseAsync(IEnumerable<ChatMessage> messages, ChatOptions? options = null, CancellationToken cancellationToken = default)
        {
            var result = await base.GetResponseAsync(messages, options, cancellationToken);
            await File.WriteAllTextAsync(prefix + $"-response-{++sequence}.json", JsonSerializer.Serialize(new { result.ModelId, result.Text }), cancellationToken);
            return result;
        }
    }

    public sealed class ProviderFactAttribute : DeploymentCalendarPostgresTests.CalendarPostgresFactAttribute
    {
        public ProviderFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("WFS_SERVINGS_PROVIDER") != "1") Skip = "Explicit isolated Gemini/image qualification requires WFS_SERVINGS_PROVIDER=1.";
        }
    }
}
