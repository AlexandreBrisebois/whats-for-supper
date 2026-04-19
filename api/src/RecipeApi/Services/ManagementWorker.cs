using RecipeApi.Models;

namespace RecipeApi.Services;

public class ManagementWorker(
    ManagementTaskStore taskStore,
    IServiceScopeFactory scopeFactory,
    ILogger<ManagementWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("ManagementWorker is starting.");

        await foreach (var task in taskStore.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                taskStore.UpdateTask(ManagementTaskStatus.Processing);
                logger.LogInformation("Processing management task {Type} ({Id})", task.Type, task.Id);

                using var scope = scopeFactory.CreateScope();
                var managementService = scope.ServiceProvider.GetRequiredService<ManagementService>();

                switch (task.Type)
                {
                    case ManagementTaskType.Backup:
                        await managementService.BackupAsync();
                        taskStore.UpdateTask(ManagementTaskStatus.Completed);
                        break;
                    case ManagementTaskType.Restore:
                        var restoreResult = await managementService.RestoreAsync(stoppingToken);
                        taskStore.UpdateTask(ManagementTaskStatus.Completed, restoreResult);
                        break;
                    case ManagementTaskType.DisasterRecovery:
                        var drResult = await managementService.DisasterRecoveryAsync();
                        taskStore.UpdateTask(ManagementTaskStatus.Completed, drResult);
                        break;
                }

                logger.LogInformation("Successfully completed management task {Type} ({Id})", task.Type, task.Id);
            }
            catch (OperationCanceledException)
            {
                logger.LogWarning("Management task {Type} ({Id}) was canceled.", task.Type, task.Id);
                taskStore.UpdateTask(ManagementTaskStatus.Failed, error: "Task was canceled due to server shutdown.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to execute management task {Type} ({Id})", task.Type, task.Id);
                taskStore.UpdateTask(ManagementTaskStatus.Failed, error: ex.Message);
            }
        }

        logger.LogInformation("ManagementWorker is stopping.");
    }
}
