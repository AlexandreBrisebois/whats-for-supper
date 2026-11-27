using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
using Xunit;

namespace RecipeApi.Tests.Services;

public class GeminiOptionsTests
{
    private static readonly Func<string, string?> EmptyEnv = _ => null;

    [Fact]
    public void FromConfiguration_UsesDefaults_WhenConfigurationAndEnvironmentAreEmpty()
    {
        var config = new ConfigurationBuilder().Build();

        var options = GeminiOptions.FromConfiguration(config, EmptyEnv);

        Assert.Equal(string.Empty, options.ApiKey);
        Assert.Equal("none", options.ApiKeyOrNone);
        Assert.Equal(GeminiOptions.DefaultEndpoint, options.Endpoint);
        Assert.Equal(GeminiOptions.DefaultModelId, options.ModelId);
        Assert.Equal(GeminiOptions.DefaultImageModelId, options.ImageModelId);
        Assert.Equal(GeminiOptions.DefaultEmbeddingModelId, options.EmbeddingModelId);
        Assert.Equal(GeminiOptions.DefaultEmbeddingDimensions, options.EmbeddingDimensions);
        Assert.Null(options.EmbeddingModelVersion);
    }

    [Fact]
    public void FromConfiguration_EnvironmentOverridesConfiguration()
    {
        var json = Encoding.UTF8.GetBytes("""
            {
                "GEMINI_API_KEY": "config-key",
                "GEMINI_ENDPOINT": "https://config.example.com/v1beta/openai/",
                "GEMINI_MODEL_ID": "config-chat-model",
                "GEMINI_MODEL_ID_HERO": "models/config-hero-model",
                "EMBEDDING_MODEL_ID": "config-embedding-model",
                "EMBEDDING_DIMENSIONS": "768",
                "EMBEDDING_MODEL_VERSION": "cfg-v1"
            }
            """);
        using var stream = new MemoryStream(json);
        var config = new ConfigurationBuilder().AddJsonStream(stream).Build();

        var env = new Dictionary<string, string?>
        {
            ["GEMINI_API_KEY"] = "env-key",
            ["GEMINI_ENDPOINT"] = "https://env.example.com/v1beta/openai/",
            ["GEMINI_MODEL_ID"] = "env-chat-model",
            ["GEMINI_MODEL_ID_HERO"] = "models/env-hero-model",
            ["EMBEDDING_MODEL_ID"] = "env-embedding-model",
            ["EMBEDDING_DIMENSIONS"] = "1024",
            ["EMBEDDING_MODEL_VERSION"] = "env-v2"
        };

        var options = GeminiOptions.FromConfiguration(config, key => env.GetValueOrDefault(key));

        Assert.Equal("env-key", options.ApiKey);
        Assert.Equal("env-key", options.ApiKeyOrNone);
        Assert.Equal("https://env.example.com/v1beta/openai/", options.Endpoint);
        Assert.Equal("env-chat-model", options.ModelId);
        Assert.Equal("models/env-hero-model", options.ImageModelId);
        Assert.Equal("env-embedding-model", options.EmbeddingModelId);
        Assert.Equal(1024, options.EmbeddingDimensions);
        Assert.Equal("env-v2", options.EmbeddingModelVersion);
    }

    [Fact]
    public void FromConfiguration_WhitespaceEnvironmentFallsBackToConfiguration_AndWhitespaceConfigurationFallsBackToDefaults()
    {
        var json = Encoding.UTF8.GetBytes("""
            {
                "GEMINI_ENDPOINT": "  https://cfg.example.com/v1beta/openai/  ",
                "GEMINI_MODEL_ID": "   ",
                "GEMINI_MODEL_ID_HERO": " models/custom-hero ",
                "EMBEDDING_MODEL_ID": "",
                "EMBEDDING_DIMENSIONS": "  ",
                "EMBEDDING_MODEL_VERSION": "   "
            }
            """);
        using var stream = new MemoryStream(json);
        var config = new ConfigurationBuilder().AddJsonStream(stream).Build();

        var env = new Dictionary<string, string?>
        {
            ["GEMINI_API_KEY"] = "   ",
            ["GEMINI_ENDPOINT"] = "   ",
            ["GEMINI_MODEL_ID"] = "  ",
            ["GEMINI_MODEL_ID_HERO"] = "",
            ["EMBEDDING_MODEL_ID"] = "\t",
            ["EMBEDDING_DIMENSIONS"] = " ",
            ["EMBEDDING_MODEL_VERSION"] = "  "
        };

        var options = GeminiOptions.FromConfiguration(config, key => env.GetValueOrDefault(key));

        Assert.Equal(string.Empty, options.ApiKey);
        Assert.Equal("none", options.ApiKeyOrNone);
        Assert.Equal("https://cfg.example.com/v1beta/openai/", options.Endpoint);
        Assert.Equal(GeminiOptions.DefaultModelId, options.ModelId);
        Assert.Equal("models/custom-hero", options.ImageModelId);
        Assert.Equal(GeminiOptions.DefaultEmbeddingModelId, options.EmbeddingModelId);
        Assert.Equal(GeminiOptions.DefaultEmbeddingDimensions, options.EmbeddingDimensions);
        Assert.Null(options.EmbeddingModelVersion);
    }

    [Fact]
    public void FromConfiguration_SupportsSecondaryImageModelIdKey_WhenPrimaryHeroKeyMissing()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["GEMINI_IMAGE_MODEL_ID"] = "models/fallback-image-model"
            })
            .Build();

        var options = GeminiOptions.FromConfiguration(config, EmptyEnv);

        Assert.Equal("models/fallback-image-model", options.ImageModelId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("none")]
    [InlineData("synthetic-key")]
    public void Validator_Succeeds_WhenApiKeyIsMissingOrNoneOrPopulated(string apiKey)
    {
        var validator = new GeminiOptionsValidator();
        var options = new GeminiOptions { ApiKey = apiKey };

        var result = validator.Validate(Options.DefaultName, options);

        Assert.True(result.Succeeded);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-1536)]
    [InlineData(4097)]
    [InlineData(8192)]
    public void Validator_Fails_WhenEmbeddingDimensionsOutOfBounds(int invalidDimensions)
    {
        var validator = new GeminiOptionsValidator();
        var options = new GeminiOptions { EmbeddingDimensions = invalidDimensions };

        var result = validator.Validate(Options.DefaultName, options);

        Assert.True(result.Failed);
        Assert.NotNull(result.Failures);
        Assert.Contains(result.Failures, f => f.Contains("EMBEDDING_DIMENSIONS", StringComparison.Ordinal));
    }

    [Fact]
    public void Validator_Fails_WhenEmbeddingDimensionsIsNonNumeric()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["EMBEDDING_DIMENSIONS"] = "not-an-int"
            })
            .Build();

        var options = GeminiOptions.FromConfiguration(config, EmptyEnv);
        var result = new GeminiOptionsValidator().Validate(Options.DefaultName, options);

        Assert.True(result.Failed);
        Assert.NotNull(result.Failures);
        Assert.Contains(result.Failures, f => f.Contains("not-an-int", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not a url")]
    [InlineData("/v1beta/openai/")]
    [InlineData("ftp://generativelanguage.googleapis.com/v1beta/")]
    public void Validator_Fails_WhenEndpointIsNotAbsoluteHttpOrHttpsUri(string invalidEndpoint)
    {
        var validator = new GeminiOptionsValidator();
        var options = new GeminiOptions { Endpoint = invalidEndpoint };

        var result = validator.Validate(Options.DefaultName, options);

        Assert.True(result.Failed);
        Assert.NotNull(result.Failures);
        Assert.Contains(result.Failures, f => f.Contains("GEMINI_ENDPOINT", StringComparison.Ordinal));
    }

    [Fact]
    public void Validator_Fails_WhenAnyModelIdIsBlank()
    {
        var validator = new GeminiOptionsValidator();
        var options = new GeminiOptions
        {
            ModelId = " ",
            ImageModelId = "",
            EmbeddingModelId = "\t"
        };

        var result = validator.Validate(Options.DefaultName, options);

        Assert.True(result.Failed);
        Assert.NotNull(result.Failures);
        Assert.Equal(3, result.Failures.Count());
    }

    [Fact]
    public void OptionsRegistration_ThrowsOptionsValidationException_WhenMisconfigured()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["GEMINI_ENDPOINT"] = "relative-endpoint",
                ["EMBEDDING_DIMENSIONS"] = "9999"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(config);
        services.AddSingleton<IValidateOptions<GeminiOptions>, GeminiOptionsValidator>();
        services.AddOptions<GeminiOptions>()
            .Configure<IConfiguration>((opts, cfg) => opts.ApplyFrom(GeminiOptions.FromConfiguration(cfg, EmptyEnv)))
            .ValidateOnStart();

        using var provider = services.BuildServiceProvider();

        var ex = Assert.Throws<OptionsValidationException>(
            () => _ = provider.GetRequiredService<IOptions<GeminiOptions>>().Value);

        Assert.Contains("GEMINI_ENDPOINT", ex.Message, StringComparison.Ordinal);
        Assert.Contains("EMBEDDING_DIMENSIONS", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GeminiEmbeddingProvider_ResolveModelId_UsesConfiguredModel()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["EMBEDDING_MODEL_ID"] = "custom-embedding-v3"
            })
            .Build();

        Assert.Equal("custom-embedding-v3", GeminiEmbeddingProvider.ResolveModelId(config));
    }
}
