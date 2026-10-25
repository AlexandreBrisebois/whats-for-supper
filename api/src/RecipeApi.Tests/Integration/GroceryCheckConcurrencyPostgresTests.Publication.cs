using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [PostgresTheory]
    [InlineData(true, false)]
    [InlineData(true, true)]
    [InlineData(false, false)]
    [InlineData(false, true)]
    public async Task RecomputeAndItemPublicationStayOrderedAcrossSuccessfulAndFailingAttempts(bool recomputeFirst, bool failFirst)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var attempts = new List<Dictionary<string, bool>>();
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()))
                .Returns(async (int offset, Dictionary<string, bool> map, DateOnly week, string? exclude) =>
                {
                    int position;
                    lock (attempts) { attempts.Add(new(map)); position = attempts.Count; }
                    if (position == 1)
                    {
                        entered.TrySetResult();
                        await release.Task.WaitAsync(TimeSpan.FromSeconds(15));
                        if (failFirst) throw new IOException("Earlier notification failed after commit");
                    }
                    else Assert.True(release.Task.IsCompleted, "A later publisher must not run while the first is held.");
                });
            await using var factory = await Factory(settings.ConnectionString, services => services.AddSingleton(publisher.Object));
            await SeedPlan(factory, "{\"Tomato\":true,\"unrelated\":true}");
            using (var seed = factory.Services.CreateScope())
            {
                var db = seed.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var plan = await db.WeeklyPlans.SingleAsync(p => p.WeekStartDate == Monday);
                plan.GroceryItems = JsonSerializer.Serialize(new List<GroceryLineItemDto> { new("Tomato", "tomato", "Produce", 1, null, []) });
                var recipe = new Recipe { Name = "Tomato", RawMetadata = """{"supply":[{"name":"Tomato","quantity":1}]}""" };
                db.Recipes.Add(recipe);
                db.CalendarEvents.Add(new CalendarEvent { Date = Monday, RecipeId = recipe.Id });
                await db.SaveChangesAsync();
            }
            using var a = factory.Services.CreateScope();
            using var b = factory.Services.CreateScope();
            Task earlier = recomputeFirst
                ? a.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, CancellationToken.None)
                : a.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "Tomato", true);
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
            // This third context proves commit preceded the blocked publication attempt.
            var committed = await ReadChecks(factory);
            Assert.Equal(attempts[0].OrderBy(p => p.Key), committed.OrderBy(p => p.Key));
            Task later = recomputeFirst
                ? b.ServiceProvider.GetRequiredService<ScheduleService>().ToggleGroceryItemAsync(0, "Lettuce", true)
                : b.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, CancellationToken.None);
            Assert.False(later.IsCompleted);
            Assert.Single(attempts);
            release.TrySetResult();
            if (failFirst) await Assert.ThrowsAsync<IOException>(() => earlier);
            else await earlier;
            await later.WaitAsync(TimeSpan.FromSeconds(15));
            Assert.Equal(2, attempts.Count);
            var final = await ReadChecks(factory);
            Assert.True(final["tomato"]);
            Assert.True(final["unrelated"]);
            Assert.DoesNotContain("Tomato", final.Keys);
            if (recomputeFirst) Assert.True(final["Lettuce"]);
            Assert.Equal(final.OrderBy(p => p.Key), attempts[1].OrderBy(p => p.Key));
            output.WriteLine($"recomputeFirst={recomputeFirst}, failFirst={failFirst}, ordered attempts={JsonSerializer.Serialize(attempts)}");
        });
    }
}
