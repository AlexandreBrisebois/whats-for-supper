using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CancellationWhileWaitingDoesNotReleaseAnotherOperationsGate()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var count = 0;
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()))
                .Returns(async () =>
                {
                    if (Interlocked.Increment(ref count) == 1) { entered.TrySetResult(); await release.Task.WaitAsync(TimeSpan.FromSeconds(15)); }
                });
            await using var factory = await Factory(settings.ConnectionString, services => services.AddSingleton(publisher.Object));
            await SeedPlan(factory);
            using var a = factory.Services.CreateScope();
            using var b = factory.Services.CreateScope();
            var first = a.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "Tomato", true);
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
            using var cts = new CancellationTokenSource();
            var waiting = b.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "Canceled", true, ct: cts.Token);
            cts.Cancel();
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => waiting);
            Assert.Equal(1, count);
            Assert.DoesNotContain("Canceled", (await ReadChecks(factory)).Keys);
            release.TrySetResult();
            await first;
            await b.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "Lettuce", true).WaitAsync(TimeSpan.FromSeconds(15));
            Assert.True((await ReadChecks(factory))["Tomato"]);
            Assert.True((await ReadChecks(factory))["Lettuce"]);
            Assert.Equal(2, count);
        });
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailureOrCancellationAfterAcquisitionBeforeSaveDoesNotAcknowledgeOrBlock(bool cancel)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            using var cts = new CancellationTokenSource();
            var failure = new BeforeSaveFailure(cts, cancel);
            var publisher = new Mock<IScheduleEventPublisher>();
            await using var factory = await Factory(settings.ConnectionString, services =>
            {
                services.AddSingleton(publisher.Object);
                services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(failure));
            });
            await SeedPlan(factory);
            failure.Enabled = true;
            using var scope = factory.Services.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<ScheduleService>();
            var request = service.ToggleGroceryItemAsync(0, "NotSaved", true, ct: cts.Token);
            if (cancel) await Assert.ThrowsAnyAsync<OperationCanceledException>(() => request);
            else await Assert.ThrowsAsync<IOException>(() => request);
            Assert.DoesNotContain("NotSaved", (await ReadChecks(factory)).Keys);
            publisher.Verify(p => p.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()), Times.Never);
            failure.Enabled = false;
            await service.ToggleGroceryItemAsync(0, "Saved", true).WaitAsync(TimeSpan.FromSeconds(15));
            Assert.True((await ReadChecks(factory))["Saved"]);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CommittedCheckSurvivesPublicationResponseLossAndHostRestart()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()))
                .ThrowsAsync(new IOException("Simulated response/publication loss after commit"));
            using var shutdown = new CancellationTokenSource();
            var interruptedSave = new BeforeSaveFailure(shutdown, true);
            await using (var firstHost = await Factory(settings.ConnectionString, services =>
            {
                services.AddSingleton(publisher.Object);
                services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(interruptedSave));
            }))
            {
                await SeedPlan(firstHost);
                using var scope = firstHost.Services.CreateScope();
                interruptedSave.Enabled = true;
                await Assert.ThrowsAnyAsync<OperationCanceledException>(() => scope.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "NotSaved", true, ct: shutdown.Token));
                interruptedSave.Enabled = false;
                await Assert.ThrowsAsync<IOException>(() => scope.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "Committed", true));
                Assert.True((await ReadChecks(firstHost))["Committed"]);
            }
            // Recreate the host/gate against the same relational database, without replay.
            await using var restarted = await Factory(settings.ConnectionString);
            Assert.True((await ReadChecks(restarted))["Committed"]);
            using var fresh = restarted.Services.CreateScope();
            await fresh.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "AfterRestart", true).WaitAsync(TimeSpan.FromSeconds(15));
            var state = await ReadChecks(restarted);
            Assert.True(state["Committed"]);
            Assert.True(state["AfterRestart"]);
            Assert.DoesNotContain("NotSaved", state.Keys);
            output.WriteLine($"Host restart recovery without replay: {JsonSerializer.Serialize(state)}");
        });
    }

    private sealed class BeforeSaveFailure(CancellationTokenSource cancellation, bool cancel) : SaveChangesInterceptor
    {
        public bool Enabled { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (Enabled)
            {
                if (!cancel) throw new IOException("Controlled failure before database save");
                cancellation.Cancel();
                cancellationToken.ThrowIfCancellationRequested();
            }
            return ValueTask.FromResult(result);
        }
    }
}
