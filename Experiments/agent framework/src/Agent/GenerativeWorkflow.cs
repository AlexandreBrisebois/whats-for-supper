using System.Text.Json;
using Agent.Models;
using Agent.Utils;
using Microsoft.Extensions.Configuration;
using Google.GenAI;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Microsoft.Extensions.AI;

namespace Agent;

public class GenerativeWorkflow
{
    private readonly string _recipeId;
    
    private readonly RecipeRepository _recipeRepository;
    private readonly IConfiguration _configurations;
    
    public GenerativeWorkflow(string recipeId)
    {
        _recipeId = recipeId;
        
        _configurations = new ConfigurationBuilder()
            .AddUserSecrets<GenerativeWorkflow>()
            .Build();

        IStorageProvider storage = new LocalStorage(_configurations);
        
        _recipeRepository = new RecipeRepository(storage);
        
    }

    public async Task Execute()
    {
        // var recipeExtractorExecutor = new RecipeExtractorExecutor("RecipeExtractor", 
        //     _configurations.CreateGemini3ProPreviewClient(),
        //     _recipeRepository);

        var recipeSourceExecutor = new RecipeSourceExecutor();
        var recipeExtractorExecutor = new RecipeExtractorExecutor();
        var recipeEditorExecutor = new RecipeEditorExecutor();
        var recipeThumbnailGeneratorExecutor = new RecipeThumbnailGeneratorExecutor();
        var recipeMarketingExecutor = new RecipeMarketingExecutor();
        var recipePersistanceExecutor = new RecipePersistanceExecutor();
        var recipeIndexerExecutor = new RecipeIndexerExecutor();
        
        var workflow = new WorkflowBuilder(recipeSourceExecutor)
            .AddFanOutEdge(recipeSourceExecutor, [recipeExtractorExecutor, recipeThumbnailGeneratorExecutor ])
            .AddFanInEdge([recipeExtractorExecutor, recipeThumbnailGeneratorExecutor], recipeEditorExecutor)
            .AddEdge(recipeEditorExecutor, recipeMarketingExecutor)
            .AddEdge(recipeMarketingExecutor, recipeEditorExecutor)
            .AddEdge(recipeEditorExecutor, recipePersistanceExecutor)
            .AddEdge(recipePersistanceExecutor, recipeIndexerExecutor)
            .WithOutputFrom(recipeIndexerExecutor)
            .Build();
        
        await using var run = await InProcessExecution.StreamAsync(workflow, input: _recipeId);
        await foreach (var evt in run.WatchStreamAsync())
        {
            switch (evt)
            {
                case ExecutorCompletedEvent completedEvent:
                {
                    Console.WriteLine(completedEvent.ExecutorId);
                    break;
                }
                case WorkflowOutputEvent outputEvent:
                {
                    Console.WriteLine($"Workflow completed");
                    break;
                }
            }
        }
    }
}

internal class SourceResult
{
    internal string RecipeId { get; set; }
    internal List<byte[]> Images { get; set; }
}

internal sealed partial class RecipeSourceExecutor() : Executor("RecipeSource")
{
    [MessageHandler(Send = [typeof(SourceResult)])]
    private ValueTask<SourceResult> HandleAsync(string message, 
        IWorkflowContext context, 
        CancellationToken cancellationToken)
    {
        var sourceResult = new SourceResult
        {
            RecipeId = message
        };
        return ValueTask.FromResult(sourceResult);
    }

    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        routeBuilder.AddHandler<string, SourceResult>(HandleAsync);
        return routeBuilder;
    }
}

internal class RecipeResult
{
    internal string RecipeId { get; set; }
    internal string RecipeJson { get; set; } = string.Empty;
    internal byte[]? Thumbnail { get; set; } = null;
    internal int Iterations { get; set; } = 1;
}

internal sealed partial class RecipeExtractorExecutor() : Executor("RecipeExtractor")
{
    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        routeBuilder.AddHandler<SourceResult, RecipeResult>(HandleAsync);
        return routeBuilder;
    }
    
    [MessageHandler(Send = [typeof(RecipeResult)])]
    private ValueTask<RecipeResult> HandleAsync(SourceResult message, 
        IWorkflowContext context, 
        CancellationToken cancellationToken)
    {
        var recipeResult = new RecipeResult
        {
            RecipeId = message.RecipeId
        };
        return ValueTask.FromResult(recipeResult);
    }
    
}

internal class RecipeFeedbackResult
{
    internal string RecipeId { get; set; }
    internal string Feedback { get; set; } = string.Empty;
    internal int Iterations { get; set; } = 0;
    internal string RecipeJson { get; set; } = string.Empty;
}

internal class RecipeAnalysisFeedback
{
    internal string Feedback { get; set; } = string.Empty;
    internal bool IsMissingInformation { get; set; } = false;
}

internal sealed partial class RecipeEditorExecutor() : Executor("RecipeEditor")
{
    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        routeBuilder.AddHandler<RecipeResult, ValueTask>(HandleAsync);
        return routeBuilder;
    }
    
    [MessageHandler(Send = [typeof(ValueTask)])]
    private async ValueTask HandleAsync(List<RecipeResult> message, 
        IWorkflowContext context, 
        CancellationToken cancellationToken)
    {
        var thumbnail = message.Where(m=>m.Thumbnail!=null)
                                        .Select(m =>m.Thumbnail)
                                        .First();
        
        var recipe = message.Where(m=>!string.IsNullOrEmpty(m.RecipeJson))
                                        .Select(m=>m.RecipeJson)
                                        .First();
        
        var r = new RecipeResult
        {
            RecipeId = message.First().RecipeId,
            RecipeJson = message.First().RecipeJson,
            Thumbnail = thumbnail,
            Iterations = message.Max(m=>m.Iterations) + 1
        }
        
        var analysisFeedback = new RecipeAnalysisFeedback
        {
            Feedback = "",
            IsMissingInformation = false
        };

        if (analysisFeedback.IsMissingInformation)
        {
            var recipeFeedbackResult = new RecipeFeedbackResult
            {
                RecipeId = message.RecipeId,
                RecipeJson = message.RecipeJson,
                Feedback = analysisFeedback.Feedback,
                Iterations = message.Iterations
            };
            await context.SendMessageAsync(recipeFeedbackResult, cancellationToken);
        }
        else
        {
            var recipeResult = new RecipeResult
            {
                RecipeId = message.RecipeId,
                RecipeJson = message.RecipeJson,
                Iterations = message.Iterations
            };
            await context.SendMessageAsync(recipeResult, cancellationToken);
        }
    }
}

internal sealed partial class RecipeMarketingExecutor() : Executor("RecipeMarketing")
{
    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        throw new NotImplementedException();
    }
}

internal sealed partial class RecipeThumbnailGeneratorExecutor() : Executor("RecipeThumbnailGenerator")
{
    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        throw new NotImplementedException();
    }
}

internal sealed partial class RecipePersistanceExecutor() : Executor("RecipePersistance")
{
    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        throw new NotImplementedException();
    }
}

internal sealed partial class RecipeIndexerExecutor() : Executor("RecipeIndexer")
{
    protected override RouteBuilder ConfigureRoutes(RouteBuilder routeBuilder)
    {
        throw new NotImplementedException();
    }
}

/*internal class RecipeExtractorExecutor : Executor<string>
{
    private readonly RecipeRepository _recipeRepository;
    private readonly AIAgent _agent;
    private AgentSession _session;
    
    public RecipeExtractorExecutor(string id, 
        IChatClient chatClient, 
        RecipeRepository recipeRepository)
                                    : base(id)
    {
        _recipeRepository = recipeRepository;
        var instructions = new EmbeddedPromptRepository().GetPrompt(PromptType.RecipeExtraction);
        
        _agent = new ChatClientAgent(chatClient, new ChatClientAgentOptions()
        {
                Name = "Recipe Extraction Agent",
                ChatOptions = new ChatOptions
                {
                    Instructions = instructions,
                    Temperature = 0.1f
                }
        });
    }

    [MessageHandler]
    public override async ValueTask HandleAsync(string message, 
        IWorkflowContext context,
        CancellationToken cancellationToken = new CancellationToken())
    {
        this._session ??= await this._agent.CreateSessionAsync(cancellationToken);

        await context.AddEventAsync(new ExecutorInvokedEvent("RecipeExtractor", $"Extracting recipe {message}"), cancellationToken);
        
        var info = await _recipeRepository.LoadInfoAsync(message);

        var chatMessage = await MakeChatMessage(info);

        var result = await this._agent.RunAsync(chatMessage, this._session, cancellationToken: cancellationToken);

        var recipe = JsonSerializer.Deserialize<Recipe>(result.Text) ?? throw new InvalidOperationException("Failed to deserialize recipe result.");
        
        await context.YieldOutputAsync(recipe, cancellationToken);
    }

    private async ValueTask<ChatMessage> MakeChatMessage(RecipeInfo info)
    {
        var originals = await _recipeRepository.GetOriginals(info);
        
        var dataContents = originals.Select(image =>new DataContent(image, "image/jpeg") as AIContent).ToList();
        
        var chatMessage = new ChatMessage(ChatRole.User, dataContents);
        return chatMessage;
    }
}*/

internal static class ChatClientFactoryExtensions
{
    internal static IChatClient CreateGemini3ProPreviewClient(this IConfiguration configurations)
    {
        var apiKey = configurations["GEMINI_API_KEY"]
                     ?? throw new InvalidOperationException("Set GEMINI_API_KEY before running the tests.");
        
        return new Client(vertexAI:false, apiKey: apiKey).AsIChatClient("models/gemini-3-pro-preview");
    }
    
    internal static IChatClient CreateGemini3ProImagePreviewClient(this IConfiguration configurations)
    {
        var apiKey = configurations["GEMINI_API_KEY"]
                     ?? throw new InvalidOperationException("Set GEMINI_API_KEY before running the tests.");
        
        return new Client(vertexAI:false, apiKey: apiKey).AsIChatClient("models/gemini-3-pro-image-preview");
    }
}