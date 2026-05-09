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
    private readonly string _modelId = configuration["EMBEDDING_MODEL_ID"] ?? "text-embedding-004";

    public async Task<float[]> GenerateAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];

        try
        {
            using var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

            // Ensure endpoint ends with a slash before appending embeddings
            var baseUrl = _endpoint.EndsWith('/') ? _endpoint : _endpoint + "/";
            var url = $"{baseUrl}embeddings";

            var response = await client.PostAsJsonAsync(url, new
            {
                input = text,
                model = _modelId
            }, ct);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                throw new Exception($"Gemini Embedding API failed: {response.StatusCode} - {error}");
            }

            var result = await response.Content.ReadFromJsonAsync<OpenAiEmbeddingResponse>(cancellationToken: ct);
            return result?.Data?.FirstOrDefault()?.Embedding ?? [];
        }
        catch (Exception)
        {
            // Fail silently or log? Since this is part of a workflow, throwing will trigger retries.
            throw;
        }
    }

    private class OpenAiEmbeddingResponse
    {
        [JsonPropertyName("data")]
        public List<OpenAiEmbeddingData>? Data { get; set; }
    }

    private class OpenAiEmbeddingData
    {
        [JsonPropertyName("embedding")]
        public float[]? Embedding { get; set; }
    }
}
