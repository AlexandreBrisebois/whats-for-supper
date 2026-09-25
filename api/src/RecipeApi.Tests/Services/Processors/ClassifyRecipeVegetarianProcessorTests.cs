using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Moq;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class ClassifyRecipeVegetarianProcessorTests
{
    [Theory]
    [InlineData("[\"lentils\", \"eggs\"]", true)]
    [InlineData("[\"beef\"]", false)]
    [InlineData("[\"pork\"]", false)]
    [InlineData("[\"chicken\"]", false)]
    [InlineData("[\"salmon\"]", false)]
    [InlineData("[\"shrimp\"]", false)]
    [InlineData("[\"chicken stock\"]", false)]
    [InlineData("[\"fish sauce\"]", false)]
    [InlineData("[\"anchovy\"]", false)]
    public async Task ExecuteAsync_AcceptsExplicitClassificationForIngredientCases(string ingredients, bool expected)
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), Ingredients = ingredients };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var chat = ResponseChat(expected);
        var processor = new ClassifyRecipeVegetarianProcessor(db, chat.Object, Policy(), new VegetarianClassificationWriter(), new FixedClock());

        await processor.ExecuteAsync(new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) }, CancellationToken.None);

        Assert.Equal(expected, recipe.IsVegetarian);
    }

    [Fact]
    public async Task ExecuteAsync_ClassifiesFromIngredientsAndDoesNotRequireRecipeTitle()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Chicken named but bean recipe", Ingredients = "[\"white beans\", \"eggs\"]" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var chat = ResponseChat(true);
        var processor = new ClassifyRecipeVegetarianProcessor(db, chat.Object,
            Policy(), new VegetarianClassificationWriter(), new FixedClock());

        var result = await processor.ExecuteAsync(new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) }, CancellationToken.None);

        Assert.True(recipe.IsVegetarian);
        Assert.Equal(CategorizeRecipeProcessor.VegetarianClassifierVersion, recipe.VegetarianClassificationVersion);
        Assert.Contains("white beans", chat.Invocations.Single().Arguments.OfType<IEnumerable<ChatMessage>>().Single().Single().Text);
    }

    [Theory]
    [InlineData("```json\n{\"isVegetarian\":true}\n```", true)]
    [InlineData("```\n{\"isVegetarian\":false}\n```", false)]
    public async Task ExecuteAsync_AcceptsMarkdownFencedClassificationJson(string responseText, bool expected)
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), Ingredients = "[\"lentils\"]" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var chat = new Mock<IChatClient>();
        chat.Setup(client => client.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, responseText)));
        var processor = new ClassifyRecipeVegetarianProcessor(db, chat.Object,
            Policy(), new VegetarianClassificationWriter(), new FixedClock());

        await processor.ExecuteAsync(new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) }, CancellationToken.None);

        Assert.Equal(expected, recipe.IsVegetarian);
        Assert.Equal(CategorizeRecipeProcessor.VegetarianClassifierVersion, recipe.VegetarianClassificationVersion);
        Assert.Null(recipe.VegetarianClassificationFailedAt);
    }

    [Fact]
    public async Task ExecuteAsync_MalformedResponsePreservesConfirmedFactAndRecordsFailure()
    {
        await using var db = TestDbContextFactory.Create();
        var recipe = new Recipe { Id = Guid.NewGuid(), Ingredients = "[\"lentils\"]", IsVegetarian = true, VegetarianClassificationVersion = 1, VegetarianClassifiedAt = DateTimeOffset.UtcNow };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var chat = new Mock<IChatClient>();
        chat.Setup(client => client.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, "not-json")));
        var processor = new ClassifyRecipeVegetarianProcessor(db, chat.Object,
            Policy(), new VegetarianClassificationWriter(), new FixedClock());

        await Assert.ThrowsAsync<JsonException>(() => processor.ExecuteAsync(new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) }, CancellationToken.None));

        Assert.True(recipe.IsVegetarian);
        Assert.Equal(1, recipe.VegetarianClassificationVersion);
        Assert.NotNull(recipe.VegetarianClassificationFailedAt);
    }

    private sealed class FixedClock : IClock { public DateTimeOffset UtcNow => DateTimeOffset.Parse("2026-09-24T12:00:00Z"); }
    private static VegetarianClassificationPolicy Policy() => new(Options.Create(new VegetarianClassificationOptions()));
    private static Mock<IChatClient> ResponseChat(bool value)
    {
        var chat = new Mock<IChatClient>();
        chat.Setup(client => client.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, $"{{\"isVegetarian\":{value.ToString().ToLowerInvariant()}}}")));
        return chat;
    }
}
