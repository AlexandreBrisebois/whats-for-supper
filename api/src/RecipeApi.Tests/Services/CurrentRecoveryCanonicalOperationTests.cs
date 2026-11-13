using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryCanonicalOperationTests : CurrentRecoveryTestSet
{
    [Fact]
    public async Task HistoricalSectionAndStepMappingsSurviveReadbackWithoutInventingOriginalRequest()
    {
        var value = JsonNode.Parse(_files["durable-obligations.json"])!;
        var content = JsonNode.Parse(_files[_manifest.Recipes[0].Content])!["content"]!;
        var section = content["instructionSections"]![0]!;
        value["canonicalOperations"]!.AsArray().Add(new JsonObject
        {
            ["recipeId"] = _recipe, ["operationId"] = Guid.NewGuid(), ["inputHash"] = new string('A', 64),
            ["createdAt"] = CurrentRecoveryHouseholdTestData.Created,
            ["result"] = new JsonObject { ["content"] = content.DeepClone(), ["createdIds"] = new JsonObject
            {
                ["row"] = content["ingredientLines"]![0]!["id"]!.DeepClone(),
                ["section"] = section["id"]!.DeepClone(), ["step"] = section["steps"]![0]!["id"]!.DeepClone()
            } }
        });
        var stage = await StageAsync(value);
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        Assert.False(JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)!["canonicalOperations"]![0]!.AsObject().ContainsKey("originalRequest"));
        var original = value.DeepClone();
        value["canonicalOperations"]![0]!["result"]!["createdIds"]!["step"] = Guid.NewGuid();
        await RefuseAsync(value);
        value = original.DeepClone();
        value["canonicalOperations"]![0]!["result"]!["createdIds"]!["step"] = section["id"]!.DeepClone();
        await RefuseAsync(value);
    }

    [Fact]
    public async Task HistoricalResultAtCurrentRevisionMustMatchSavedContent()
    {
        var value = JsonNode.Parse(_files["durable-obligations.json"])!;
        var content = JsonNode.Parse(_files[_manifest.Recipes[0].Content])!["content"]!.DeepClone();
        content["servings"] = 7;
        value["canonicalOperations"]!.AsArray().Add(new JsonObject
        {
            ["recipeId"] = _recipe, ["operationId"] = Guid.NewGuid(), ["inputHash"] = new string('A', 64),
            ["createdAt"] = CurrentRecoveryHouseholdTestData.Created,
            ["result"] = new JsonObject { ["content"] = content, ["createdIds"] = new JsonObject() }
        });
        await RefuseAsync(value);
    }

    [Fact]
    public async Task HistoricalV1OriginalRequestsSurviveFrozenReadbackAndRejectRehashedDivergence()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckOriginalsAsync(factory.Services);
    }

    [Fact]
    public async Task CurrentV2OriginalRequestsAreRejectedByHistoricalFormatBeforeWrites()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckOriginalsAsync(factory.Services, currentV2: true);
    }

    internal async Task CheckOriginalsAsync(IServiceProvider services, bool currentV2 = false)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var recipe = new Recipe { Id = _recipe, Name = "Original private recipe", Notes = "Original private note",
            Ingredients = "[\"salt\"]", RawMetadata = "{\"recipeInstructions\":[{\"text\":\"Mix.\"}]}",
            CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        Guid firstId, editId;
        CanonicalRecipeWriteResult edit;
        CanonicalRecipeOperation[] saved;
        if (currentV2)
        {
            var store = new CanonicalRecipeContentStore(db, clock, scope.ServiceProvider.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, scope.ServiceProvider.GetRequiredService<IStorageProvider>(), clock, scope.ServiceProvider));
            firstId = Guid.NewGuid(); editId = Guid.NewGuid();
            var first = await store.ConvertAsync(_recipe, CanonicalRecipeContentStore.InspectContentRevision(recipe),
                CanonicalRecipeContentStore.InspectSourceRevision(recipe), firstId);
            edit = await store.EditAsync(_recipe, first.Content.SourceRevision, editId, new UpdateRecipeDto
            {
                ExpectedContentRevision = first.Content.ContentRevision,
                IngredientLines = JsonSerializer.SerializeToElement(new[] { new { clientId = "row", description = "oil",
                    amount = (object?)null, amountText = (string?)null, unit = (object?)null, scaling = "proportional",
                    package = (object?)null, shopping = new { name = "oil", foodId = (string?)null, mappingRevision = (string?)null } } }),
                InstructionSections = JsonSerializer.SerializeToElement(new[] { new { clientId = "section", name = (string?)null,
                    steps = new[] { new { clientId = "step", text = "Stir." } } } })
            });
            saved = await db.CanonicalRecipeOperations.AsNoTracking().Where(x => x.RecipeId == _recipe).ToArrayAsync();
        }
        else
        {
            var fixture = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/canonical-recovery-v1-originals.json"));
            Assert.Equal("a2d3d6c9cf2b81c69cac25ad328ae18c0d7e3d2919545fca0b70e4941463deaa",
                Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(fixture)));
            using var document = JsonDocument.Parse(fixture);
            var observed = document.RootElement;
            Assert.Equal(_recipe, observed.GetProperty("recipeId").GetGuid());
            Assert.Equal("6a0850700507afb8e3be1184cc79ca33bbadb4f9", observed.GetProperty("generatorSource").GetString());
            firstId = observed.GetProperty("firstId").GetGuid();
            editId = observed.GetProperty("editId").GetGuid();
            edit = observed.GetProperty("edit").Deserialize<CanonicalRecipeWriteResult>()!;
            saved = observed.GetProperty("operations").Deserialize<CanonicalRecipeOperation[]>()!;
            foreach (var operation in saved)
            {
                using var request = JsonDocument.Parse(operation.OriginalRequest!);
                Assert.Equal(1, request.RootElement.GetProperty("version").GetInt32());
                Assert.Equal("Original private note", request.RootElement.GetProperty("baseline").GetProperty("notes").GetString());
            }
        }
        Assert.Equal(3, edit.CreatedIds.Count);
        var value = JsonNode.Parse(_files["durable-obligations.json"])!;
        foreach (var id in new[] { firstId, editId })
        {
            var operation = Assert.Single(saved, x => x.OperationId == id);
            Assert.NotNull(operation.OriginalRequest);
            value["canonicalOperations"]!.AsArray().Add(new JsonObject
            {
                ["recipeId"] = _recipe, ["operationId"] = id, ["inputHash"] = operation.InputHash,
                ["result"] = JsonNode.Parse(operation.Result), ["createdAt"] = operation.CreatedAt,
                ["originalRequest"] = operation.OriginalRequest
            });
        }
        // Today's private fields cannot supply or replace historical authority.
        recipe.Notes = "New private note";
        await db.SaveChangesAsync();
        var before = await CountsAsync(db);
        if (currentV2)
        {
            foreach (var operation in saved)
            {
                using var request = JsonDocument.Parse(operation.OriginalRequest!);
                Assert.Equal(2, request.RootElement.GetProperty("version").GetInt32());
            }
            await RefuseAsync(value);
            var diskBefore = DiskHashes();
            await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => scope.ServiceProvider.GetRequiredService<ManagementService>()
                .InspectCurrentRecoveryAsync(_root, _household, Schema, []));
            Assert.Equal(before, await CountsAsync(db));
            Assert.Equal(diskBefore.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
            Assert.Equal("New private note", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe)).Notes);
            return;
        }
        var stage = await StageAsync(value);
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        foreach (var corruption in new[] { "input-hash", "source", "baseline", "missing-input", "kind", "identity", "result", "mapping", "duplicate" })
        {
            var changed = value.DeepClone(); var operation = changed["canonicalOperations"]![1]!;
            var request = JsonNode.Parse(operation["originalRequest"]!.GetValue<string>())!;
            switch (corruption)
            {
                case "input-hash": operation["inputHash"] = new string('0', 64); break;
                case "source": request["expectedSourceRevision"] = "different-source"; break;
                case "baseline": request["baselineHash"] = new string('0', 64); break;
                case "missing-input": request.AsObject().Remove("input"); break;
                case "kind": request["kind"] = "convert"; break;
                case "identity": request["operationId"] = firstId; break;
                case "result": operation["result"]!["content"]!["servings"] = 9; break;
                case "mapping":
                    operation["result"]!["createdIds"]!["step"] = edit.CreatedIds["section"];
                    operation["result"]!["createdIds"]!["section"] = edit.CreatedIds["step"]; break;
            }
            operation["originalRequest"] = corruption == "duplicate"
                ? request.ToJsonString().Insert(1, "\"kind\":\"edit\",") : request.ToJsonString();
            await RefuseAsync(changed); // WriteAsync rehashes the outer archive for each mutation.
        }
        Assert.Equal(before, await CountsAsync(db));
        Assert.Equal("New private note", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipe)).Notes);
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        // The management entrypoint uses the same frozen validator; no DB publication.
        await WriteValueAsync(value);
        var disk = DiskHashes();
        var inspection = await scope.ServiceProvider.GetRequiredService<ManagementService>()
            .InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(inspection.StagedHouseholdState.ReadObligations(), Json)));
        Assert.Equal(before, await CountsAsync(db));
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    private static async Task<int[]> CountsAsync(RecipeDbContext db) => [await db.Recipes.CountAsync(),
        await db.CanonicalRecipeOperations.CountAsync(), await db.WorkflowInstances.CountAsync(), await db.RecipeFilePublications.CountAsync()];

    private async Task WriteValueAsync(JsonNode value)
    {
        _files["durable-obligations.json"] = JsonSerializer.SerializeToUtf8Bytes(value);
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
    }

    private async Task<CurrentRecoveryHouseholdState> StageAsync(JsonNode value)
    {
        await WriteValueAsync(value);
        var disk = DiskHashes(); var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        return stage;
    }

    private async Task RefuseAsync(JsonNode value)
    {
        await WriteValueAsync(value);
        var disk = DiskHashes(); var inventory = await InspectAsync();
        var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }
}
