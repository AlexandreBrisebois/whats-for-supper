using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenAI;
using System.ClientModel;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Workflow;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Manual;

/// <summary>
/// Manual unit tests for local debugging of AI-driven flows.
/// These tests are skipped by default to avoid CI failures and API costs.
/// To run:
/// 1. Ensure GEMINI_API_KEY is set in your environment.
/// 2. Ensure your local PostgreSQL database is running.
/// 3. Change [Fact(Skip = "...")] to [Fact] or use the "Run Test" action in your IDE.
/// </summary>
public class ManualAgentTests : IDisposable
{
    private readonly IServiceProvider _services;
    private readonly RecipeDbContext _db;
    private readonly ITestOutputHelper _output;

    // Change this to a recipe ID that exists in your local data directory
    private readonly Guid _sampleRecipeId = Guid.Parse("0384639a-96e2-48d9-89fe-c30d55e06c98");

    public ManualAgentTests(ITestOutputHelper output)
    {
        _output = output;
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var services = new ServiceCollection();

        // 1. Infrastructure
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging(b => b.AddConsole().SetMinimumLevel(LogLevel.Debug));

        // 2. Storage / Repository
        services.AddSingleton<DataRootResolver>();
        services.AddSingleton<RecipesRootResolver>();
        services.AddSingleton<IPromptRepository, EmbeddedPromptRepository>();
        services.AddSingleton<IStorageProvider, LocalStorageProvider>();
        services.AddSingleton<IRecipeStore, LocalRecipeStore>();
        services.AddScoped<RecipeRepository>();

        // 3. AI / Chat Client
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? configuration["GEMINI_API_KEY"];
        var endpoint = configuration["GEMINI_ENDPOINT"] ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
        var modelId = configuration["GEMINI_MODEL_ID"] ?? "gemini-3-flash-preview";

        if (string.IsNullOrEmpty(apiKey) || apiKey == "none")
        {
            // We don't throw here to allow the test to be discovered/skipped, 
            // but we'll fail if a test is actually run without it.
            apiKey = "REPLACE_ME_OR_SET_ENV_VAR";
        }

        services.AddChatClient(new OpenAIClient(
            new ApiKeyCredential(apiKey),
            new OpenAIClientOptions
            {
                Endpoint = new Uri(endpoint),
                NetworkTimeout = TimeSpan.FromMinutes(5)
            })
            .GetChatClient(modelId)
            .AsIChatClient());

        // 4. Database
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING");

        if (string.IsNullOrEmpty(connectionString))
        {
            // Default for local development if not provided
            connectionString = "Host=localhost;Database=whats_for_supper;Username=postgres;Password=postgres";
        }

        connectionString = ConnectionStringHelper.NormalizeForNpgsql(connectionString);
        services.AddDbContext<RecipeDbContext>(opts => opts.UseNpgsql(connectionString));

        // 5. Agents & Processors
        services.AddScoped<RecipeAgent>();
        services.AddScoped<RecipeHeroAgent>();
        services.AddScoped<HealthComputationService>();

        _services = services.BuildServiceProvider();
        _db = _services.GetRequiredService<RecipeDbContext>();
    }

    [Fact(Skip = "Manual test - requires real Gemini API Key and Local DB")]
    public async Task Test_Extraction_Flow()
    {
        EnsureApiKey();
        using var scope = _services.CreateScope();
        var agent = scope.ServiceProvider.GetRequiredService<RecipeAgent>();
        var repository = scope.ServiceProvider.GetRequiredService<RecipeRepository>();

        _output.WriteLine($"Starting extraction for recipe {_sampleRecipeId}...");
        await agent.DoExtractRecipeAsync(_sampleRecipeId, CancellationToken.None);

        var recipeJson = await repository.GetRecipeJsonAsync(_sampleRecipeId, CancellationToken.None);
        _output.WriteLine("Extraction complete. Resulting JSON:");
        _output.WriteLine(recipeJson);

        Assert.NotNull(recipeJson);
    }

    [Fact(Skip = "Manual test - requires real Gemini API Key and Local DB")]
    public async Task Test_Description_Flow()
    {
        EnsureApiKey();
        using var scope = _services.CreateScope();
        var agent = scope.ServiceProvider.GetRequiredService<RecipeAgent>();
        var repository = scope.ServiceProvider.GetRequiredService<RecipeRepository>();

        _output.WriteLine($"Generating description for recipe {_sampleRecipeId}...");
        await agent.DoGenerateDescriptionAsync(_sampleRecipeId, CancellationToken.None);

        var info = await repository.GetInfoAsync(_sampleRecipeId, CancellationToken.None);
        _output.WriteLine("Description generated:");
        _output.WriteLine(info.Description ?? "NULL");

        Assert.NotNull(info.Description);
    }

    [Fact(Skip = "Manual test - requires real Gemini API Key and Local DB")]
    public async Task Test_Categorization_Flow()
    {
        EnsureApiKey();
        using var scope = _services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<HealthComputationService>();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        _output.WriteLine($"Classifying dietary profile for recipe {_sampleRecipeId}...");
        
        await service.ProcessRecipeChangedAsync(_sampleRecipeId, CancellationToken.None);

        // Refresh from DB
        var recipe = await db.Recipes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == _sampleRecipeId);
        var profile = await db.HealthRecipeProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.RecipeId == _sampleRecipeId);

        _output.WriteLine("Classification complete.");
        _output.WriteLine($"Category: {recipe?.Category}");
        _output.WriteLine($"Dietary Profile: {profile?.DietaryProfile}");

        Assert.NotNull(profile?.DietaryProfile);
    }

    [Fact(Skip = "Manual test - requires real Gemini API Key and Local DB")]
    public async Task Test_Hero_Flow()
    {
        EnsureApiKey();
        using var scope = _services.CreateScope();
        var agent = scope.ServiceProvider.GetRequiredService<RecipeHeroAgent>();
        var resolver = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();

        _output.WriteLine($"Generating hero image for recipe {_sampleRecipeId}...");
        await agent.CreateHeroImageAsync(_sampleRecipeId, force: true, CancellationToken.None);

        var heroPath = Path.Combine(resolver.Root, _sampleRecipeId.ToString(), "hero.jpg");
        _output.WriteLine($"Hero generation complete. Checking path: {heroPath}");

        Assert.True(File.Exists(heroPath), "Hero image was not created.");
    }

    private void EnsureApiKey()
    {
        var config = _services.GetRequiredService<IConfiguration>();
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? config["GEMINI_API_KEY"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "REPLACE_ME_OR_SET_ENV_VAR" || apiKey == "none")
        {
            throw new InvalidOperationException("GEMINI_API_KEY is not set. Please set it in your environment or appsettings.json.");
        }
    }

    public void Dispose()
    {
        if (_services is IDisposable d) d.Dispose();
    }
}
