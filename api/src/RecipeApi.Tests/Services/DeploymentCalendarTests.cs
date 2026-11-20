using System.Text.Json;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DeploymentCalendarTests
{
    [Theory]
    [InlineData(null, "UTC", "2026-10-12", "2026-10-12", "2026-10-13T00:00:00Z")]
    [InlineData("UTC", "UTC", "2026-10-12", "2026-10-12", "2026-10-13T00:00:00Z")]
    [InlineData("America/Toronto", "America/Toronto", "2026-10-11", "2026-10-05", "2026-10-12T04:00:00Z")]
    public async Task ConfiguredCalendar_ProjectsInjectedInstant(string? setting, string zone, string today, string monday, string next)
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync(setting);
        using var client = factory.CreateAuthenticatedClient();
        using var body = JsonDocument.Parse(await client.GetStringAsync("/api/schedule"));
        var data = body.RootElement.GetProperty("data");
        Assert.True(data.TryGetProperty("calendar", out var calendar), "Schedule must expose its authoritative deployment calendar.");
        Assert.Equal(zone, calendar.GetProperty("timeZone").GetString());
        Assert.Equal(today, calendar.GetProperty("today").GetString());
        Assert.Equal(monday, calendar.GetProperty("currentWeekStartDate").GetString());
        Assert.Equal(DateTimeOffset.Parse(next), calendar.GetProperty("nextDayAtUtc").GetDateTimeOffset());
    }

    [Theory]
    [InlineData("Not/AZone")]
    [InlineData("")]
    public async Task InvalidExplicitZone_PreventsStartupWithConfigurationGuidance(string setting)
    {
        var error = await Record.ExceptionAsync(async () =>
        {
            await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync(setting);
        });
        Assert.NotNull(error);
        Assert.Contains("Calendar", error.ToString());
        Assert.Contains("TimeZone", error.ToString());
    }
    [Theory]
    [InlineData("2026-03-08T06:59:59Z", "2026-03-08", "2026-03-09T04:00:00Z")]
    [InlineData("2026-03-08T07:00:00Z", "2026-03-08", "2026-03-09T04:00:00Z")]
    [InlineData("2026-11-01T05:30:00Z", "2026-11-01", "2026-11-02T05:00:00Z")]
    [InlineData("2026-11-01T06:30:00Z", "2026-11-01", "2026-11-02T05:00:00Z")]
    public void DstBoundaries_PreserveCivilDatesAndNextMidnight(string instant, string today, string next)
    {
        var configuration = new Microsoft.Extensions.Configuration.ConfigurationManager { ["Calendar:TimeZone"] = "America/Toronto" };
        var calendar = new RecipeApi.Services.DeploymentCalendar(configuration);
        var context = calendar.Capture(DateTimeOffset.Parse(instant));
        Assert.Equal(DateOnly.Parse(today), context.Today);
        Assert.Equal(DateTimeOffset.Parse(next), context.NextDayAtUtc);
        Assert.Equal(DateOnly.Parse(today).AddDays(1), DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(context.NextDayAtUtc, TimeZoneInfo.FindSystemTimeZoneById("America/Toronto")).DateTime));
    }

    [Theory]
    [InlineData("docker/compose/apps.yml")]
    [InlineData("docker/compose/production.yml")]
    [InlineData("docker/compose/production-overrides.yml")]
    [InlineData("release-template/synology/compose.yaml")]
    public void ShippedComposeTemplates_DefaultCalendarTimeZoneToTorontoWithOverrideSyntax(string relativePath)
    {
        var content = File.ReadAllText(Path.Combine(FindRepoRoot(), relativePath));
        Assert.Contains("Calendar__TimeZone: ${Calendar__TimeZone:-America/Toronto}", content);
    }

    [Fact]
    public void ShippedEnvironmentAndTaskfile_DefaultCalendarTimeZoneToTorontoWhileSmokeAndCodeStayUtc()
    {
        var root = FindRepoRoot();

        Assert.Contains("Calendar__TimeZone=America/Toronto", File.ReadAllText(Path.Combine(root, "docker/.env.example")));
        Assert.Contains("Calendar__TimeZone=UTC", File.ReadAllText(Path.Combine(root, "docker/compose/smoke.env")));

        var taskfile = File.ReadAllText(Path.Combine(root, "Taskfile.yml"));
        Assert.Contains("CALENDAR_TIMEZONE", taskfile);
        Assert.Contains("America/Toronto", taskfile);
        Assert.Contains("Calendar__TimeZone:", taskfile);

        var unconfigured = new RecipeApi.Services.DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager());
        Assert.Equal("UTC", unconfigured.Capture(DateTimeOffset.UtcNow).TimeZone);
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "Taskfile.yml")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("Could not locate repository root containing Taskfile.yml.");
    }

}
