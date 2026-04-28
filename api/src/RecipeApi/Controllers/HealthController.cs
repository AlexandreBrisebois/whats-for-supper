using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;

using RecipeApi.Infrastructure;

namespace RecipeApi.Controllers;

[ApiController]
[SkipWrapping]
public class HealthController(RecipeDbContext db) : ControllerBase
{
    [HttpGet("/health")]
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
            Checks = checks
        };

        return overallHealthy ? Ok(response) : StatusCode(503, response);
    }
}
