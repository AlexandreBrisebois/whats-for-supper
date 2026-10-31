namespace RecipeApi.Services;

/// <summary>Independent observations of confirmed issue persistence boundaries.</summary>
public interface IRecipeIssueTelemetry
{
    void Saved();
    void Resolved();
}
