using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using System.Runtime.CompilerServices;
using RecipeApi.Data;
using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

/// <summary>Fresh contexts for tests that construct services directly rather than through the host.</summary>
internal static class TestGroceryChecks
{
    private static readonly ConditionalWeakTable<RecipeDbContext, GroceryCheckCoordinator> Coordinators = new();

    public static GroceryCheckCoordinator Create(RecipeDbContext db) =>
        Coordinators.GetValue(db, context => new(new ScopeFactory((DbContextOptions<RecipeDbContext>)context.GetService<IDbContextOptions>())));

    private sealed class ScopeFactory(DbContextOptions<RecipeDbContext> options) : IServiceScopeFactory
    {
        public IServiceScope CreateScope() => new Scope(options);
    }

    private sealed class Scope(DbContextOptions<RecipeDbContext> options) : IServiceScope, IServiceProvider, IAsyncDisposable
    {
        private readonly RecipeDbContext db = new(options);
        public IServiceProvider ServiceProvider => this;
        public object? GetService(Type type) => type == typeof(RecipeDbContext) ? db : null;
        public void Dispose() => db.Dispose();
        public ValueTask DisposeAsync() => db.DisposeAsync();
    }
}
