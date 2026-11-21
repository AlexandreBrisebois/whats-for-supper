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
        try { return Ok(await _scheduleService.GetScheduleAsync(weekOffset, reference)); }
        catch (GroceryMutationConflictException ex) { return GroceryConflict(ex); }
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

    [HttpPost("day/{date}/prepare")]
    public async Task<IActionResult> PrepareSupper(string date, [FromBody] PrepareSupperRequestDto body)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var day))
            return BadRequest(new { message = "Capture a yyyy-MM-dd supper date." });
        try { return Ok(new { data = await _scheduleService.PrepareSupperAsync(day, body, GetConnectionId(), HttpContext.RequestAborted) }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (PreparationConflictException ex) { return Conflict(new { message = ex.Message }); }
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
    public async Task<IActionResult> RemoveRecipe(string date, [FromQuery] string? expectedPlanToken = null)
    {
        // Distinguish omission (legacy) from an explicitly supplied empty value.
        if (Request.Query.ContainsKey("expectedPlanToken") && !ScheduleService.IsRemovalToken(expectedPlanToken))
            return BadRequest(new { message = "expectedPlanToken must be a valid captured removal token." });
        var d = DateOnly.Parse(date);
        try { await _scheduleService.RemoveRecipeAsync(d, GetConnectionId(), expectedPlanToken); }
        catch (RemovalConflictException ex) { return Conflict(new { message = ex.Message }); }
        return NoContent();
    }

    [HttpPatch("{weekOffset}/grocery/item")]
    public async Task<IActionResult> ToggleGroceryItem(
        int weekOffset,
        [FromBody] GroceryItemMutationDto dto, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        try { return Ok(await _scheduleService.MutateGroceryItemAsync(weekOffset, dto, GetConnectionId(), HttpContext.RequestAborted, reference)); }
        catch (GroceryMutationConflictException ex) { return GroceryConflict(ex); }
        catch (Exception ex) when (ex is ArgumentOutOfRangeException or OverflowException)
        { return BadRequest(new { message = "weekOffset must resolve to a supported calendar date." }); }
    }

    [HttpPatch("{weekOffset}/grocery")]
    public async Task<IActionResult> UpdateGroceryState(
        int weekOffset,
        [FromBody] GroceryBulkMutationDto groceryState, [FromQuery] string? referenceWeekStartDate = null)
    {
        if (!TryReadReference(referenceWeekStartDate, out var reference))
            return BadRequest(new { message = "referenceWeekStartDate must be a yyyy-MM-dd Monday." });
        try
        {
            var result = await _scheduleService.MutateGroceryBulkAsync(weekOffset, groceryState, GetConnectionId(), HttpContext.RequestAborted, reference);
            return Ok(new { data = result });
        }
        catch (GroceryMutationConflictException ex) { return GroceryConflict(ex); }
        catch (Exception ex) when (ex is ArgumentOutOfRangeException or OverflowException)
        { return BadRequest(new { message = "weekOffset must resolve to a supported calendar date." }); }
    }

    private bool TryReadReference(string? value, out DateOnly? reference) =>
        DeploymentCalendar.TryParseReference(value ?? (Request.Query.ContainsKey("referenceWeekStartDate") ? "" : null), out reference);

    private IActionResult GroceryConflict(GroceryMutationConflictException error)
    {
        var payload = new Dictionary<string, object> { ["code"] = error.Code };
        if (error.Current is not null) payload["current"] = error.Current;
        if (error.Absent) payload["absent"] = true;
        return Conflict(payload);
    }

    private string? GetConnectionId() => Request.Headers["X-SSE-Connection-ID"].FirstOrDefault();

    private int? GetMoveSeq()
    {
        var headerValue = Request.Headers["X-Move-Seq"].FirstOrDefault();
        return int.TryParse(headerValue, out var seq) ? seq : null;
    }
}
