using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeShareCanonicalTests
{
    [Theory]
    [InlineData("quantity")]
    [InlineData("source-provenance")]
    [InlineData("unprotected-unknown")]
    [InlineData("instruction-text")]
    [InlineData("binding")]
    [InlineData("mapping-evidence")]
    [InlineData("basis")]
    public async Task SharedPublication_RejectsInventedFactsBeforeMembershipOrLiveFiles(string fault)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var publications = services.GetRequiredService<RecipeFilePublicationStore>();
        var repository = services.GetRequiredService<RecipeRepository>();
        var id = Guid.NewGuid();
        var operation = Guid.NewGuid();
        var capture = await publications.CaptureNewAsync(id);
        const string raw = """{"name":"Shared onions","recipeIngredient":["onion"],"recipeInstructions":[{"text":"Cook the onion."}]}""";
        var candidate = publications.PrepareSharedIntake(capture, raw,
            new RecipeInfo { Id = id, Name = "Shared onions", IsReady = true }, new Dictionary<string, byte[]?>(), operation);
        var received = JsonNode.Parse(candidate.RecipeJson!)!;
        var content = received["content"]!;
        var line = content["ingredientLines"]![0]!;
        var step = content["instructionSections"]![0]!["steps"]![0]!;
        switch (fault)
        {
            case "basis": content["servings"] = 4; break;
            case "quantity":
                line["amount"] = JsonNode.Parse("""{"kind":"scalar","value":{"n":"1","d":"1"}}""");
                line["amountText"] = "1";
                line["unit"] = JsonNode.Parse("""{"text":"g","definitionId":null}""");
                break;
            case "source-provenance":
                line["provenance"]!["origin"] = "source";
                line["provenance"]!["sourceRef"] = content["sourceRevision"]!.GetValue<string>();
                break;
            case "unprotected-unknown": line["provenance"]!["protectedFields"] = new JsonArray(); break;
            case "instruction-text": step["text"] = "Invented wording."; break;
            case "binding":
                step["bindings"] = new JsonArray(new JsonObject
                {
                    ["id"] = Guid.NewGuid(), ["ingredientLineId"] = line["id"]!.GetValue<string>(),
                    ["stepId"] = step["id"]!.GetValue<string>(), ["validatedContentRevision"] = content["contentRevision"]!.GetValue<string>(),
                    ["validatedTextRevision"] = step["textRevision"]!.GetValue<string>(),
                    ["span"] = new JsonObject { ["start"] = 0, ["end"] = 4, ["expectedText"] = "Cook" },
                    ["role"] = "mention", ["status"] = "validated", ["payload"] = new JsonObject()
                });
                break;
            case "mapping-evidence": candidate = candidate with { MappingEvidence = "{}" }; break;
        }
        await Assert.ThrowsAsync<InvalidDataException>(() => publications.PublishAsync(capture,
            candidate with { RecipeJson = received.ToJsonString() }, operation));
        Assert.False(await db.Recipes.AnyAsync(x => x.Id == id));
        Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == id));
        Assert.False(await repository.ExistsAsync(id, "recipe.info"));
        Assert.False(await repository.ExistsAsync(id, "recipe.json"));
    }

    [Fact]
    public async Task SharedPublication_NewMembershipCaptureRejectsLaterSourceFilesWithoutReplacingThem()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var publications = services.GetRequiredService<RecipeFilePublicationStore>();
        var repository = services.GetRequiredService<RecipeRepository>();
        var id = Guid.NewGuid();
        var operation = Guid.NewGuid();
        var capture = await publications.CaptureNewAsync(id);
        const string raw = """{"name":"Shared onions","recipeIngredient":["onion"],"recipeInstructions":[{"text":"Cook the onion."}]}""";
        var candidate = publications.PrepareSharedIntake(capture, raw,
            new RecipeInfo { Id = id, Name = "Shared onions", IsReady = true }, new Dictionary<string, byte[]?>(), operation);
        await repository.SaveOriginalImageAsync(id, 0, "image/png", [9, 8, 7], default);
        await Assert.ThrowsAsync<InvalidDataException>(() => publications.PublishAsync(capture, candidate, operation));
        Assert.Equal([9, 8, 7], await repository.GetOriginalImageAsync(id, 0, default));
        Assert.False(await db.Recipes.AnyAsync(x => x.Id == id));
        Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == id));
        Assert.False(await repository.ExistsAsync(id, "recipe.info"));
        Assert.False(await repository.ExistsAsync(id, "recipe.json"));
    }
}
