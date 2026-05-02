namespace RecipeApi.Services;

using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

/// <summary>
/// Embedded resource implementation of <see cref="IPromptRepository"/>, ported from the agent-framework experiment.
/// Loads prompts from .md files embedded in the assembly.
/// </summary>
public class EmbeddedPromptRepository : IPromptRepository
{
    private readonly Dictionary<PromptType, string> _promptCache = new();
    private readonly Dictionary<PromptType, string> _resourceNames = new()
    {
        { PromptType.RecipeExtraction, "RecipeApi.Prompts.extract-recipe.md" },
        { PromptType.DescriptionGeneration, "RecipeApi.Prompts.generate-description.md" },
        { PromptType.RecipeSynthesis, "RecipeApi.Prompts.synthesize-recipe.md" }
    };

    public EmbeddedPromptRepository()
    {
        // Preload prompts for performance and fail-fast validation
        foreach (PromptType promptType in Enum.GetValues<PromptType>())
        {
            if (_resourceNames.TryGetValue(promptType, out var resourceName))
            {
                _promptCache[promptType] = LoadPromptFromEmbeddedResource(resourceName);
            }
        }
    }

    public string GetPrompt(PromptType promptType)
    {
        if (_promptCache.TryGetValue(promptType, out var prompt))
        {
            return prompt;
        }
        throw new KeyNotFoundException($"Prompt for {promptType} not found in repository.");
    }

    private string LoadPromptFromEmbeddedResource(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(resourceName);

        if (stream == null)
        {
            throw new FileNotFoundException($"Embedded prompt resource {resourceName} not found.");
        }

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
