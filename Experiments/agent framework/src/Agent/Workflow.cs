namespace Agent;

using System.Linq;
using Google.Apis.Util.Store;
using Google.GenAI;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;

public class Workflow
{
    private IConfiguration _configuration;

    public async Task<string> Execute()
    {
         _configuration = new ConfigurationBuilder()
                .AddUserSecrets<Workflow>()
                .Build();

        var projectId = _configuration["GEMINI_PROJECT_ID"]
                         ?? throw new InvalidOperationException("Set GEMINI_PROJECT_ID in user secrets before running the tests.");

        var apiKey = _configuration["GEMINI_API_KEY"]
                     ?? throw new InvalidOperationException("Set GEMINI_API_KEY before running the tests.");

        var model = "models/gemini-2.5-pro";

        var instructions = await File.ReadAllTextAsync("/Users/alex/Code/whats-for-supper/experiments/agent framework/src/Agent/Prompts/extract-recipe-prompt.md");

        ChatClientAgent agentGenAI = new(
            new Client(vertexAI: false, apiKey: apiKey).AsIChatClient(model),
            name: "Recipe Acquisition Agent",
            instructions: instructions);

        var path = new[] { "/Users/alex/Code/PXL_20251209_234059716_exported_1765390461719.jpg", "/Users/alex/Code/PXL_20251209_234048013_exported_1765390448371.jpg" };
        
        var dataContents = path.ToList().Select(p => CreateDataContentFromImage(p)).ToList();
        
        var message = new ChatMessage(ChatRole.User, dataContents);

        var result = await agentGenAI.RunAsync(message);

        return result.AsChatResponse().Messages.First().Text;
    }

    private static AIContent CreateDataContentFromImage(string path)
    {
        var imageBytes = File.ReadAllBytes(path);
        var dataContent = new DataContent(imageBytes, "image/jpeg");
        return dataContent;
    }
}
