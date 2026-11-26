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

    [Fact]
    public void RecipeSynthesis_Prompt_EnforcesNumericValuesStringYieldNullNutritionAndConciseTitle()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.RecipeSynthesis);

        Assert.Contains("JSON number", prompt, StringComparison.Ordinal);
        Assert.Contains("JSON string", prompt, StringComparison.Ordinal);
        Assert.Contains("\"nutrition\": null", prompt, StringComparison.Ordinal);
        Assert.Contains("concise dish title", prompt, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void DescriptionGeneration_Prompt_InstructsMatchingRecipeLanguage()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.DescriptionGeneration);

        Assert.Contains("same language as the recipe", prompt, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void WebRecipeExtraction_Prompt_OmitsMarkdownFencesAndAmbiguousLanguageCode()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.WebRecipeExtraction);

        Assert.DoesNotContain("```json", prompt, StringComparison.Ordinal);
        Assert.DoesNotContain("\"FR/EN\"", prompt, StringComparison.Ordinal);
        Assert.Contains("JSON number", prompt, StringComparison.Ordinal);
    }

    [Fact]
    public void RecipeExtraction_Prompt_HasUniqueSectionNumberingAndNumericSupplyRule()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.RecipeExtraction);

        Assert.DoesNotContain("4. SCHEMA TEMPLATE", prompt, StringComparison.Ordinal);
        Assert.Contains("7. SCHEMA TEMPLATE", prompt, StringComparison.Ordinal);
        Assert.Contains("JSON number", prompt, StringComparison.Ordinal);
    }

    [Fact]
    public void RecipeExtraction_Prompt_SupportsAllMealKitLayoutsTotalTimeAndSwapNotes()
    {
        var repo = new EmbeddedPromptRepository();

        var prompt = repo.GetPrompt(PromptType.RecipeExtraction);

        Assert.Contains("Scan ALL provided images", prompt, StringComparison.Ordinal);
        Assert.Contains("170 g | 340 g", prompt, StringComparison.Ordinal);
        Assert.Contains("OPTIONAL SWAPS / CUSTOMIZATIONS", prompt, StringComparison.Ordinal);
        Assert.Contains("\"notes\": null", prompt, StringComparison.Ordinal);
    }
}
