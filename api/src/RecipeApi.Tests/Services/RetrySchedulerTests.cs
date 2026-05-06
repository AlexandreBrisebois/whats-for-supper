using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RetrySchedulerTests
{
    // Feature: workflow-retry-backoff, Property 1: schedule-index fidelity
    // Validates: Requirements 2.5
    [Property(MaxTest = 500)]
    public Property ScheduleIndexFidelity(PositiveInt[] scheduleRaw, DateTimeOffset utcNow)
    {
        var schedule = scheduleRaw.Select(x => x.Get).ToArray();
        if (schedule.Length == 0) return true.ToProperty();

        var options = new WorkflowRetryOptions { RetryScheduleMinutes = schedule };
        var scheduler = new RetryScheduler(options);

        return Prop.ForAll(
            Gen.Choose(1, schedule.Length).ToArbitrary(),
            retryCount =>
            {
                var result = scheduler.ComputeNextScheduledAt(retryCount, utcNow);
                var expected = utcNow.AddMinutes(schedule[retryCount - 1]);
                return result == expected;
            });
    }

    // Feature: workflow-retry-backoff, Property 2: future-only
    // Validates: Requirements 3.6
    [Property(MaxTest = 500)]
    public Property QuietWindowIsFuture(DateTimeOffset utcNow)
    {
        var options = new WorkflowRetryOptions(); // defaults: schedule length = 5
        var scheduler = new RetryScheduler(options);
        // retryCount > schedule length forces quiet-window path
        var retryCount = options.RetryScheduleMinutes.Length + 1;
        var result = scheduler.ComputeNextScheduledAt(retryCount, utcNow);
        return (result > utcNow).ToProperty();
    }

    // Feature: workflow-retry-backoff, Property 3: window-containment
    // Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.7
    [Property(MaxTest = 500)]
    public Property QuietWindowContainment(DateTimeOffset utcNow)
    {
        var options = new WorkflowRetryOptions(); // start=1, end=5
        var scheduler = new RetryScheduler(options);
        var retryCount = options.RetryScheduleMinutes.Length + 1;
        var result = scheduler.ComputeNextScheduledAt(retryCount, utcNow);
        var hour = result.UtcDateTime.Hour;
        return (hour >= options.QuietWindowStartHour && hour < options.QuietWindowEndHour)
            .ToProperty();
    }

    // Feature: workflow-retry-backoff, Property 4: monotonicity
    // Validates: Requirements 4.1
    [Property(MaxTest = 500)]
    public Property MonotonicScheduleProducesMonotonicDelays(DateTimeOffset utcNow)
    {
        return Prop.ForAll(
            NonDecreasingScheduleArb(minLength: 2),
            schedule =>
            {
                var options = new WorkflowRetryOptions { RetryScheduleMinutes = schedule };
                var scheduler = new RetryScheduler(options);
                return Prop.ForAll(
                    IndexPairArb(schedule.Length),
                    pair =>
                    {
                        var (n, m) = pair; // n < m, both in [1..length]
                        var delayN = scheduler.ComputeNextScheduledAt(n, utcNow);
                        var delayM = scheduler.ComputeNextScheduledAt(m, utcNow);
                        return delayN <= delayM;
                    });
            });
    }

    private static Arbitrary<int[]> NonDecreasingScheduleArb(int minLength)
    {
        var gen =
            from length in Gen.Choose(minLength, 10)
            from first in Gen.Choose(1, 60)
            from increments in Gen.Choose(0, 30).ListOf(length - 1)
            select increments
                .Aggregate(
                    new List<int> { first },
                    (acc, inc) => { acc.Add(acc[^1] + inc); return acc; })
                .ToArray();
        return gen.ToArbitrary();
    }

    private static Arbitrary<(int N, int M)> IndexPairArb(int scheduleLength)
    {
        var gen =
            from n in Gen.Choose(1, scheduleLength - 1)
            from m in Gen.Choose(n + 1, scheduleLength)
            select (n, m);
        return gen.ToArbitrary();
    }

    // ── Example-based [Fact] tests ────────────────────────────────────────────

    private static readonly DateTimeOffset BaseTime =
        new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);

    private static RetryScheduler DefaultScheduler() =>
        new RetryScheduler(new WorkflowRetryOptions());

    // Validates: Requirements 2.1
    [Fact]
    public void DefaultSchedule_RetryCount1_Returns1MinuteDelay()
    {
        var result = DefaultScheduler().ComputeNextScheduledAt(1, BaseTime);
        Assert.Equal(BaseTime.AddMinutes(1), result);
    }

    // Validates: Requirements 2.1
    [Fact]
    public void DefaultSchedule_RetryCount2_Returns5MinuteDelay()
    {
        var result = DefaultScheduler().ComputeNextScheduledAt(2, BaseTime);
        Assert.Equal(BaseTime.AddMinutes(5), result);
    }

    // Validates: Requirements 2.1
    [Fact]
    public void DefaultSchedule_RetryCount3_Returns20MinuteDelay()
    {
        var result = DefaultScheduler().ComputeNextScheduledAt(3, BaseTime);
        Assert.Equal(BaseTime.AddMinutes(20), result);
    }

    // Validates: Requirements 2.1
    [Fact]
    public void DefaultSchedule_RetryCount4_Returns60MinuteDelay()
    {
        var result = DefaultScheduler().ComputeNextScheduledAt(4, BaseTime);
        Assert.Equal(BaseTime.AddMinutes(60), result);
    }

    // Validates: Requirements 2.1
    [Fact]
    public void DefaultSchedule_RetryCount5_Returns300MinuteDelay()
    {
        var result = DefaultScheduler().ComputeNextScheduledAt(5, BaseTime);
        Assert.Equal(BaseTime.AddMinutes(300), result);
    }

    // Validates: Requirements 2.2
    [Fact]
    public void RetryCountBeyondScheduleLength_FallsThroughToQuietWindow()
    {
        var options = new WorkflowRetryOptions();
        var scheduler = new RetryScheduler(options);
        var retryCount = options.RetryScheduleMinutes.Length + 1;

        var result = scheduler.ComputeNextScheduledAt(retryCount, BaseTime);

        // Must NOT equal any schedule-based offset
        foreach (var minutes in options.RetryScheduleMinutes)
        {
            Assert.NotEqual(BaseTime.AddMinutes(minutes), result);
        }

        // Must be in the quiet-window hour range
        var hour = result.UtcDateTime.Hour;
        Assert.InRange(hour, options.QuietWindowStartHour, options.QuietWindowEndHour - 1);
    }

    // Validates: Requirements 3.3
    [Fact]
    public void QuietWindow_UtcNowBeforeWindow_SchedulesTodaysWindow()
    {
        // 00:30 UTC — before the 01:00 window start
        var utcNow = new DateTimeOffset(2024, 1, 15, 0, 30, 0, TimeSpan.Zero);
        var options = new WorkflowRetryOptions();
        var scheduler = new RetryScheduler(options);
        var retryCount = options.RetryScheduleMinutes.Length + 1;

        var result = scheduler.ComputeNextScheduledAt(retryCount, utcNow);

        Assert.Equal(new DateOnly(2024, 1, 15), DateOnly.FromDateTime(result.UtcDateTime));
        var hour = result.UtcDateTime.Hour;
        Assert.InRange(hour, options.QuietWindowStartHour, options.QuietWindowEndHour - 1);
    }

    // Validates: Requirements 3.4
    [Fact]
    public void QuietWindow_UtcNowInsideWindow_SchedulesTomorrowsWindow()
    {
        // 02:00 UTC — inside the 01:00–05:00 window
        var utcNow = new DateTimeOffset(2024, 1, 15, 2, 0, 0, TimeSpan.Zero);
        var options = new WorkflowRetryOptions();
        var scheduler = new RetryScheduler(options);
        var retryCount = options.RetryScheduleMinutes.Length + 1;

        var result = scheduler.ComputeNextScheduledAt(retryCount, utcNow);

        Assert.Equal(new DateOnly(2024, 1, 16), DateOnly.FromDateTime(result.UtcDateTime));
        var hour = result.UtcDateTime.Hour;
        Assert.InRange(hour, options.QuietWindowStartHour, options.QuietWindowEndHour - 1);
    }

    // Validates: Requirements 3.5
    [Fact]
    public void QuietWindow_UtcNowAfterWindow_SchedulesTomorrowsWindow()
    {
        // 10:00 UTC — after the 05:00 window end
        var utcNow = new DateTimeOffset(2024, 1, 15, 10, 0, 0, TimeSpan.Zero);
        var options = new WorkflowRetryOptions();
        var scheduler = new RetryScheduler(options);
        var retryCount = options.RetryScheduleMinutes.Length + 1;

        var result = scheduler.ComputeNextScheduledAt(retryCount, utcNow);

        Assert.Equal(new DateOnly(2024, 1, 16), DateOnly.FromDateTime(result.UtcDateTime));
        var hour = result.UtcDateTime.Hour;
        Assert.InRange(hour, options.QuietWindowStartHour, options.QuietWindowEndHour - 1);
    }

    // Validates: Requirements 1.3, 1.4
    [Fact]
    public void DefaultWorkflowRetryOptions_HaveExpectedValues()
    {
        var options = new WorkflowRetryOptions();

        Assert.Equal([1, 5, 20, 60, 300], options.RetryScheduleMinutes);
        Assert.Equal(10, options.MaxRetries);
        Assert.Equal(1, options.QuietWindowStartHour);
        Assert.Equal(5, options.QuietWindowEndHour);
    }
}
