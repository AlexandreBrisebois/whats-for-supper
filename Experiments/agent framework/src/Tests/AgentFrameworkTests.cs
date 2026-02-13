using Agent.Models;
using Agent.Utils;
using Microsoft.Extensions.Configuration;
using Xunit.Abstractions;

namespace Tests;

public class AgentFrameworkTests : IAsyncLifetime
{
    private readonly ITestOutputHelper _output;
    private readonly IConfiguration _configuration;

    private string _recipeId;
    
    public AgentFrameworkTests(ITestOutputHelper output)
    {
        _output = output;

        _configuration = new ConfigurationBuilder()
            .AddUserSecrets<AgentFrameworkTests>()
            .Build();
    }
    
    [Fact(DisplayName = "Run the agent workflow to extract recipe information and generate a thumbnail")]
    [Trait("Category", "Integration")]
    public async Task ExecuteWorkflow()
    {
        var promptRepository = new EmbeddedPromptRepository();
        var agentWorkflow = new Agent.DeterministicWorkflow(_recipeId, promptRepository);
        
        await agentWorkflow.Execute();
        
        var storageProvider = new LocalStorage(_configuration);
        var repo = new RecipeRepository(storageProvider);
        
        var info = await repo.LoadInfoAsync(_recipeId);

        _output.WriteLine($"Recipe {info.Name}");
        _output.WriteLine($"Description: {info.Description}");
    }
    
    
    public async Task InitializeAsync()
    {
        var storageProvider = new LocalStorage(_configuration);
        var repo = new RecipeRepository(storageProvider);

        var list = new List<byte[]>
        {
            await storageProvider.LoadAsync("recipe", "0.jpg"),
            await storageProvider.LoadAsync("recipe", "1.jpg")
        };
        
        _recipeId = await repo.CreateAsync(list);
        
        _output.WriteLine($"Created recipe id {_recipeId}");
    }

    public Task DisposeAsync()
    {
       return Task.CompletedTask;
    }
}