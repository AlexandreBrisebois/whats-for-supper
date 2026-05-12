using Microsoft.Extensions.AI;

namespace RecipeApi.Tests.Infrastructure;

/// <summary>
/// Simple IChatClient stub for tests. Returns a fixed response for every call.
/// Avoids Moq's inability to mock extension methods on IChatClient.
/// Pass throwOnCall: true to simulate a model-unavailable (busy) scenario.
/// </summary>
public sealed class StubChatClient(string? response, bool throwOnCall = false) : IChatClient
{
    public Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        if (throwOnCall)
            throw new InvalidOperationException("Simulated model unavailable");

        var text = messages.FirstOrDefault()?.Text ?? string.Empty;
        var finalResponse = response;

        if (finalResponse == null)
        {
            // Smart Stubbing: Detect if this is a translation or a re-ranking call
            if (text.Contains("selectedRecipeId"))
            {
                finalResponse = """{"selectedRecipeId":"00000000-0000-0000-0000-000000000000","reason":"Stubbed RAG Reason"}""";
            }
            else if (text.Contains("query translator"))
            {
                finalResponse = """{"query":"","filters":{}}""";
            }
            else if (text.Contains("CLASSIFICATION PROTOCOL") || text.Contains("pantry/fridge/freezer"))
            {
                finalResponse = """{"intent":"inventory","query":"","ingredients":["pasta"],"confidence":0.85}""";
            }
        }

        var reply = new ChatResponse(new ChatMessage(ChatRole.Assistant, finalResponse ?? string.Empty));
        return Task.FromResult(reply);
    }

    public IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        throw new NotSupportedException("Streaming not needed in tests.");
    }

    public object? GetService(Type serviceType, object? serviceKey = null) => null;

    public void Dispose() { }
}
