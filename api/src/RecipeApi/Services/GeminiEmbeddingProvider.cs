using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Services;

/// <summary>
/// Native HTTP implementation of IEmbeddingProvider to bypass SDK resolution issues.
/// NOTE FOR USER: Review this for migration back to Microsoft.Extensions.AI once package bindings are stabilized.
/// </summary>
public class GeminiEmbeddingProvider(IConfiguration configuration, IHttpClientFactory httpClientFactory) : IEmbeddingProvider
{
    private readonly string _apiKey = configuration["GEMINI_API_KEY"] ?? "none";
    private readonly string _endpoint = configuration["GEMINI_ENDPOINT"] ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
    private readonly string _modelId = configuration["EMBEDDING_MODEL_ID"] ?? "gemini-embedding-2";
    private readonly int _dimensions = configuration.GetValue<int?>("EMBEDDING_DIMENSIONS") ?? 1536;

    public async Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];

        using var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("x-goog-api-key", _apiKey);

        var model = _modelId.StartsWith("models/", StringComparison.Ordinal)
            ? _modelId["models/".Length..]
            : _modelId;
        var endpoint = new Uri(new Uri(new Uri(_endpoint).GetLeftPart(UriPartial.Authority)), $"/v1beta/models/{Uri.EscapeDataString(model)}:embedContent");
        var response = await client.PostAsJsonAsync(endpoint, new
        {
            model = $"models/{model}",
            content = new { parts = new[] { new { text } } },
            outputDimensionality = _dimensions
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
