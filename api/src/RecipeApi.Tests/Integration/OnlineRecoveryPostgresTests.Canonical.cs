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
        var recipe = new Recipe { Name = "Exact original", Servings = null,
            Ingredients = """["⅓ cup flour"]""", RawMetadata = """{"recipeIngredient":["⅓ cup flour"],"supply":[{"name":"flour","unitText":"cup","quantity":0.33}]}""" };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var store = new CanonicalRecipeContentStore(db, services.GetRequiredService<IClock>(), services.GetRequiredService<SupperProjectionInvalidation>());
        var content = CanonicalRecipeContentStore.InspectContentRevision(recipe);
        var source = CanonicalRecipeContentStore.InspectSourceRevision(recipe);
        var operation = Guid.NewGuid();
        var converted = await store.ConvertAsync(recipe.Id, content, source, operation);
        var snapshot = await services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
        await store.EditAsync(recipe.Id, source, Guid.NewGuid(), new UpdateRecipeDto {
            ExpectedContentRevision = converted.Content.ContentRevision,
            IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>()) });
        await db.CanonicalRecipeOperations.ExecuteDeleteAsync();
        using var client = app.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null)).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.CanonicalRecipeOperations.CountAsync());
        Assert.Equal(JsonSerializer.Serialize(converted), JsonSerializer.Serialize(await store.ConvertAsync(recipe.Id, content, source, operation)));
        var restored = await db.Recipes.SingleAsync(x => x.Id == recipe.Id);
        Assert.Equal(JsonSerializer.Serialize(converted.Content), JsonSerializer.Serialize(CanonicalRecipeContentStore.Read(restored)));
        Assert.Null(restored.Servings);
    }
}
