using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(SettingsService settingsService) : ControllerBase
{
    private readonly SettingsService _settingsService = settingsService;

    [HttpGet("{settingsKey}")]
    public async Task<IActionResult> GetSetting([FromRoute] string settingsKey)
    {
        var setting = await _settingsService.GetSettingAsync(settingsKey);
        if (setting is null)
            return NotFound();

        return Ok(new { data = new SettingsDto(setting.Key, setting.Value) });
    }

    [HttpPost("{settingsKey}")]
    public async Task<IActionResult> UpsertSetting([FromRoute] string settingsKey, [FromBody] JsonElement body)
    {
        // Extract "value" from the body if present, otherwise use the whole body
        var value = body.ValueKind == JsonValueKind.Object && body.TryGetProperty("value", out var v) ? v : body;

        var saved = await _settingsService.UpsertSettingAsync(settingsKey, value);
        return Ok(new { data = new SettingsDto(saved.Key, saved.Value) });
    }
}
