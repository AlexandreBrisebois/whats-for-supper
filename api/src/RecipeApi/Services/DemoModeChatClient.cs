using Microsoft.Extensions.AI;

namespace RecipeApi.Services;

/// <summary>
/// A decorator for IChatClient that prevents all outgoing LLM calls when Demo Mode is enabled.
/// This acts as a safety "hard disable" to ensure no costs are incurred even if a bypass is missed.
/// </summary>
public class DemoModeChatClient(IChatClient inner, DemoModeOptions demoMode) : DelegatingChatClient(inner)
{
    public override Task<ChatResponse> GetResponseAsync(IEnumerable<ChatMessage> chatMessages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        if (demoMode.Enabled)
        {
            throw new InvalidOperationException("Outgoing AI Chat calls are disabled in Demo Mode.");
        }

        return base.GetResponseAsync(chatMessages, options, cancellationToken);
    }

    public override IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(IEnumerable<ChatMessage> chatMessages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        if (demoMode.Enabled)
        {
            throw new InvalidOperationException("Outgoing AI Streaming Chat calls are disabled in Demo Mode.");
        }

        return base.GetStreamingResponseAsync(chatMessages, options, cancellationToken);
    }
}
