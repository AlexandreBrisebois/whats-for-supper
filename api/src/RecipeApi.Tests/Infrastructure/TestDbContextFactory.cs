using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;

namespace RecipeApi.Tests.Infrastructure;

/// <summary>
/// Creates isolated in-memory <see cref="RecipeDbContext"/> instances for service-layer unit tests.
/// Each call returns a context backed by a brand-new database so tests never share state.
/// </summary>
public static class TestDbContextFactory
{
    public static RecipeDbContext Create()
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new RecipeDbContext(options);
    }
}
