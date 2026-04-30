using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(SettingsService settingsService) : ControllerBase
{
    private readonly SettingsService _settingsService = settingsService;

    [HttpGet("{key}")]
    public async Task<IActionResult> GetSetting(string key)
    {
        var setting = await _settingsService.GetSettingAsync(key);
        if (setting is null)
            return NotFound();

        return Ok(new { data = new SettingsDto(setting.Key, setting.Value) });
    }

    [HttpPost("{key}")]
    public async Task<IActionResult> UpsertSetting(string key, [FromBody] SettingsDto dto)
    {
        var saved = await _settingsService.UpsertSettingAsync(key, dto.Value);
        return Ok(new { data = new SettingsDto(saved.Key, saved.Value) });
    }
}
