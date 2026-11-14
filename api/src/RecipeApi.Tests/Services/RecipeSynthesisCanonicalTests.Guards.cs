using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
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

public sealed partial class RecipeSynthesisCanonicalTests
{
    [Theory]
    [InlineData("source-revision")]
    [InlineData("quantity")]
    [InlineData("source-provenance")]
    [InlineData("unprotected-generated")]
    [InlineData("instruction-text")]
    [InlineData("mapping-evidence")]
    public async Task SynthesizedPublication_RejectsCanonicalFactsThatDifferFromRetainedGeneratedText(string fault)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        { ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true" });
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var storage = services.GetRequiredService<IStorageProvider>();
        await storage.SaveAsync("workflows", "goto-synthesis.yaml", await File.ReadAllTextAsync(Path.Combine(
            Integration.DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/goto-synthesis.yaml")));
        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var response = await client.PostAsJsonAsync("/api/recipes/describe", new { name = "Generated onions", description = "An onion dish." });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetGuid();
        var db = services.GetRequiredService<RecipeDbContext>();
        var task = await db.WorkflowTasks.SingleAsync(x => x.ProcessorName == "SynthesizeRecipe");
        var publisher = services.GetRequiredService<RecipeFilePublicationStore>();
        var capture = await publisher.CaptureForTaskAsync(task, id);
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CaseInsensitive)!;
        info.IsSynthesized = true;
        info.Name = "Generated onions";
        const string raw = """{"name":"Generated onions","recipeYield":"4 servings","recipeIngredient":["onion"],"recipeInstructions":[{"name":"Cook","itemListElement":[{"text":"Cook the onion."}]}]}""";
        var prepare = typeof(RecipeFilePublicationStore).GetMethod("PrepareSynthesizedIntakeAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
        var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!;
        var pending = (Task)prepare.Invoke(publisher, [capture, raw, info, task.TaskId,
            "SynthesizeRecipe\n" + (string)normalize.Invoke(null, [task.Payload])!, CancellationToken.None])!;
        await pending;
        var candidate = (RecipePublicationCandidate)pending.GetType().GetProperty("Result")!.GetValue(pending)!;
        Assert.NotNull(candidate);
        var received = JsonNode.Parse(candidate.RecipeJson!)!;
        var content = received["content"]!;
        var line = content["ingredientLines"]![0]!;
        switch (fault)
        {
            case "source-revision": content["sourceRevision"] = "source.forged"; break;
            case "quantity":
                line["amount"] = JsonNode.Parse("""{"kind":"scalar","value":{"n":"20","d":"1"}}""");
                line["amountText"] = "20";
                break;
            case "source-provenance":
                line["provenance"]!["origin"] = "source";
                line["provenance"]!["sourceRef"] = content["sourceRevision"]!.GetValue<string>();
                break;
            case "unprotected-generated": line["provenance"]!["protectedFields"] = new JsonArray(); break;
            case "instruction-text": content["instructionSections"]![0]!["steps"]![0]!["text"] = "Invented instruction."; break;
            case "mapping-evidence": candidate = candidate with { MappingEvidence = "{}" }; break;
        }
        var prior = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var files = capture.Files.Where(x => x.Value is not null).ToDictionary(x => x.Key, x => x.Value!);
        await Assert.ThrowsAsync<InvalidDataException>(() => publisher.PublishAsync(capture,
            candidate with { RecipeJson = received.ToJsonString() }, task.TaskId));
        db.ChangeTracker.Clear();
        var current = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal(prior.CanonicalContent, current.CanonicalContent);
        Assert.Equal(prior.RawMetadata, current.RawMetadata);
        Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
        foreach (var (path, bytes) in files)
            Assert.Equal(bytes, await storage.LoadAsync("recipes", $"{id}/{path}"));
    }
}
