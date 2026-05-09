using Microsoft.Extensions.Configuration;

namespace RecipeApi.Services;

public class DemoModeOptions(IConfiguration configuration)
{
    public bool Enabled => string.Equals(configuration["DEMO_MODE"], "true", StringComparison.OrdinalIgnoreCase);

    public string RestoreCronUtc => string.IsNullOrWhiteSpace(configuration["DEMO_RESTORE_CRON_UTC"])
        ? "0 3 * * *"
        : configuration["DEMO_RESTORE_CRON_UTC"]!;
}
