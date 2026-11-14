using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Infrastructure;
namespace RecipeApi.Controllers;

[ApiController]
[Route("api/schedule/servings")]
public class SupperServingsController(SupperServingsService servings, ScheduleService schedule, IScheduleEventPublisher publisher, ILogger<SupperServingsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Read([FromQuery] int weekOffset = 0, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!DeploymentCalendar.TryParseReference(referenceWeekStartDate, out var reference)) return BadRequest(new { message = "Choose a yyyy-MM-dd reference Monday." });
        try { return Ok(new { data = await servings.ReadAsync(weekOffset, reference, HttpContext.RequestAborted) }); }
        catch (ArgumentOutOfRangeException) { return BadRequest(new { message = "Choose a supported week." }); }
        catch (OverflowException) { return BadRequest(new { message = "Choose a supported week." }); }
    }

    [HttpPut]
    public async Task<IActionResult> Save(SupperServingsSaveDto body)
    {
        SupperServingsDto saved;
        try { saved = await servings.SaveAsync(body, HttpContext.RequestAborted); }
        catch (ServingConflictException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception ex) when (ex is ArgumentException or OverflowException) { return BadRequest(new { message = ex.Message }); }
        // Persistence is already confirmed. Publication is a hint, never a failed portion save.
        foreach (var week in (saved.AffectedWeekStartDates ?? []).Append(saved.WeekStartDate).Distinct())
        {
            try
            {
                var offset = (week.DayNumber - body.ReferenceWeekStartDate.DayNumber) / 7;
                await publisher.PublishWeekUpdatedAsync(await schedule.GetScheduleAsync(offset, body.ReferenceWeekStartDate));
            }
            catch (Exception ex) { logger.LogWarning(ex, "Saved portions; could not publish week {Week}", week); }
        }
        return Ok(new { data = saved });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(SupperServingsRefreshDto body)
    {
        try { await servings.RetryAsync(body, HttpContext.RequestAborted); return Accepted(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
