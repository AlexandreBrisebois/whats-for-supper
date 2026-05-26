using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;

using RecipeApi.Infrastructure;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/health")]
[SkipWrapping]
[Microsoft.AspNetCore.Authorization.AllowAnonymous]
public class HealthController(
    RecipeDbContext db,
    DemoModeOptions demoMode,
    CronScheduleCalculator scheduleCalculator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var checks = new Dictionary<string, object>();
        var overallHealthy = true;

        // DB connectivity
        try
        {
            var canConnect = await db.Database.CanConnectAsync();
            checks["database"] = new { status = canConnect ? "healthy" : "unhealthy" };
            if (!canConnect) overallHealthy = false;
        }
        catch (Exception ex)
        {
            checks["database"] = new { status = "unhealthy", error = ex.Message };
            overallHealthy = false;
        }

        // Schema check — verify core tables exist
        try
        {
            await db.FamilyMembers.AnyAsync();
            await db.Recipes.AnyAsync();
            checks["schema"] = new { status = "healthy" };
        }
        catch (Exception ex)
        {
            checks["schema"] = new { status = "unhealthy", error = ex.Message };
            overallHealthy = false;
        }

        var response = new HealthCheckResponseDto
        {
            Status = overallHealthy ? "healthy" : "unhealthy",
            Timestamp = DateTimeOffset.UtcNow,
            Checks = checks,
            DemoMode = demoMode.Enabled,
            DemoModeRawValue = demoMode.RawValue ?? string.Empty,
            DemoRestoreCronValid = IsCronValid(demoMode.RestoreCronUtc, scheduleCalculator),
            AllowAgentSearch = !demoMode.Enabled,
            AllowPhotoSearch = !demoMode.Enabled
        };

        return overallHealthy ? Ok(response) : StatusCode(503, response);
    }

    private static bool IsCronValid(string cronExpression, CronScheduleCalculator scheduleCalculator)
    {
        try
        {
            _ = scheduleCalculator.GetNextOccurrence(cronExpression, DateTimeOffset.UtcNow);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
