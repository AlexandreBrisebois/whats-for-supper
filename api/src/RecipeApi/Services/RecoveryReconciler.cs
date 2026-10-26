using RecipeApi.Infrastructure;
namespace RecipeApi.Services;

/// <summary>Retries process-interruption reconciliation; normal operations remain fail-closed until it succeeds.</summary>
public sealed class RecoveryReconciler(IServiceScopeFactory scopes, RecipesRootResolver recipes,
    IConfiguration configuration, ILogger<RecoveryReconciler> logger, DemoModeOptions? demoMode = null) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(configuration["Recovery:BackupRoot"])
            && !(demoMode ?? new DemoModeOptions(configuration)).Enabled
            && !File.Exists(Path.Combine(recipes.BaseRoot, ".demo-coordination"))
            && !File.Exists(Path.Combine(recipes.BaseRoot, ".recovery-journal.json"))) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (File.Exists(Path.Combine(recipes.BaseRoot, ".recovery-journal.json")))
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().ResumeAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex) { logger.LogError(ex, "Recovery reconciliation failed; household operations remain blocked"); }
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
