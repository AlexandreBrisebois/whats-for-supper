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

        var reply = new ChatResponse(new ChatMessage(ChatRole.Assistant, response ?? string.Empty));
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
