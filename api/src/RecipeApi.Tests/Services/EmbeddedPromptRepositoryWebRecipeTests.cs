using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Tests for EmbeddedPromptRepository loading of WebRecipeExtraction and the extract-web-recipe.md prompt.
/// </summary>
public class EmbeddedPromptRepositoryWebRecipeTests
{
    // ── Construction ──────────────────────────────────────────────────────────

    [Fact]
    public void Constructor_LoadsWebRecipeExtraction_WithoutThrowing()
    {
        // Should not throw — extract-web-recipe.md is embedded in the assembly
        var repo = new EmbeddedPromptRepository();
        Assert.NotNull(repo);
    }

    // ── GetPrompt ─────────────────────────────────────────────────────────────

    [Fact]
    public void GetPrompt_WebRecipeExtraction_ReturnsNonEmptyString()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.WebRecipeExtraction);

        Assert.NotNull(prompt);
        Assert.NotEmpty(prompt);
    }

    // ── Prompt content ────────────────────────────────────────────────────────

    [Fact]
    public void PromptText_ContainsJsonLdInstruction()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.WebRecipeExtraction);

        Assert.Contains("application/ld+json", prompt, StringComparison.Ordinal);
    }

    [Fact]
    public void PromptText_ContainsMicrodataInstruction()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.WebRecipeExtraction);

        Assert.Contains("schema.org/Recipe", prompt, StringComparison.Ordinal);
    }

    [Fact]
    public void PromptText_ContainsLanguagePreservationInstruction()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.WebRecipeExtraction);

        Assert.Contains("languageCode", prompt, StringComparison.Ordinal);
    }

    [Fact]
    public void PromptText_InstructsNullForMissingFields()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.WebRecipeExtraction);

        Assert.Contains("null", prompt, StringComparison.Ordinal);
    }
}
