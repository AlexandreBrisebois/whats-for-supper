namespace Agent.Utils;

public class PromptNotFoundException : Exception
{
    public PromptNotFoundException(PromptType promptType, string resourceName) 
        : base($"Prompt '{promptType}' not found. Expected embedded resource: {resourceName}")
    {
    }
}

