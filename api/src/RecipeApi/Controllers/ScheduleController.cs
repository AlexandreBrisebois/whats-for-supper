using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/schedule")]
public class ScheduleController(ScheduleService scheduleService) : ControllerBase
{
    private readonly ScheduleService _scheduleService = scheduleService;

    [HttpGet]
    public async Task<IActionResult> GetSchedule([FromQuery] int weekOffset = 0, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        var schedule = await _scheduleService.GetScheduleAsync(weekOffset, reference);
        return Ok(schedule);
    }

    [HttpPost("lock")]
    public async Task<IActionResult> LockSchedule([FromQuery] int weekOffset = 0, [FromQuery] string? referenceWeekStartDate = null, [FromQuery] Guid? votingRoundId = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        try { await _scheduleService.LockScheduleAsync(weekOffset, GetConnectionId(), reference, votingRoundId); }
        catch (VotingConflictException ex) { return Conflict(new { message = ex.Message }); }
        return Ok(new { message = "Schedule locked" });
    }

    [HttpPost("move")]
    public async Task<IActionResult> MoveRecipe([FromBody] MoveScheduleDto dto, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        try
        {
            var result = await _scheduleService.MoveScheduleEventAsync(dto, GetConnectionId(), GetMoveSeq(), reference, HttpContext.RequestAborted);
            return result is null ? Ok(new { message = "Recipe moved" }) : Ok(result);
        }
        catch (TomorrowMoveConflictException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception ex) when (ex is ArgumentException or OverflowException)
        { return BadRequest(new { message = "Choose a valid source and its next calendar day." }); }
    }

    [HttpPost("defer")]
    public async Task<IActionResult> DeferRecipe([FromBody] DeferScheduleDto dto, [FromQuery] string? referenceWeekStartDate = null, [FromQuery] int targetWeekOffset = 1)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        try
        {
            var result = await _scheduleService.DeferRecipeAsync(dto, GetConnectionId(), GetMoveSeq(), referenceWeekStartDate: reference, targetWeekOffset: targetWeekOffset);
            return Ok(result);
        }
        catch (Exception ex) when (ex is ArgumentOutOfRangeException or OverflowException)
        {
            return BadRequest(new { message = "targetWeekOffset must resolve to a supported calendar date." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (DeferScheduleConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("assign")]
    public async Task<IActionResult> AssignRecipe([FromBody] AssignScheduleDto dto, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        if (dto.RequireEmpty && (reference is null || dto.DayIndex is < 0 or > 6))
            return BadRequest(new { message = "Guarded assignment requires a reference Monday and dayIndex 0-6." });
        try
        {
            var displaced = await _scheduleService.AssignRecipeAsync(dto, GetConnectionId(), reference);
            return Ok(new { message = "Recipe assigned", displacedRecipe = displaced });
        }
        catch (AssignmentConflictException ex) { return Conflict(new { message = ex.Message }); }
        catch (Exception ex) when (dto.RequireEmpty && ex is ArgumentException or OverflowException)
        { return BadRequest(new { message = "Choose a valid captured supper date." }); }
    }

    [HttpGet("fill-the-gap")]
    public async Task<IActionResult> FillTheGap([FromQuery] int weekOffset = 0, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        var recipes = await _scheduleService.FillTheGapAsync(weekOffset, reference);
        return Ok(recipes);
    }

    [HttpGet("{weekOffset}/smart-defaults")]
    public async Task<IActionResult> GetSmartDefaults(int weekOffset = 0, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        var defaults = await _scheduleService.GetSmartDefaultsAsync(weekOffset, reference);
        return Ok(defaults);
    }

    [HttpPost("day/{date}/validate")]
    public async Task<IActionResult> ValidateDay(string date, [FromBody] ValidationDto dto)
    {
        try
        {
            var mealMarkedCooked = await _scheduleService.ValidateDayAsync(date, dto, GetConnectionId());
            return Ok(new { message = "Cooking status updated", mealMarkedCooked });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Npgsql.PostgresException ex) when (dto.NonCooking != null && ex.SqlState == "40001")
        {
            return Conflict(new { status = 409, message = "This day’s plan changed. Refresh it before retrying." });
        }
        catch (NonCookingPlanConflictException ex)
        {
            return Conflict(new { status = 409, message = ex.Message });
        }
    }

    [HttpPost("voting/open")]
    public async Task<IActionResult> OpenVoting([FromQuery] int weekOffset = 0, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        try { await _scheduleService.OpenVotingAsync(weekOffset, GetConnectionId(), reference); }
        catch (VotingConflictException ex) { return Conflict(new { message = ex.Message }); }
        return Ok(new { message = "Voting opened" });
    }

    [HttpDelete("day/{date}/remove")]
    public async Task<IActionResult> RemoveRecipe(string date)
    {
        var d = DateOnly.Parse(date);
        await _scheduleService.RemoveRecipeAsync(d, GetConnectionId());
        return NoContent();
    }

    [HttpPatch("{weekOffset}/grocery/item")]
    public async Task<IActionResult> ToggleGroceryItem(
        int weekOffset,
        [FromBody] ToggleGroceryItemDto dto)
    {
        await _scheduleService.ToggleGroceryItemAsync(weekOffset, dto.IngredientName, dto.Checked, GetConnectionId(), HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpPatch("{weekOffset}/grocery")]
    public async Task<IActionResult> UpdateGroceryState(
        int weekOffset,
        [FromBody] Dictionary<string, bool> groceryState)
    {
        var result = await _scheduleService.UpdateGroceryStateAsync(weekOffset, groceryState, GetConnectionId(), HttpContext.RequestAborted);
        return Ok(new { data = result });
    }

    private bool TryReadReference(string? value, out DateOnly? reference) =>
        DeploymentCalendar.TryParseReference(value ?? (Request.Query.ContainsKey("referenceWeekStartDate") ? "" : null), out reference);

    private string? GetConnectionId() => Request.Headers["X-SSE-Connection-ID"].FirstOrDefault();

    private int? GetMoveSeq()
    {
        var headerValue = Request.Headers["X-Move-Seq"].FirstOrDefault();
        return int.TryParse(headerValue, out var seq) ? seq : null;
    }
}
