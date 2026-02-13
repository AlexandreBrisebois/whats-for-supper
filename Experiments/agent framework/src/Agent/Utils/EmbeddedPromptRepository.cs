using System.Reflection;

namespace Agent.Utils;

public class EmbeddedPromptRepository : IPromptRepository
{
    private readonly Dictionary<PromptType, string> _promptCache;
    private readonly Dictionary<PromptType, string> _resourceNames = new()
    {
        { PromptType.RecipeExtraction, "Agent.Prompts.extract-recipe-prompt.md" },
        { PromptType.ThumbnailGeneration, "Agent.Prompts.generate-thumbnail-prompt.md" },
        { PromptType.RecipeMarketing, "Agent.Prompts.generate-descriptions-and-keywords-prompt.md" }
    };

    public EmbeddedPromptRepository()
    {
        _promptCache = new Dictionary<PromptType, string>();
        
        // Preload all prompts
        foreach (var promptType in Enum.GetValues<PromptType>())
        {
            _promptCache[promptType] = LoadPromptFromEmbeddedResource(promptType);
        }
    }

    public string GetPrompt(PromptType promptType)
    {
        return _promptCache[promptType];
    }

    private string LoadPromptFromEmbeddedResource(PromptType promptType)
    {
        var resourceName = _resourceNames[promptType];
        var assembly = Assembly.GetExecutingAssembly();
        
        using var stream = assembly.GetManifestResourceStream(resourceName);
        
        if (stream == null)
        {
            throw new PromptNotFoundException(promptType, resourceName);
        }

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}

