using Agent.Models;
using Agent.Utils;
using Google.GenAI.Types;
using Newtonsoft.Json;
using File = System.IO.File;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Agent;

using System.Linq;
using Google.GenAI;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;

public class DeterministicWorkflow
{
    private readonly string _recipeId;
    private readonly string _apiKey;
    private readonly RecipeRepository _recipeRepository;

    public DeterministicWorkflow(string recipeId)
    {
        _recipeId = recipeId;
        
        IConfiguration configuration = new ConfigurationBuilder()
                                 .AddUserSecrets<Deterministic>()
                                 .Build();

        IStorageProvider storage = new LocalStorage(configuration);
        
        _recipeRepository = new RecipeRepository(storage);

        _apiKey = configuration["GEMINI_API_KEY"]
                  ?? throw new InvalidOperationException("Set GEMINI_API_KEY before running the tests.");
    }

    public async Task Execute()
    {
        const string gemini3ProPreview = "models/gemini-3-pro-preview";
        const string gemini3ProImagePreview = "models/gemini-3-pro-image-preview";
        
        var instructions = await File.ReadAllTextAsync(
            "/Users/alex/Code/whats-for-supper/experiments/agent framework/src/Agent/Prompts/extract-recipe-prompt.md");

        ChatClientAgent recipeExtractionAgent = new(
            new Client(vertexAI:false, apiKey: _apiKey, httpOptions: new HttpOptions
            {
                    Timeout = Convert.ToInt32(TimeSpan.FromMinutes(6).TotalMilliseconds)
            }).AsIChatClient(gemini3ProPreview),
            name: "Recipe Extraction Agent",
            instructions: instructions);

        var recipeInfo = await _recipeRepository.LoadInfoAsync(_recipeId);

        var images = await _recipeRepository.GetOriginals(recipeInfo);

        var dataContents = images.Select(CreateDataContentFromImage).ToList();
        
        var message = new ChatMessage(ChatRole.User, dataContents);

        var options = new ChatClientAgentRunOptions()
        {
            ChatOptions = new ChatOptions()
            {
                Temperature = 0.1f
            }
        };
        
        var recipeExtractAgentResponse = await recipeExtractionAgent.RunAsync(message, null, options);
        
        var extractedRecipeJsonRaw = recipeExtractAgentResponse.Messages.First().Text;
        
        var recipe = JsonSerializer.Deserialize<Recipe>(extractedRecipeJsonRaw)
                     ?? throw new InvalidOperationException($"Failed to deserialize recipe json.\n\n{extractedRecipeJsonRaw}");

        await _recipeRepository.SetRecipeAsync(_recipeId, recipe);
        
        // Load the thumbnail generation prompt
        var thumbnailInstructions = await File.ReadAllTextAsync(
            "/Users/alex/Code/whats-for-supper/experiments/agent framework/src/Agent/Prompts/generate-thumbnail-prompt.md");

        ChatClientAgent thumbnailGenerationAgent = new(
            new Client(vertexAI:false, apiKey: _apiKey, httpOptions: new HttpOptions
            {
                Timeout = Convert.ToInt32(TimeSpan.FromMinutes(6).TotalMilliseconds)
            }).AsIChatClient(gemini3ProImagePreview),
            name: "Recipe Thumbnail Generation Agent",
            instructions: thumbnailInstructions);

        var getThumbnailMessage = new ChatMessage(ChatRole.User, dataContents);

        var thumbnailResponse = await thumbnailGenerationAgent.RunAsync(getThumbnailMessage);
        
        var thumbnailBytes = UnwrapDataContentResponse(thumbnailResponse);

        await _recipeRepository.SetThumbnailAsync(_recipeId, thumbnailBytes);
        
        ChatClientAgent recipeMarketingAgent = new(
            new Client(vertexAI:false, apiKey: _apiKey).AsIChatClient(gemini3ProPreview),
            name: "Recipe Marketing Agent",
            instructions: "You are a marketing assistant for a recipe website. " +
                          "Your task is to create an engaging description and keywords for a recipe based on " +
                          "the recipe information and thumbnail image provided.\n\n"+
                          "Use a simple JSON object to respond."+
                          "Example response format:\n" +
                          "{ description:'', keywords:[] }");
        
        var marketingMessage = new ChatMessage(ChatRole.User, [
            new TextContent(JsonConvert.SerializeObject(recipe)),
            new DataContent(thumbnailBytes, "image/jpeg")
        ]);

        var marketingAgentResponse = await recipeMarketingAgent.RunAsync(marketingMessage);
        
        var jsonResponseRaw = marketingAgentResponse.Messages.First().Text;
        var responseObject = JsonConvert.DeserializeAnonymousType(jsonResponseRaw, new
        {
            description = string.Empty,
            keywords = new List<string>()
        }) ?? throw new InvalidOperationException($"Failed to deserialize marketing agent response.\n\n{jsonResponseRaw}");
        
        recipe.Description = responseObject.description;
        recipe.Keywords = responseObject.keywords;
           
        await _recipeRepository.SetRecipeAsync(_recipeId, recipe);
    }

    private static byte[] UnwrapDataContentResponse(AgentResponse thumbnailResponse)
    {
        var responseMessage = thumbnailResponse.Messages.FirstOrDefault()
                              ?? throw new InvalidOperationException("No response message from thumbnail agent.");
        
        var dataContent = responseMessage.Contents.OfType<DataContent>().FirstOrDefault()
                          ?? throw new InvalidOperationException("No image data in thumbnail response.");

        byte[] thumbnailBytes = dataContent.Data.ToArray();
        return thumbnailBytes;
    }

    private static AIContent CreateDataContentFromImage(ReadOnlyMemory<byte> imageBytes)
    {
        var dataContent = new DataContent(imageBytes, "image/jpeg");
        return dataContent;
    }
}