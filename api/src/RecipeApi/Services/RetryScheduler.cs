namespace RecipeApi.Services;

public class RetryScheduler(WorkflowRetryOptions options)
{
    /// <summary>
    /// Computes the next ScheduledAt for a retried task.
    /// </summary>
    /// <param name="retryCount">
    ///   The NEW retry count (already incremented by the caller before this call).
    ///   Index into RetryScheduleMinutes is retryCount - 1.
    /// </param>
    /// <param name="utcNow">The current UTC time (injected for testability).</param>
    /// <returns>The DateTimeOffset at which the task should next be attempted.</returns>
    public DateTimeOffset ComputeNextScheduledAt(int retryCount, DateTimeOffset utcNow)
    {
        var index = retryCount - 1;

        if (index < options.RetryScheduleMinutes.Length)
        {
            return utcNow + TimeSpan.FromMinutes(options.RetryScheduleMinutes[index]);
        }

        return ComputeQuietWindowStart(utcNow);
    }

    private DateTimeOffset ComputeQuietWindowStart(DateTimeOffset utcNow)
    {
        var todayWindowStart = utcNow.UtcDateTime.Date + TimeSpan.FromHours(options.QuietWindowStartHour);

        DateTimeOffset base_;
        if (utcNow.UtcDateTime < todayWindowStart)
        {
            base_ = new DateTimeOffset(todayWindowStart, TimeSpan.Zero);
        }
        else
        {
            base_ = new DateTimeOffset(todayWindowStart + TimeSpan.FromDays(1), TimeSpan.Zero);
        }

        var windowDurationMinutes = (options.QuietWindowEndHour - options.QuietWindowStartHour) * 60;
        var jitter = TimeSpan.FromMinutes(Random.Shared.Next(0, windowDurationMinutes));

        return base_ + jitter;
    }
}
