namespace RecipeApi.Telemetry;

public sealed record WfsTelemetryConfiguration(Uri Base, string Token, string Version)
{
    public override string ToString() => "WFS telemetry configuration";

    public static WfsTelemetryConfiguration? Read(IConfiguration configuration)
    {
        if (configuration["WFS_TELEMETRY_ENABLED"] != "true") return null;
        var token = configuration["SENTRAME_SERVER_TOKEN"]?.Trim();
        if (string.IsNullOrEmpty(token) || token.Any(c => c < '!' || c > '~' || c is ',' or '%')) return null;
        if (!Uri.TryCreate(configuration["SENTRAME_OTLP_BASE"], UriKind.Absolute, out var origin)
            || (origin.Scheme != "https" && !(origin.Scheme == "http" && origin.IsLoopback))
            || origin.UserInfo.Length != 0 || origin.AbsolutePath != "/" || origin.Query.Length != 0 || origin.Fragment.Length != 0)
            return null;
        return new(origin, token, configuration["WFS_VERSION"]?.Trim() is { Length: > 0 } version ? version : "unknown");
    }

    // Refuse a broad diagnostic pipeline aimed at the selected private receiver.
    // This does not retarget or rewrite an unrelated operational destination.
    public static void ValidateOperationalDestinations(IConfiguration configuration)
    {
        if (!Uri.TryCreate(configuration["SENTRAME_OTLP_BASE"], UriKind.Absolute, out var receiver)) return;
        if (OperationalDestinations(configuration).Any(endpoint => SameOrigin(endpoint, receiver)))
            throw new InvalidOperationException("Broad operational telemetry cannot target the selected Sentrame receiver.");
    }

    public static IReadOnlyList<Uri> OperationalDestinations(IConfiguration configuration)
    {
        var endpoints = new List<string?> { configuration["OpenTelemetry:Endpoint"] ?? "http://localhost:4317" };
        foreach (var entry in configuration.AsEnumerable())
        {
            if (!entry.Key.StartsWith("Serilog:", StringComparison.OrdinalIgnoreCase)) continue;
            var name = entry.Key.Split(':').Last();
            if (name.Equals("Endpoint", StringComparison.OrdinalIgnoreCase) || name.Equals("LogsEndpoint", StringComparison.OrdinalIgnoreCase)
                || name.Equals("TracesEndpoint", StringComparison.OrdinalIgnoreCase)) endpoints.Add(entry.Value);
        }
        // These are the environment overrides consumed by the legacy Serilog sink.
        endpoints.Add(Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT"));
        endpoints.Add(Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"));
        endpoints.Add(Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"));
        return endpoints.Select(value => Uri.TryCreate(value, UriKind.Absolute, out var endpoint) ? endpoint : null)
            .OfType<Uri>().ToArray();
    }

    public static bool SameOrigin(Uri left, Uri right) =>
        left.Scheme == right.Scheme && left.Port == right.Port
        && (left.IdnHost.Equals(right.IdnHost, StringComparison.OrdinalIgnoreCase) || (left.IsLoopback && right.IsLoopback));
}
