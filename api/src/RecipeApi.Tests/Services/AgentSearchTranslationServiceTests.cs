using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class AgentSearchTranslationServiceTests
{
    private static AgentSearchTranslationService CreateService(string llmResponse) =>
        new AgentSearchTranslationService(new StubChatClient(llmResponse));

    [Fact]
    public async Task TranslateAsync_WithSimpleQuery_PreservesQueryInResult()
    {
        // agent mode with mode = "agent" passes through same RecipeSearchService
        var service = CreateService("""{"query":"chicken pasta","filters":{}}""");

        var input = new RecipeSearchRequestDto { Query = "something fresh and quick my kids will like", Mode = "agent" };
        var result = await service.TranslateAsync(input);

        Assert.NotNull(result);
        Assert.Equal("agent", result.Mode);
    }

    [Fact]
    public async Task TranslateAsync_LlmReturnsFilters_FiltersAreApplied()
    {
        var service = CreateService("""{"query":"quick dinner","filters":{"quickOnly":true}}""");

        var input = new RecipeSearchRequestDto { Query = "quick tonight", Mode = "agent" };
        var result = await service.TranslateAsync(input);

        Assert.True(result.Filters?.QuickOnly);
    }

    [Fact]
    public async Task TranslateAsync_LlmReturnsInvalidJson_FallsBackToOriginalRequest()
    {
        var service = CreateService("I cannot parse this");

        var input = new RecipeSearchRequestDto { Query = "something fresh", Mode = "agent" };
        var result = await service.TranslateAsync(input);

        Assert.Equal("something fresh", result.Query);
        Assert.Equal("agent", result.Mode);
    }

    [Fact]
    public async Task TranslateAsync_PreservesPlannerContext()
    {
        var service = CreateService("""{"query":"quick","filters":{}}""");

        var input = new RecipeSearchRequestDto
        {
            Query = "something quick",
            Mode = "agent",
            WeekOffset = 0,
            DayIndex = 2
        };
        var result = await service.TranslateAsync(input);

        Assert.Equal(0, result.WeekOffset);
        Assert.Equal(2, result.DayIndex);
    }

    [Fact]
    public async Task TranslateAsync_SearchModeIsAgent_OnAgentInput()
    {
        var service = CreateService("""{"query":"chicken","filters":{}}""");

        var input = new RecipeSearchRequestDto { Query = "chicken stuff", Mode = "agent" };
        var result = await service.TranslateAsync(input);

        Assert.Equal("agent", result.Mode);
    }

    [Fact]
    public async Task TranslateAsync_AgentResponseIsRecipeSearchResponseDto_NotChat()
    {
        // The translation service returns a RecipeSearchRequestDto for the search service,
        // not a chat-style response object.
        var service = CreateService("""{"query":"chicken","filters":{}}""");

        var input = new RecipeSearchRequestDto { Query = "what can I make with chicken", Mode = "agent" };
        var result = await service.TranslateAsync(input);

        Assert.IsType<RecipeSearchRequestDto>(result);
    }
}
