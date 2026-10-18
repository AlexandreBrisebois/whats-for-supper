namespace RecipeApi.Services;

/// <summary>Optional observer for deterministic interruption/concurrency qualification; production has none.</summary>
public interface IRecoveryCheckpoint
{
    Task ReachedAsync(string name, CancellationToken ct);
}
