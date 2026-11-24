using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DemoRecurrenceTests
{
    [Fact]
    public async Task Seeder_reconciles_terminal_failure_after_startup_without_erasing_failure()
    {
        var name = "demo-recurrence-" + Guid.NewGuid().ToString("N");
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DEMO_MODE"] = "true", ["DEMO_RESTORE_CRON_UTC"] = "0 3 * * *", ["Demo:ReconcileSeconds"] = "1"
        }).Build();
        var storage = new InMemoryStorageProvider();
        await storage.SaveAsync("workflows", "demo-restore.yaml", "name: demo-restore\nparameters: []\ntasks:\n  - name: restore\n    processor: RestoreDemoState\n");
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IClock>(new FixedClock());
        services.AddSingleton<IStorageProvider>(storage);
        services.AddSingleton<DemoModeOptions>();
        services.AddSingleton<CronScheduleCalculator>();
        services.AddDbContext<RecipeDbContext>(options => options.UseInMemoryDatabase(name)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddScoped<WorkflowRepository>();
        services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();
        services.AddScoped<DemoWorkflowSeeder>();
        using var provider = services.BuildServiceProvider();
        var hosted = ActivatorUtilities.CreateInstance<DemoWorkflowSeederHostedService>(provider);
        await hosted.StartAsync(CancellationToken.None);
        try
        {
            await WaitForCount(provider, 1);
            Guid original;
            using (var scope = provider.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var instance = await db.WorkflowInstances.SingleAsync();
                original = instance.Id;
                instance.Status = WorkflowStatus.Paused;
                var task = await db.WorkflowTasks.SingleAsync();
                task.Status = RecipeApi.Models.TaskStatus.Failed;
                task.ErrorMessage = "Synthetic reset failure";
                await db.SaveChangesAsync();
            }
            await WaitForCount(provider, 2);
            using var final = provider.CreateScope();
            var facts = final.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal("Synthetic reset failure", (await facts.WorkflowTasks.SingleAsync(t => t.InstanceId == original)).ErrorMessage);
            var next = await facts.WorkflowTasks.SingleAsync(t => t.InstanceId != original);
            Assert.Equal(new DateTimeOffset(2026, 10, 26, 3, 0, 0, TimeSpan.Zero), next.ScheduledAt);
        }
        finally
        {
            await hosted.StopAsync(CancellationToken.None);
            if (hosted is IDisposable disposable) disposable.Dispose();
        }
    }

    private static async Task WaitForCount(IServiceProvider provider, int count)
    {
        for (var attempt = 0; attempt < 80; attempt++)
        {
            using var scope = provider.CreateScope();
            if (await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WorkflowInstances.CountAsync() == count) return;
            await Task.Delay(50);
        }
        using var final = provider.CreateScope();
        Assert.Equal(count, await final.ServiceProvider.GetRequiredService<RecipeDbContext>().WorkflowInstances.CountAsync());
    }

    private sealed class FixedClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 10, 25, 12, 0, 0, TimeSpan.Zero);
    }
}
