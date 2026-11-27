using System.Globalization;
using Microsoft.Extensions.Configuration.EnvironmentVariables;
using Microsoft.Extensions.Configuration.Memory;
using Microsoft.Extensions.Options;

namespace RecipeApi.Services.Ai;

/// <summary>
/// Strongly-typed configuration for Gemini chat, hero image, and embedding calls.
/// </summary>
public sealed class GeminiOptions
{
    public const string DefaultEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/";
    public const string DefaultModelId = "gemini-3.8-flash";
    public const string DefaultImageModelId = "models/gemini-3-pro-image";
    public const string DefaultEmbeddingModelId = "gemini-embedding-2";
    public const int DefaultEmbeddingDimensions = 1536;
    public const int MaxEmbeddingDimensions = 4096;

    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = DefaultEndpoint;
    public string ModelId { get; set; } = DefaultModelId;
    public string ImageModelId { get; set; } = DefaultImageModelId;
    public string EmbeddingModelId { get; set; } = DefaultEmbeddingModelId;
    public int EmbeddingDimensions { get; set; } = DefaultEmbeddingDimensions;
    public string? EmbeddingModelVersion { get; set; }

    internal string? RawEmbeddingDimensionsError { get; set; }

    public string ApiKeyOrNone => string.IsNullOrWhiteSpace(ApiKey) ? "none" : ApiKey;

    public void ApplyFrom(GeminiOptions source)
    {
        ArgumentNullException.ThrowIfNull(source);
        ApiKey = source.ApiKey;
        Endpoint = source.Endpoint;
        ModelId = source.ModelId;
        ImageModelId = source.ImageModelId;
        EmbeddingModelId = source.EmbeddingModelId;
        EmbeddingDimensions = source.EmbeddingDimensions;
        EmbeddingModelVersion = source.EmbeddingModelVersion;
        RawEmbeddingDimensionsError = source.RawEmbeddingDimensionsError;
    }

    public static GeminiOptions FromConfiguration(
        IConfiguration? configuration = null,
        Func<string, string?>? getEnvironmentVariable = null)
    {
        var apiKey = ResolveRawValue(
            "GEMINI_API_KEY",
            configuration,
            getEnvironmentVariable,
            preserveExplicitEmptyInMemory: true) ?? string.Empty;

        var endpoint = ResolveRawValue("GEMINI_ENDPOINT", configuration, getEnvironmentVariable)
            ?? DefaultEndpoint;

        var modelId = ResolveRawValue("GEMINI_MODEL_ID", configuration, getEnvironmentVariable)
            ?? DefaultModelId;

        var imageModelId = ResolveRawValue("GEMINI_MODEL_ID_HERO", configuration, getEnvironmentVariable)
            ?? ResolveRawValue("GEMINI_IMAGE_MODEL_ID", configuration, getEnvironmentVariable)
            ?? DefaultImageModelId;

        var embeddingModelId = ResolveRawValue("EMBEDDING_MODEL_ID", configuration, getEnvironmentVariable)
            ?? DefaultEmbeddingModelId;

        var embeddingModelVersion = ResolveRawValue("EMBEDDING_MODEL_VERSION", configuration, getEnvironmentVariable);

        var rawDimensions = ResolveRawValue("EMBEDDING_DIMENSIONS", configuration, getEnvironmentVariable);
        var embeddingDimensions = DefaultEmbeddingDimensions;
        string? rawDimensionsError = null;
        if (rawDimensions is not null)
        {
            if (int.TryParse(rawDimensions, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                embeddingDimensions = parsed;
            }
            else
            {
                embeddingDimensions = 0;
                rawDimensionsError = $"EMBEDDING_DIMENSIONS ('{rawDimensions}') must be an integer between 1 and {MaxEmbeddingDimensions}.";
            }
        }

        return new GeminiOptions
        {
            ApiKey = apiKey,
            Endpoint = endpoint,
            ModelId = modelId,
            ImageModelId = imageModelId,
            EmbeddingModelId = embeddingModelId,
            EmbeddingDimensions = embeddingDimensions,
            EmbeddingModelVersion = embeddingModelVersion,
            RawEmbeddingDimensionsError = rawDimensionsError
        };
    }

    private static string? ResolveRawValue(
        string key,
        IConfiguration? configuration,
        Func<string, string?>? getEnvironmentVariable,
        bool preserveExplicitEmptyInMemory = false)
    {
        if (getEnvironmentVariable is not null)
        {
            var explicitEnv = getEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(explicitEnv))
            {
                return explicitEnv.Trim();
            }
        }

        if (configuration is IConfigurationRoot root)
        {
            var providers = root.Providers.ToArray();
            var hasEnvProvider = providers.Any(p => p is EnvironmentVariablesConfigurationProvider);

            for (var i = providers.Length - 1; i >= 0; i--)
            {
                var provider = providers[i];
                if (!provider.TryGet(key, out var value))
                {
                    continue;
                }

                if (provider is MemoryConfigurationProvider)
                {
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value.Trim();
                    }

                    if (preserveExplicitEmptyInMemory)
                    {
                        return string.Empty;
                    }

                    continue;
                }

                if (!hasEnvProvider && getEnvironmentVariable is null)
                {
                    var ambientEnv = Environment.GetEnvironmentVariable(key);
                    if (!string.IsNullOrWhiteSpace(ambientEnv))
                    {
                        return ambientEnv.Trim();
                    }
                }

                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }
            }

            if (!hasEnvProvider && getEnvironmentVariable is null)
            {
                var fallbackEnv = Environment.GetEnvironmentVariable(key);
                if (!string.IsNullOrWhiteSpace(fallbackEnv))
                {
                    return fallbackEnv.Trim();
                }
            }

            return null;
        }

        if (getEnvironmentVariable is null)
        {
            var env = Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(env))
            {
                return env.Trim();
            }
        }

        var configured = configuration?[key];
        return string.IsNullOrWhiteSpace(configured) ? null : configured.Trim();
    }
}

public sealed class GeminiOptionsValidator : IValidateOptions<GeminiOptions>
{
    public ValidateOptionsResult Validate(string? name, GeminiOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.Endpoint)
            || !Uri.TryCreate(options.Endpoint, UriKind.Absolute, out var endpointUri)
            || (endpointUri.Scheme != Uri.UriSchemeHttp && endpointUri.Scheme != Uri.UriSchemeHttps))
        {
            failures.Add("GEMINI_ENDPOINT must be a valid absolute HTTP or HTTPS URI.");
        }

        if (string.IsNullOrWhiteSpace(options.ModelId))
        {
            failures.Add("GEMINI_MODEL_ID must resolve to a non-empty model identifier.");
        }

        if (string.IsNullOrWhiteSpace(options.ImageModelId))
        {
            failures.Add("GEMINI_MODEL_ID_HERO must resolve to a non-empty model identifier.");
        }

        if (string.IsNullOrWhiteSpace(options.EmbeddingModelId))
        {
            failures.Add("EMBEDDING_MODEL_ID must resolve to a non-empty model identifier.");
        }

        if (options.RawEmbeddingDimensionsError is not null)
        {
            failures.Add(options.RawEmbeddingDimensionsError);
        }
        else if (options.EmbeddingDimensions is <= 0 or > GeminiOptions.MaxEmbeddingDimensions)
        {
            failures.Add($"EMBEDDING_DIMENSIONS must be between 1 and {GeminiOptions.MaxEmbeddingDimensions}, but was {options.EmbeddingDimensions}.");
        }

        return failures.Count > 0
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
}
