using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using SkiaSharp;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryRecipesTests : CurrentRecoveryTestSet
{
    private async Task<CurrentRecoveryRecipes> StageAsync()
    {
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        return await CurrentRecoveryRecipes.StageAsync(await InspectAsync());
    }

    [Fact]
    public async Task ValidMetadataAndActualImage_StageWithoutChangingFrozenOrLiveFiles()
    {
        await StageAsync();
        var before = DiskHashes();
        await CurrentRecoveryRecipes.StageAsync(await InspectAsync());
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData("missing-readiness")]
    [InlineData("missing-null")]
    [InlineData("missing-created")]
    [InlineData("null-readiness")]
    [InlineData("invalid-rating")]
    [InlineData("old-rotation")]
    [InlineData("invalid-rotation-source")]
    [InlineData("human-rotation-contradiction")]
    [InlineData("ready-without-name")]
    [InlineData("default-created")]
    [InlineData("updated-before-created")]
    [InlineData("empty-member-id")]
    [InlineData("invalid-source-url")]
    [InlineData("instructions-in-info")]
    [InlineData("basis-in-info")]
    [InlineData("unknown-field")]
    [InlineData("extra-original")]
    [InlineData("unknown-media-path")]
    [InlineData("corrupt-image")]
    [InlineData("wrong-encoding")]
    [InlineData("corrupt-hero")]
    public async Task InvalidRecipe_IsRejectedBeforeAnyPublication(string mutation)
    {
        var info = JsonNode.Parse(_files[_manifest.Recipes[0].Metadata])!.AsObject();
        switch (mutation)
        {
            case "missing-readiness": info.Remove("isReady"); break;
            case "missing-null": info.Remove("notes"); break;
            case "missing-created": info.Remove("createdAt"); break;
            case "null-readiness": info["isReady"] = null; break;
            case "invalid-rating": info["rating"] = 100; break;
            case "old-rotation": info["rotationVersion"] = 0; break;
            case "invalid-rotation-source": info["rotationSource"] = "private bogus source"; break;
            case "human-rotation-contradiction": info["rotationHumanOff"] = true; break;
            case "ready-without-name": info["name"] = " "; break;
            case "default-created": info["createdAt"] = "0001-01-01T00:00:00Z"; break;
            case "updated-before-created": info["updatedAt"] = "2020-01-01T00:00:00Z"; break;
            case "empty-member-id": info["addedBy"] = Guid.Empty; break;
            case "invalid-source-url": info["sourceUrl"] = "file:///private/recipe"; break;
            case "instructions-in-info": info["recipeInstructions"] = new JsonArray("stale instructions"); break;
            case "basis-in-info": info["servings"] = 4; break;
            case "unknown-field": info["privateMystery"] = "sensitive body"; break;
            case "extra-original": AddMedia("original/1.png", RecipeImage()); break;
            case "unknown-media-path": AddMedia("other.png", RecipeImage()); break;
            case "corrupt-image": _files[$"recipes/{_recipe}/original/0.png"] = [1, 2, 3]; break;
            case "wrong-encoding":
                var path = $"recipes/{_recipe}/original/0.png";
                var wrong = $"recipes/{_recipe}/original/0.jpg";
                _files[wrong] = _files[path]; _files.Remove(path);
                _manifest = _manifest with { Artifacts = _manifest.Artifacts.Select(x => x.Path == path ? x with { Path = wrong } : x).ToArray() };
                break;
            case "corrupt-hero": AddMedia("hero.webp", "sensitive corrupt image"u8.ToArray()); break;
        }
        _files[_manifest.Recipes[0].Metadata] = Encoding.UTF8.GetBytes(info.ToJsonString());
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var before = DiskHashes();
        // Inventory is still structurally valid. Semantic errors must be separate.
        var inventory = await InspectAsync();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.NotEmpty(error.Diagnostics);
        Assert.DoesNotContain("sensitive", JsonSerializer.Serialize(error.Diagnostics));
        Assert.DoesNotContain("private bogus", JsonSerializer.Serialize(error.Diagnostics));
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    private void AddMedia(string suffix, byte[] bytes)
    {
        var path = $"recipes/{_recipe}/" + suffix;
        _files[path] = bytes;
        _manifest = _manifest with { Artifacts = [.. _manifest.Artifacts, new(path, "recipe-media", _recipe, [_manifest.Recipes[0].Metadata])] };
    }

    [Fact]
    public async Task PixelBudgets_RejectBeforeDecodingAndCancellationIsNotInputCorruption()
    {
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var inventory = await InspectAsync();
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => CurrentRecoveryRecipes.StageAsync(inventory, maxImagePixels: 3));
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => CurrentRecoveryRecipes.StageAsync(inventory, maxTotalImagePixels: 3));
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CurrentRecoveryRecipes.StageAsync(inventory, cancellation.Token));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PdfReadiness_IsExplicitAndIndependentOfNamePagesAndSynthesis(bool ready)
    {
        var info = JsonNode.Parse(_files[_manifest.Recipes[0].Metadata])!.AsObject();
        info["isReady"] = ready;
        info["isDiscoverable"] = false;
        info["isSynthesized"] = true;
        if (!ready) info["name"] = null;
        _files[_manifest.Recipes[0].Metadata] = Encoding.UTF8.GetBytes(info.ToJsonString());
        var path = $"recipes/{_recipe}/original/source.pdf";
        // Retained rejected/unfinished uploads are evidence, not certified PDFs.
        _files[path] = "retained rejected source"u8.ToArray();
        _manifest = _manifest with { Artifacts = [.. _manifest.Artifacts, new(path, "recipe-evidence", _recipe, [])] };
        var source = _manifest.Recipes[0].Sources[0];
        _manifest.Recipes[0].Sources[0] = source with { Artifacts = [.. source.Artifacts, path] };
        await StageAsync();
    }

    [Theory]
    [InlineData("metadata")]
    [InlineData("image")]
    public async Task ManagementSemanticPreflight_RejectsBeforeAnyDestinationAccess(string artifact)
    {
        if (artifact == "metadata")
        {
            var info = JsonNode.Parse(_files[_manifest.Recipes[0].Metadata])!.AsObject();
            info.Remove("isReady");
            _files[_manifest.Recipes[0].Metadata] = Encoding.UTF8.GetBytes(info.ToJsonString());
        }
        else _files[$"recipes/{_recipe}/original/0.png"] = [1, 2, 3];
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        await InspectAsync();
        var before = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Fact]
    public async Task StagingAndTypedReads_UseOnlyFrozenBytesAndReturnIndependentValues()
    {
        await WriteAsync();
        var inventory = await InspectAsync();
        foreach (var path in inventory.Paths)
            await File.WriteAllTextAsync(Path.Combine(_root, path), "changed after frozen capture");
        var stage = await CurrentRecoveryRecipes.StageAsync(inventory);
        Assert.Equal(_recipe, Assert.Single(stage.RecipeIds));
        var info = stage.ReadMetadata(_recipe);
        Assert.True(info.IsReady);
        Assert.Equal("Private note", info.Notes);
        Assert.Null(info.Description);
        info.MealTypes![0] = "mutated array";
        Assert.Equal("Supper", stage.ReadMetadata(_recipe).MealTypes![0]);
        var content = stage.ReadContent(_recipe);
        var lines = Assert.IsAssignableFrom<IList<RecipeIngredientLineDto>>(content.Content.IngredientLines);
        lines[0] = lines[0] with { Description = "mutated content" };
        Assert.Equal("flour", stage.ReadContent(_recipe).Content.IngredientLines[0].Description);
    }

    [Theory]
    [InlineData(".jpg", SKEncodedImageFormat.Jpeg)]
    [InlineData(".jpeg", SKEncodedImageFormat.Jpeg)]
    [InlineData(".webp", SKEncodedImageFormat.Webp)]
    public async Task SupportedOriginalEncoding_IsDecodedWithoutTranscodingRetainedBytes(string extension, SKEncodedImageFormat format)
    {
        var old = $"recipes/{_recipe}/original/0.png";
        var path = $"recipes/{_recipe}/original/0" + extension;
        _files.Remove(old);
        _files[path] = RecipeImage(format);
        _manifest = _manifest with { Artifacts = _manifest.Artifacts.Select(x => x.Path == old ? x with { Path = path } : x).ToArray() };
        await StageAsync();
        Assert.Equal(_files[path], await File.ReadAllBytesAsync(Path.Combine(_root, path)));
    }

    [Fact]
    public async Task AggregatePixelBudget_CountsOriginalsAndHeroTogether()
    {
        AddMedia("hero.jpg", RecipeImage(SKEncodedImageFormat.Jpeg));
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var inventory = await InspectAsync();
        await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => CurrentRecoveryRecipes.StageAsync(inventory, maxTotalImagePixels: 7));
        await CurrentRecoveryRecipes.StageAsync(inventory, maxTotalImagePixels: 8);
    }

    [Fact]
    public async Task MetadataFailure_DoesNotSuppressLaterImageDiagnostics()
    {
        var info = JsonNode.Parse(_files[_manifest.Recipes[0].Metadata])!.AsObject();
        info.Remove("isReady");
        _files[_manifest.Recipes[0].Metadata] = Encoding.UTF8.GetBytes(info.ToJsonString());
        _files[$"recipes/{_recipe}/original/0.png"] = [1, 2, 3];
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(StageAsync);
        Assert.Contains(error.Diagnostics, x => x.Code == "invalid-current-recipe-metadata");
        Assert.Contains(error.Diagnostics, x => x.Code == "invalid-current-image");
    }
}
