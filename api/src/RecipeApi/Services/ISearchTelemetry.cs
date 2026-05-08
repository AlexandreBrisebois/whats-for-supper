namespace RecipeApi.Services;

public interface ISearchTelemetry
{
    void Emit(string eventName, Dictionary<string, object?> payload);
}

public static class SearchTelemetryEvents
{
    public const string SearchRequested = "recipe_search_requested";
    public const string SearchCompleted = "recipe_search_completed";
    public const string SearchFallbackServed = "recipe_search_fallback_served";
    public const string SearchEmptyResults = "recipe_search_empty_results";
    public const string IndexJobStarted = "recipe_index_job_started";
    public const string IndexJobCompleted = "recipe_index_job_completed";
    public const string IndexJobFailed = "recipe_index_job_failed";
    public const string IndexJobStale = "recipe_index_job_stale";
    public const string IndexRestoreRehydrated = "recipe_index_restore_rehydrated";
    public const string IndexRestoreMarkedPending = "recipe_index_restore_marked_pending";

    public const int UnhealthyIndexAgeMinutes = 10;
}
