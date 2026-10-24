using RecipeApi.Data;

namespace RecipeApi.Services;

/// <summary>Orders normal grocery-map reads, saves and publication attempts on this host.</summary>
public sealed class GroceryCheckCoordinator(IServiceScopeFactory scopes)
{
    private readonly SemaphoreSlim gate = new(1, 1);

    internal async Task<T> RunAsync<T>(Func<RecipeDbContext, Task<T>> operation, CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            return await operation(scope.ServiceProvider.GetRequiredService<RecipeDbContext>());
        }
        finally
        {
            gate.Release();
        }
    }
}
