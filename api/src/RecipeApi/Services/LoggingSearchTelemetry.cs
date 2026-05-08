namespace RecipeApi.Services;

public sealed class LoggingSearchTelemetry(ILogger<LoggingSearchTelemetry> logger) : ISearchTelemetry
{
    public void Emit(string eventName, Dictionary<string, object?> payload)
    {
        logger.LogInformation("{EventName} {@Payload}", eventName, payload);
    }
}
