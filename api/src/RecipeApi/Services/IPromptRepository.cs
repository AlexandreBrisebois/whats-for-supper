namespace RecipeApi.Services;

/// <summary>
/// Interface for fetching AI prompts, ported from the agent-framework experiment.
/// </summary>
public interface IPromptRepository
{
    string GetPrompt(PromptType promptType);
}
