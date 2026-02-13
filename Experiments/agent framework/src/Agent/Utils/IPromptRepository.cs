namespace Agent.Utils;

public interface IPromptRepository
{
    string GetPrompt(PromptType promptType);
}

