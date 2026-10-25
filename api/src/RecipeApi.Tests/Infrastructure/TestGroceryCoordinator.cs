using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

internal static class TestGroceryCoordinator
{
    private static readonly ConditionalWeakTable<DbContextOptions<RecipeDbContext>, GroceryCheckCoordinator> Coordinators = new();

    // Direct service tests keep their database/options while operations get fresh contexts.
    internal static GroceryCheckCoordinator Create(RecipeDbContext db)
    {
        var options = (DbContextOptions<RecipeDbContext>)db.GetService<IDbContextOptions>();
        return Coordinators.GetValue(options, configured =>
        {
            var services = new ServiceCollection();
            services.AddScoped(_ => new RecipeDbContext(configured));
            return new GroceryCheckCoordinator(services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>());
        });
    }
}
