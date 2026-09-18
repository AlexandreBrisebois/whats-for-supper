using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace RecipeApi.Services;

public sealed class LoggingSearchTelemetry(ILogger<LoggingSearchTelemetry> logger) : ISearchTelemetry
{
    public void Emit(string eventName, Dictionary<string, object?> payload)
    {
        if (eventName == SearchTelemetryEvents.SearchCompleted)
        {
            var tags = new TagList
            {
                { "search.result_path", payload.GetValueOrDefault("servingPath")?.ToString() },
                { "search.latency_population", payload.GetValueOrDefault("latencyPopulation")?.ToString() },
                { "search.configuration_version", payload.GetValueOrDefault("configurationVersion")?.ToString() }
            };
            RecordDuration(SearchTelemetryMetrics.ResponseDurationMilliseconds, payload, "durationMs", tags);
            RecordDuration(SearchTelemetryMetrics.LexicalDurationMilliseconds, payload, "lexicalDurationMs", tags);
            RecordDuration(SearchTelemetryMetrics.SemanticAttemptDurationMilliseconds, payload, "semanticAttemptDurationMs", tags);
            RecordDuration(SearchTelemetryMetrics.RerankingDurationMilliseconds, payload, "rerankingDurationMs", tags);
        }
        else if (eventName == SearchTelemetryEvents.SearchFallbackServed)
        {
            SearchTelemetryMetrics.FallbackCount.Add(1, new TagList
            {
                { "search.failure_class", payload.GetValueOrDefault("failureClass")?.ToString() },
                { "search.configuration_version", payload.GetValueOrDefault("configurationVersion")?.ToString() }
            });
        }

        logger.LogInformation("{EventName} {@Payload}", eventName, payload);
    }

    private static void RecordDuration(Histogram<double> histogram, Dictionary<string, object?> payload, string key, TagList tags)
    {
        if (payload.GetValueOrDefault(key) is long duration)
        {
            histogram.Record(duration, tags);
        }
    }
}
