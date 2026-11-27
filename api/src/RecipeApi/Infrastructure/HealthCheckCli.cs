namespace RecipeApi.Infrastructure;

/// <summary>
/// Lightweight CLI health probe for chiseled container images (no curl/wget/shell required).
/// Invoked via <c>dotnet RecipeApi.dll --healthcheck</c>; does not start the web host or open DB connections.
/// </summary>
public static class HealthCheckCli
{
    public const int DefaultPort = 9001;
    public const string HealthPath = "/api/health";
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(4);

    public static async Task<int> RunAsync(
        string[] args,
        HttpMessageHandler? handler = null,
        Func<string, string?>? getEnvironmentVariable = null,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var probeUri = ResolveProbeUri(args, getEnvironmentVariable);
            var effectiveTimeout = timeout ?? DefaultTimeout;
            var ownsHandler = handler is null;
            var effectiveHandler = handler ?? new SocketsHttpHandler
            {
                UseProxy = false,
                ConnectTimeout = effectiveTimeout
            };

            try
            {
                using var client = new HttpClient(effectiveHandler, disposeHandler: false)
                {
                    Timeout = effectiveTimeout
                };
                using var response = await client.GetAsync(
                    probeUri,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken);

                return response.IsSuccessStatusCode ? 0 : 1;
            }
            finally
            {
                if (ownsHandler)
                {
                    effectiveHandler.Dispose();
                }
            }
        }
        catch
        {
            return 1;
        }
    }

    public static Uri ResolveProbeUri(
        string[] args,
        Func<string, string?>? getEnvironmentVariable = null)
    {
        ArgumentNullException.ThrowIfNull(args);

        if (TryReadUrlArgument(args, out var rawUrl))
        {
            if (string.IsNullOrWhiteSpace(rawUrl)
                || !Uri.TryCreate(rawUrl.Trim(), UriKind.Absolute, out var explicitUri)
                || (explicitUri.Scheme != Uri.UriSchemeHttp && explicitUri.Scheme != Uri.UriSchemeHttps))
            {
                throw new ArgumentException("Invalid --url value for healthcheck.");
            }

            if (explicitUri.AbsolutePath == "/" && string.IsNullOrEmpty(explicitUri.Query))
            {
                return new Uri(explicitUri, HealthPath);
            }

            return explicitUri;
        }

        var port = ResolvePortFromAspNetCoreUrls(
            (getEnvironmentVariable ?? Environment.GetEnvironmentVariable)("ASPNETCORE_URLS"))
            ?? DefaultPort;

        return new Uri($"http://127.0.0.1:{port}{HealthPath}");
    }

    private static bool TryReadUrlArgument(string[] args, out string? value)
    {
        for (var i = 0; i < args.Length; i++)
        {
            var current = args[i];
            if (string.Equals(current, "--url", StringComparison.Ordinal))
            {
                value = i + 1 < args.Length ? args[i + 1] : null;
                return true;
            }

            if (current.StartsWith("--url=", StringComparison.Ordinal))
            {
                value = current["--url=".Length..];
                return true;
            }
        }

        value = null;
        return false;
    }

    private static int? ResolvePortFromAspNetCoreUrls(string? aspNetCoreUrls)
    {
        if (string.IsNullOrWhiteSpace(aspNetCoreUrls))
        {
            return null;
        }

        var candidates = aspNetCoreUrls.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var candidate in candidates)
        {
            var normalized = NormalizeWildcardHost(candidate);
            if (Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                && uri.Port is > 0 and <= 65535)
            {
                return uri.Port;
            }
        }

        return null;
    }

    private static string NormalizeWildcardHost(string candidate)
    {
        if (candidate.StartsWith("http://+:", StringComparison.OrdinalIgnoreCase)
            || candidate.StartsWith("http://*:", StringComparison.OrdinalIgnoreCase))
        {
            return "http://127.0.0.1:" + candidate["http://+:".Length..];
        }

        if (candidate.StartsWith("https://+:", StringComparison.OrdinalIgnoreCase)
            || candidate.StartsWith("https://*:", StringComparison.OrdinalIgnoreCase))
        {
            return "https://127.0.0.1:" + candidate["https://+:".Length..];
        }

        return candidate;
    }
}
