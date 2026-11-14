using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class CanonicalIngredientDuplicateInputTests
{
    [Theory]
    [InlineData("quantity-equal")]
    [InlineData("quantity-conflict")]
    [InlineData("capacity")]
    [InlineData("identity")]
    [InlineData("shopping")]
    [InlineData("section-identity")]
    [InlineData("steps")]
    [InlineData("step-text")]
    public async Task DuplicateCanonicalPropertiesRejectBeforeRecipeOrHistoryMutation(string duplicate)
    {
        await Check(duplicate);
    }

    [Fact]
    public async Task UniqueCanonicalPropertiesStillSaveAndLeaveReadableHistory() => await Check(null);

    private static async Task Check(string? duplicate)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Original", Notes = "Retained note", Servings = 4,
            Ingredients = "[\"200 g tomatoes\"]",
            RawMetadata = """{"recipeIngredient":["200 g tomatoes"],"supply":[{"name":"tomatoes","quantity":200,"unitText":"g"}]}""" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var converted = await scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>().ConvertAsync(recipe.Id,
            CanonicalRecipeContentStore.InspectContentRevision(recipe), CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
        var beforeRecipe = await RecipeState(db, recipe.Id);
        var beforeOperations = await OperationState(db);
        var beforeOperationCount = await db.CanonicalRecipeOperations.CountAsync();
        var beforePublications = await PublicationState(db);
        var id = JsonSerializer.Serialize(converted.Content.IngredientLines[0].Id);
        const string quantity = """{"kind":"scalar","value":{"n":"200","d":"1"}}""";
        var amount = duplicate switch
        {
            "quantity-equal" => quantity.Replace("\"kind\":\"scalar\"", "\"kind\":\"scalar\",\"kind\":\"scalar\""),
            "quantity-conflict" => quantity.Replace("\"kind\":\"scalar\"", "\"kind\":\"range\",\"kind\":\"scalar\""),
            _ => quantity
        };
        var package = duplicate == "capacity"
            ? """{"countUnit":{"text":"cans","definitionId":null},"capacity":{"amount":{"kind":"scalar","kind":"scalar","value":{"n":"400","d":"1"}},"unit":{"text":"g","definitionId":null}},"basis":"net"}"""
            : "null";
        var identity = duplicate == "identity" ? $"\"id\":{id},\"id\":{id}" : $"\"id\":{id}";
        var shopping = duplicate == "shopping" ? "\"name\":\"tomatoes\",\"name\":\"tomatoes\"" : "\"name\":\"tomatoes\"";
        var line = $$$"""{ {{{identity}}},"description":"tomatoes","amount":{{{amount}}},"amountText":"200","unit":{"text":"g","definitionId":null},"scaling":"proportional","package":{{{package}}},"shopping":{ {{{shopping}}},"foodId":null,"mappingRevision":null}}""";
        var text = duplicate == "step-text" ? "\"text\":\"Changed\",\"text\":\"Mix.\"" : "\"text\":\"Mix.\"";
        var steps = $$$"""[{"clientId":"step-new",{{{text}}}}]""";
        var sectionIdentity = duplicate == "section-identity" ? "\"clientId\":\"section-new\",\"clientId\":\"section-new\"" : "\"clientId\":\"section-new\"";
        var sectionSteps = duplicate == "steps" ? $"\"steps\":{steps},\"steps\":{steps}" : $"\"steps\":{steps}";
        var input = $$$"""{"expectedContentRevision":{{{JsonSerializer.Serialize(converted.Content.ContentRevision)}}},"name":"Saved","notes":"Changed note","ingredientLines":[{{{line}}}],"instructionSections":[{ {{{sectionIdentity}}},"name":null,{{{sectionSteps}}}}]}""";
        using var client = factory.CreateClient();
        using var response = await client.PatchAsync($"/api/recipes/{recipe.Id}", new StringContent(input, Encoding.UTF8, "application/json"));
        if (duplicate is not null)
        {
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest,
                $"Expected 400 for {duplicate}, received {(int)response.StatusCode}. Operations before {beforeOperationCount}, after {await db.CanonicalRecipeOperations.CountAsync()}. Body {await response.Content.ReadAsStringAsync()}");
            Assert.Equal(beforeRecipe, await RecipeState(db, recipe.Id));
            Assert.Equal(beforeOperations, await OperationState(db));
            Assert.Equal(beforePublications, await PublicationState(db));
        }
        else
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Saved", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id)).Name);
            Assert.Equal(2, await db.CanonicalRecipeOperations.CountAsync());
        }
        Assert.Null(await scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync());
    }

    private static async Task<string> RecipeState(RecipeDbContext db, Guid id) =>
        JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
    private static async Task<string> OperationState(RecipeDbContext db) =>
        JsonSerializer.Serialize(await db.CanonicalRecipeOperations.AsNoTracking().OrderBy(x => x.OperationId).ToArrayAsync());
    private static async Task<string> PublicationState(RecipeDbContext db) =>
        JsonSerializer.Serialize(await db.RecipeFilePublications.AsNoTracking().OrderBy(x => x.OperationId).ToArrayAsync());
}
