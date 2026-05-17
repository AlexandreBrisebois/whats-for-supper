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

    [HttpGet("{key}")]
    public async Task<IActionResult> GetSetting([FromRoute] string key)
    {
        var setting = await _settingsService.GetSettingAsync(key);
        if (setting is null)
            return NotFound();

        return Ok(new { data = new SettingsDto(setting.Key, setting.Value) });
    }

    [HttpPost("{key}")]
    public async Task<IActionResult> UpsertSetting([FromRoute] string key, [FromBody] JsonElement body)
    {
        // Extract "value" from the body if present, otherwise use the whole body
        var value = body.ValueKind == JsonValueKind.Object && body.TryGetProperty("value", out var v) ? v : body;

        var saved = await _settingsService.UpsertSettingAsync(key, value);
        return Ok(new { data = new SettingsDto(saved.Key, saved.Value) });
    }
}
