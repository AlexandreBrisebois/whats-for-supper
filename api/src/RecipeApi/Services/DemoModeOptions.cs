using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RecipeApi.Services;

public class DemoModeOptions
{
    public bool Enabled { get; }
    public string? RawValue { get; }
    public bool IsRawValueValid { get; }

    public string RestoreCronUtc { get; }

    public DemoModeOptions(IConfiguration configuration, ILogger<DemoModeOptions>? logger = null)
    {
        RawValue = configuration["DEMO_MODE"];
        if (string.IsNullOrWhiteSpace(RawValue))
        {
            Enabled = false;
            IsRawValueValid = true;
        }
        else if (bool.TryParse(RawValue, out var parsed))
        {
            Enabled = parsed;
            IsRawValueValid = true;
        }
        else
        {
            Enabled = false;
            IsRawValueValid = false;
            logger?.LogWarning("Invalid DEMO_MODE value '{DemoModeRawValue}'. Expected 'true' or 'false'. Defaulting to false.", RawValue);
        }

        RestoreCronUtc = string.IsNullOrWhiteSpace(configuration["DEMO_RESTORE_CRON_UTC"])
            ? "0 3 * * *"
            : configuration["DEMO_RESTORE_CRON_UTC"]!;
    }
}
