namespace RecipeApi.Services;

/// <summary>A permanent demo restriction, not a transient provider failure.</summary>
public sealed class DemoAiUnavailableException() : InvalidOperationException(Explanation)
{
    public const string Code = "DEMO_AI_UNAVAILABLE";
    public const string Explanation = "AI capture and generation are unavailable in Demo Mode. Explore the prepared recipes instead.";
}
