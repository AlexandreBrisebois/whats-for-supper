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
    public async Task<IActionResult> GetSchedule([FromQuery] int weekOffset = 0)
    {
        var schedule = await _scheduleService.GetScheduleAsync(weekOffset);
        return Ok(schedule);
    }

    [HttpPost("lock")]
    public async Task<IActionResult> LockSchedule([FromQuery] int weekOffset = 0)
    {
        await _scheduleService.LockScheduleAsync(weekOffset);
        return Ok(new { message = "Schedule locked" });
    }

    [HttpPost("move")]
    public async Task<IActionResult> MoveRecipe([FromBody] MoveScheduleDto dto)
    {
        await _scheduleService.MoveScheduleEventAsync(dto);
        return Ok(new { message = "Recipe moved" });
    }

    [HttpPost("assign")]
    public async Task<IActionResult> AssignRecipe([FromBody] AssignScheduleDto dto)
    {
        await _scheduleService.AssignRecipeAsync(dto);
        return Ok(new { message = "Recipe assigned" });
    }

    [HttpGet("fill-the-gap")]
    public async Task<IActionResult> FillTheGap()
    {
        var recipes = await _scheduleService.FillTheGapAsync();
        return Ok(recipes);
    }

    [HttpGet("{weekOffset}/smart-defaults")]
    public async Task<IActionResult> GetSmartDefaults(int weekOffset = 0)
    {
        var defaults = await _scheduleService.GetSmartDefaultsAsync(weekOffset);
        return Ok(defaults);
    }

    [HttpPost("day/{date}/validate")]
    public async Task<IActionResult> ValidateDay(string date, [FromBody] ValidationDto dto)
    {
        await _scheduleService.ValidateDayAsync(date, dto);
        return Ok(new { message = "Day validated" });
    }

    [HttpPost("voting/open")]
    public async Task<IActionResult> OpenVoting([FromQuery] int weekOffset = 0)
    {
        await _scheduleService.OpenVotingAsync(weekOffset);
        return Ok(new { message = "Voting opened" });
    }

    [HttpDelete("day/{date}/remove")]
    public async Task<IActionResult> RemoveRecipe(string date)
    {
        var d = DateOnly.Parse(date);
        await _scheduleService.RemoveRecipeAsync(d);
        return NoContent();
    }

    [HttpPatch("{weekOffset}/grocery")]
    public async Task<IActionResult> UpdateGroceryState(
        int weekOffset,
        [FromBody] Dictionary<string, bool> groceryState)
    {
        var result = await _scheduleService.UpdateGroceryStateAsync(weekOffset, groceryState);
        return Ok(new { data = result });
    }
}
