using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using RecipeApi.Services.Ai;

namespace RecipeApi.Services;

/// <summary>
/// Native HTTP implementation of IEmbeddingProvider to bypass SDK resolution issues.
/// NOTE FOR USER: Review this for migration back to Microsoft.Extensions.AI once package bindings are stabilized.
/// </summary>
public class GeminiEmbeddingProvider(
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    IOptions<GeminiOptions>? geminiOptions = null) : IEmbeddingProvider
{
    public const string DefaultModelId = GeminiOptions.DefaultEmbeddingModelId;

    public static string ResolveModelId(IConfiguration? configuration = null) =>
        GeminiOptions.FromConfiguration(configuration).EmbeddingModelId;

    private readonly DemoModeOptions _demoMode = new(configuration);
    private readonly GeminiOptions _options = geminiOptions?.Value ?? GeminiOptions.FromConfiguration(configuration);

    public async Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
    {
        _demoMode.EnsureAiAvailable();
        if (string.IsNullOrWhiteSpace(text)) return [];

        using var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("x-goog-api-key", _options.ApiKeyOrNone);

        var model = _options.EmbeddingModelId.StartsWith("models/", StringComparison.Ordinal)
            ? _options.EmbeddingModelId["models/".Length..]
            : _options.EmbeddingModelId;
        var endpoint = new Uri(new Uri(new Uri(_options.Endpoint).GetLeftPart(UriPartial.Authority)), $"/v1beta/models/{Uri.EscapeDataString(model)}:embedContent");
        var response = await client.PostAsJsonAsync(endpoint, new
        {
            model = $"models/{model}",
            content = new { parts = new[] { new { text } } },
            outputDimensionality = _options.EmbeddingDimensions
        }, ct);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Gemini embedding request failed with status {response.StatusCode}.");

        var result = await response.Content.ReadFromJsonAsync<GeminiEmbeddingResponse>(cancellationToken: ct);
        return result?.Embedding?.Values ?? [];
    }

    private class GeminiEmbeddingResponse
    {
        [JsonPropertyName("embedding")]
        public GeminiEmbeddingData? Embedding { get; set; }
    }

    private class GeminiEmbeddingData
    {
        [JsonPropertyName("values")]
        public float[]? Values { get; set; }
    }
}
