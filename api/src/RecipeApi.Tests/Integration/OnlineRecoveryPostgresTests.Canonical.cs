using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task ExactSnapshot_RetainsCanonicalIdentityFactsAndOperationReplay()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Exact original", Servings = null,
            Ingredients = """["⅓ cup flour"]""", RawMetadata = """{"recipeIngredient":["⅓ cup flour"],"supply":[{"name":"flour","unitText":"cup","quantity":0.33}]}""" };
        var (initialContent, _) = StructuredRecipeContentStore.FromSchemaOrg(
            recipe.Id, recipe.RawMetadata, recipe.SourceUrl, authority: null, origin: "unknown",
            explicitServings: recipe.Servings, overrideIngredientTexts: ["⅓ cup flour"]);
        recipe.StructuredContent = JsonSerializer.Serialize(initialContent, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var store = new StructuredRecipeContentStore(db, services.GetRequiredService<IClock>(), services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, services.GetRequiredService<IStorageProvider>(), services.GetRequiredService<IClock>(), services));
        var source = initialContent.SourceRevision;
        var operation = Guid.NewGuid();
        var firstInput = new UpdateRecipeDto { ExpectedContentRevision = initialContent.ContentRevision, Name = "Exact original edited" };
        var edited = await store.EditAsync(recipe.Id, source, operation, firstInput);
        var snapshot = await services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
        await store.EditAsync(recipe.Id, source, Guid.NewGuid(), new UpdateRecipeDto {
            ExpectedContentRevision = edited.Content.ContentRevision,
            IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()) });
        await db.StructuredRecipeOperations.ExecuteDeleteAsync();
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null)).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.StructuredRecipeOperations.CountAsync());
        Assert.Equal(JsonSerializer.Serialize(edited), JsonSerializer.Serialize(await store.EditAsync(recipe.Id, source, operation, firstInput)));
        var restored = await db.Recipes.SingleAsync(x => x.Id == recipe.Id);
        Assert.Equal(JsonSerializer.Serialize(edited.Content), JsonSerializer.Serialize(StructuredRecipeContentStore.Read(restored)));
        Assert.Null(restored.Servings);
    }
}
