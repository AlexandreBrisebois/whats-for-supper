using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

public sealed class StubSearchTelemetry : ISearchTelemetry
{
    public List<TelemetryEvent> Events { get; } = [];

    public void Emit(string eventName, Dictionary<string, object?> payload)
    {
        Events.Add(new TelemetryEvent(eventName, payload));
    }
}

public sealed record TelemetryEvent(string Name, Dictionary<string, object?> Payload);
