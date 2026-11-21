using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeShareCanonicalTests
{
    [Fact]
    public async Task OrdinaryShareImport_PublishesCanonicalTextWithoutInventingQuantityOrBasis()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        var id = Guid.NewGuid();
        var bundle = new
        {
            version = "1.0",
            recipe = new { name = "Shared pasta", ingredients = new[] { "200 g pasta", "salt to taste" },
                instructions = new[] { new { name = "Cook", itemListElement = new[] { new { text = "Cook 200 g pasta for 10 minutes." } } } },
                sourceUrl = "https://example.test/shared", isSynthesized = false },
            info = new { bundleSource = "wfs-share", recipeId = id, exportedAtUtc = DateTimeOffset.UtcNow },
            originals = Array.Empty<object>()
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipes/import-bundle") { Content = JsonContent.Create(bundle) };
        request.Headers.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var canonical = CanonicalRecipeContentStore.Read(saved);
        Assert.NotNull(canonical);
        Assert.Equal(new[] { "200 g pasta", "salt to taste" }, canonical.IngredientLines.Select(x => x.Description));
        Assert.Null(canonical.Servings);
        Assert.All(canonical.IngredientLines, line =>
        {
            Assert.NotEqual(Guid.Empty, line.Id);
            Assert.Null(line.Amount);
            Assert.Null(line.Unit);
            Assert.Null(line.Package);
            Assert.Equal("legacy_unknown", line.Provenance.Origin);
            Assert.Null(line.Provenance.SourceRef);
            Assert.Equal(new[] { "description", "amount", "amountText", "unit", "scaling", "package", "shopping" }, line.Provenance.ProtectedFields);
        });
        Assert.Equal(2, canonical.IngredientLines.Select(x => x.Id).Distinct().Count());
        Assert.Equal("Cook 200 g pasta for 10 minutes.", Assert.Single(Assert.Single(canonical.InstructionSections).Steps).Text);
        Assert.Empty(Assert.Single(Assert.Single(canonical.InstructionSections).Steps).Bindings);
        Assert.True(saved.IsReady);
        Assert.Equal(factory.DefaultFamilyMemberId, saved.AddedBy);
        Assert.Single(await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == id).ToListAsync());
    }
    [Fact]
    public async Task SharedPublication_RejectsForgedSourceRevisionBeforeAnyLiveWrite()
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
        received["content"]!["sourceRevision"] = "source.forged";
        var rejected = await Assert.ThrowsAsync<InvalidDataException>(() => publications.PublishAsync(capture,
            candidate with { RecipeJson = received.ToJsonString() }, operation));
        Assert.Equal("Shared content differs from its captured text and vocabulary decision.", rejected.Message);
        Assert.False(await db.Recipes.AnyAsync(x => x.Id == id));
        Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == id));
        Assert.False(await repository.ExistsAsync(id, "recipe.info"));
        Assert.False(await repository.ExistsAsync(id, "recipe.json"));
    }
}
