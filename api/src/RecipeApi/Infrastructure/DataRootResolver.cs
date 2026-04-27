namespace RecipeApi.Infrastructure;

/// <summary>
/// Single source of truth for resolving the root data directory.
/// Priority: DATA_ROOT env var → appsettings DataRoot → /data (default).
/// Register as a singleton so resolution happens once per process lifetime.
/// </summary>
public sealed class DataRootResolver(IConfiguration configuration)
{
    public string Root =>
        Environment.GetEnvironmentVariable("DATA_ROOT")
        ?? configuration["DataRoot"]
        ?? "/data";
}
