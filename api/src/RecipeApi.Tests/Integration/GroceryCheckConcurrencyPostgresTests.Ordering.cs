using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HeldPublicationOrdersConflictingRepeatedReplacementAndClearRequests()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var publisher = new Mock<IScheduleEventPublisher>();
            TaskCompletionSource entered = null!, release = null!;
            var attempts = new List<Dictionary<string, bool>>();
            var hold = false;
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()))
                .Returns(async (int offset, Dictionary<string, bool> map, DateOnly week, string? exclude) =>
                {
                    lock (attempts) attempts.Add(new(map));
                    if (hold) { hold = false; entered.TrySetResult(); await release.Task.WaitAsync(TimeSpan.FromSeconds(15)); }
                });
            await using var factory = await Factory(settings.ConnectionString, services => services.AddSingleton(publisher.Object));
            await SeedPlan(factory);
            // Each pair begins with A committed but held in publication; B overlaps A.
            foreach (var scenario in new[] { "false-last", "repeat-true", "replace-last", "clear-last", "check-after-clear" })
            {
                using var a = factory.Services.CreateScope();
                using var b = factory.Services.CreateScope();
                var first = a.ServiceProvider.GetRequiredService<ScheduleService>();
                var second = b.ServiceProvider.GetRequiredService<ScheduleService>();
                await first.UpdateGroceryStateAsync(0, new() { ["unrelated"] = true });
                attempts.Clear();
                entered = new(TaskCreationOptions.RunContinuationsAsynchronously);
                release = new(TaskCreationOptions.RunContinuationsAsynchronously);
                hold = true;
                var earlier = scenario == "check-after-clear" ? first.UpdateGroceryStateAsync(0, []) : first.ToggleGroceryItemAsync(0, "Tomato", true);
                await entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
                var committed = await ReadChecks(factory);
                Assert.Equal(scenario != "check-after-clear", committed.GetValueOrDefault("Tomato"));
                Task later = scenario switch
                {
                    "false-last" => second.ToggleGroceryItemAsync(0, "Tomato", false),
                    "repeat-true" => second.ToggleGroceryItemAsync(0, "Tomato", true),
                    "replace-last" => second.UpdateGroceryStateAsync(0, new() { ["Lettuce"] = false }),
                    "clear-last" => second.UpdateGroceryStateAsync(0, []),
                    _ => second.ToggleGroceryItemAsync(0, "Lettuce", true),
                };
                Assert.False(later.IsCompleted);
                Assert.Single(attempts);
                release.TrySetResult();
                await Task.WhenAll(earlier, later).WaitAsync(TimeSpan.FromSeconds(15));
                var expected = scenario switch
                {
                    "false-last" => new Dictionary<string, bool> { ["unrelated"] = true, ["Tomato"] = false },
                    "repeat-true" => new() { ["unrelated"] = true, ["Tomato"] = true },
                    "replace-last" => new() { ["Lettuce"] = false },
                    "clear-last" => new(),
                    _ => new() { ["Lettuce"] = true },
                };
                Assert.Equal(expected.OrderBy(p => p.Key), (await ReadChecks(factory)).OrderBy(p => p.Key));
                Assert.Equal(2, attempts.Count);
                Assert.Equal(expected.OrderBy(p => p.Key), attempts[1].OrderBy(p => p.Key));
                output.WriteLine($"{scenario}: {JsonSerializer.Serialize(attempts)}");
            }
        });
    }
}
