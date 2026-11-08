using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

internal static class TestPublicationStore
{
    internal static RecipeFilePublicationStore Create(RecipeDbContext db, IStorageProvider storage, IClock clock) =>
        new(db, new RecipeRepository(storage), clock,
            new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new ConfigurationManager())));
}
