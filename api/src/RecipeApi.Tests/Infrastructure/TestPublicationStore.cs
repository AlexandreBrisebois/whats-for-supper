using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

internal static class TestPublicationStore
{
    internal static RecipeFilePublicationStore Create(RecipeDbContext db, IStorageProvider storage, IClock clock) =>
        new(db, new RecipeRepository(storage), clock,
            new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new ConfigurationManager())), Vocabulary(db, storage, clock));

    internal static FoodVocabularyStore Vocabulary(RecipeDbContext db, IStorageProvider storage, IClock clock, IServiceProvider? services = null)
    {
        var configuration = services?.GetRequiredService<IConfiguration>() ?? new ConfigurationManager
        { ["DataRoot"] = Path.Combine(Path.GetTempPath(), "wfs-vocabulary-test-" + Guid.NewGuid().ToString("N")) };
        var roots = services?.GetRequiredService<RecipesRootResolver>() ?? new RecipesRootResolver(new DataRootResolver(configuration), configuration);
        return new(db, storage, roots, new RecoveryBoundary(db, configuration, roots), clock);
    }
}
