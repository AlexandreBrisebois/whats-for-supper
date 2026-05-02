namespace RecipeApi.Services;

public interface IPromptRepository
{
    string GetPrompt(PromptType promptType);
}
