namespace RecipeApi.Services;

public class WorkflowRetryOptions
{
    public int[] RetryScheduleMinutes { get; set; } = [1, 5, 20, 60, 300];
    public int MaxRetries { get; set; } = 10;
    public int QuietWindowStartHour { get; set; } = 1;
    public int QuietWindowEndHour { get; set; } = 5;
}
