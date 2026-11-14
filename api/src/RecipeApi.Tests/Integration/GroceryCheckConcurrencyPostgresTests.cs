using System.Data.Common;
using Microsoft.AspNetCore.Builder;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task DistinctItemPatchRequestsRetainBothChecksInFreshScope()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var barrier = new WeeklyPlanReadBarrier();
            var secondEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var requests = 0;
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                {
                    ["Calendar:TimeZone"] = "America/Toronto",
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                }, configureApplication: app => app.Use(async (context, next) =>
                {
                    if (context.Request.Path.Value?.EndsWith("/grocery/item") == true && Interlocked.Increment(ref requests) == 2)
                        secondEntered.TrySetResult();
                    await next(context);
                }), configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(barrier)));
            await SeedRowPlan(factory);

            using var first = factory.CreateAuthenticatedClient();
            using var second = factory.CreateAuthenticatedClient();
            barrier.Enabled = true;
            const string url = "/api/schedule/0/grocery/item";
            var firstRequest = first.PatchAsJsonAsync(url, new { rowId = TomatoRow, weekStartDate = "2026-10-05", expectedRowVersion = "1", @checked = true, clientMutationId = Guid.NewGuid() });
            await barrier.FirstRead.Task.WaitAsync(TimeSpan.FromSeconds(15));
            var secondRequest = second.PatchAsJsonAsync(url, new { rowId = LettuceRow, weekStartDate = "2026-10-05", expectedRowVersion = "1", @checked = true, clientMutationId = Guid.NewGuid() });
            await secondEntered.Task.WaitAsync(TimeSpan.FromSeconds(15));
            barrier.Release.TrySetResult();
            var responses = await Task.WhenAll(firstRequest, secondRequest);
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
            Assert.Equal(2, barrier.Arrivals);
            barrier.Enabled = false;

            using var fresh = factory.Services.CreateScope();
            var persisted = await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(plan => plan.WeekStartDate == Monday);
            output.WriteLine($"Fresh third scope persisted map: {persisted.GroceryState}");
            var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(persisted.GroceryState!)!;
            Assert.True(checks[TomatoRow], "Tomato must survive the other request's save.");
            Assert.True(checks[LettuceRow], "Lettuce must survive the other request's save.");
        });
    }

    private sealed class WeeklyPlanReadBarrier : DbCommandInterceptor
    {
        public readonly TaskCompletionSource FirstRead = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public readonly TaskCompletionSource Release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int arrivals;
        public bool Enabled { get; set; }
        public int Arrivals => Volatile.Read(ref arrivals);

        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command,
            CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            // Count the serialized mutation snapshots; response presentation performs additional read-only queries.
            if (Enabled && eventData.Context?.Database.CurrentTransaction is not null
                && command.CommandText.Contains("FROM weekly_plans") && Interlocked.Increment(ref arrivals) == 1)
            {
                FirstRead.TrySetResult();
                await Release.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
            }
            return result;
        }
    }
}
