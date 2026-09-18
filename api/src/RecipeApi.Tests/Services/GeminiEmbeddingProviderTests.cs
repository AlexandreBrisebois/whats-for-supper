using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class GeminiEmbeddingProviderTests
{
    [Fact]
    public async Task GenerateAsync_UsesNativeGeminiEmbedContentContract_WhenSharedEndpointIsOpenAiCompatible()
    {
        var handler = new CapturingHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"embedding":{"values":[0.25,-0.5]}}""")
        });
        var provider = CreateProvider(handler);

        var embedding = await provider.GenerateAsync("Chicken lemon skillet");

        Assert.Equal([0.25f, -0.5f], embedding);
        Assert.NotNull(handler.Request);
        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent", handler.Request.RequestUri!.ToString());
        Assert.True(handler.Request.Headers.TryGetValues("x-goog-api-key", out var values));
        Assert.Equal("test-key", Assert.Single(values));
        Assert.Null(handler.Request.Headers.Authorization);

        using var payload = JsonDocument.Parse(handler.Body!);
        Assert.Equal("models/gemini-embedding-2", payload.RootElement.GetProperty("model").GetString());
        Assert.Equal("Chicken lemon skillet", payload.RootElement.GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString());
        Assert.Equal(1536, payload.RootElement.GetProperty("outputDimensionality").GetInt32());
    }

    [Fact]
    public async Task GenerateAsync_PropagatesNativeEmbeddingFailure_ForSearchFallbackHandling()
    {
        var provider = CreateProvider(new CapturingHandler(new HttpResponseMessage(HttpStatusCode.NotFound)
        {
            Content = new StringContent("model not found")
        }));

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() => provider.GenerateAsync("chicken"));

        Assert.Contains("NotFound", exception.Message, StringComparison.Ordinal);
    }

    private static GeminiEmbeddingProvider CreateProvider(HttpMessageHandler handler)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GEMINI_API_KEY"] = "test-key",
            ["GEMINI_ENDPOINT"] = "https://generativelanguage.googleapis.com/v1beta/openai/",
            ["EMBEDDING_MODEL_ID"] = "gemini-embedding-2",
            ["EMBEDDING_DIMENSIONS"] = "1536"
        }).Build();
        return new GeminiEmbeddingProvider(configuration, new TestHttpClientFactory(handler));
    }

    private sealed class TestHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string? name) => new(handler, disposeHandler: false);
    }

    private sealed class CapturingHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            return response;
        }
    }
}
