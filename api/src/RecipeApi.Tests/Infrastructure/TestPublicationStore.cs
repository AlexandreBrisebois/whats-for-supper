using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

internal static class TestPublicationStore
{
    internal static FoodVocabularyStore Vocabulary(RecipeDbContext db, IStorageProvider storage, IClock clock, string? recipesRoot = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(recipesRoot is null ? [] : new Dictionary<string, string?> { ["RECIPES_ROOT"] = recipesRoot })
            .Build();
        var data = new DataRootResolver(config);
        var recipes = new RecipesRootResolver(data, config);
        return new(db, storage, recipes, new RecoveryBoundary(db, config, recipes), clock);
    }

    internal static FoodVocabularyStore Vocabulary(RecipeDbContext db, IStorageProvider storage, IClock clock, IServiceProvider services) =>
        services.GetRequiredService<FoodVocabularyStore>();
}
