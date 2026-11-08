using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>Wire validation before activation must neither ignore input nor apply unrelated fields.</summary>
public class CanonicalIngredientInputTests
{
    public static IEnumerable<object[]> InvalidLines()
    {
        foreach (var amount in new[]
        {
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"1\",\"d\":\"0\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"2\",\"d\":\"4\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"01\",\"d\":\"1\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"-1\",\"d\":\"1\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"١\",\"d\":\"1\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"100000000000000000000000000000000000000\",\"d\":\"1\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"1\",\"d\":\"1\"},\"min\":{\"n\":\"0\",\"d\":\"1\"}}",
            "{\"kind\":\"range\",\"min\":{\"n\":\"3\",\"d\":\"1\"},\"max\":{\"n\":\"2\",\"d\":\"1\"}}",
            "{\"kind\":\"scalar\",\"value\":{\"n\":\"1\",\"d\":\"1\"},\"madeUp\":true}",
        })
        {
            var row = Line(); row["amount"] = JsonSerializer.Deserialize<JsonElement>(amount);
            yield return [row];
        }
        foreach (var key in new[] { "amount", "amountText", "unit", "package", "shopping", "scaling", "description" })
        {
            var row = Line(); row.Remove(key); yield return [row];
        }
        var mismatch = Line(); mismatch["amountText"] = "1/3"; yield return [mismatch];
        var blank = Line(); blank["description"] = " "; yield return [blank];
        var missing = Line(); missing.Remove("clientId"); yield return [missing];
        var claimed = Line(); claimed["id"] = Guid.Parse("660e8400-e29b-41d4-a716-446655440099"); yield return [claimed];
        var empty = Line(); empty.Remove("clientId"); empty["id"] = Guid.Empty; yield return [empty];
        var protectedRow = Line(); protectedRow["provenance"] = new { origin = "source" }; yield return [protectedRow];
        var unknown = Line(); unknown["amount"] = null; yield return [unknown];
    }

    [Theory]
    [MemberData(nameof(InvalidLines))]
    public async Task InvalidCanonicalFactsRejectBeforeAnyFieldChanges(Dictionary<string, object?> row)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Original", Ingredients = "[\"1 cup pasta\"]", Servings = 4 };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        using var client = factory.CreateClient();
        var response = await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}", new
        {
            name = "Must not save", expectedContentRevision = "not-activated", ingredientLines = new[] { row }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal("Original", (await db.Recipes.FindAsync(recipe.Id))!.Name);
        factory.WorkflowOrchestratorMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("0", "0", "1")]
    [InlineData("1/3", "1", "3")]
    [InlineData("⅓", "1", "3")]
    [InlineData("1 1/2", "3", "2")]
    [InlineData("0,25", "1", "4")]
    public async Task ExactValidFactsReachActivationFenceWithoutBeingSaved(string notation, string numerator, string denominator)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Original", Servings = null };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        var row = Line(); row["amountText"] = notation;
        row["amount"] = new { kind = "scalar", value = new { n = numerator, d = denominator } };
        using var client = factory.CreateClient();
        var response = await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}", new { ingredientLines = new[] { row } });
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        db.ChangeTracker.Clear();
        Assert.Null((await db.Recipes.FindAsync(recipe.Id))!.Servings);
        Assert.Null((await db.Recipes.FindAsync(recipe.Id))!.Ingredients);
    }

    private static Dictionary<string, object?> Line() => new()
    {
        ["clientId"] = "new-row", ["description"] = "pasta", ["amount"] = new { kind = "scalar", value = new { n = "1", d = "1" } },
        ["amountText"] = "1", ["unit"] = new { text = "cup", definitionId = (string?)null }, ["scaling"] = "proportional",
        ["package"] = null, ["shopping"] = new { name = "pasta", foodId = (Guid?)null, mappingRevision = (string?)null }
    };
}
