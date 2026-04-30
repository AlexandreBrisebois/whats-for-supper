using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class SettingsService(RecipeDbContext dbContext, ILogger<SettingsService> logger)
{
    private readonly RecipeDbContext _dbContext = dbContext;
    private readonly ILogger<SettingsService> _logger = logger;

    /// <summary>Returns the stored setting, or null if the key does not exist.</summary>
    public async Task<FamilySetting?> GetSettingAsync(string key)
    {
        return await _dbContext.FamilySettings
            .FirstOrDefaultAsync(s => s.Key == key);
    }

    /// <summary>Inserts or updates the setting for the given key. Returns the saved entity.</summary>
    public async Task<FamilySetting> UpsertSettingAsync(string key, JsonElement value)
    {
        var existing = await _dbContext.FamilySettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (existing is null)
        {
            existing = new FamilySetting
            {
                Id = Guid.NewGuid(),
                Key = key,
                Value = value,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            _dbContext.FamilySettings.Add(existing);
            _logger.LogInformation("Created new setting: {Key}", key);
        }
        else
        {
            existing.Value = value;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            _logger.LogInformation("Updated setting: {Key}", key);
        }

        await _dbContext.SaveChangesAsync();
        return existing;
    }

    /// <summary>
    /// Stub for Recipe Agent synthesis — scaffolded for follow-on phase.
    /// Logs the description and returns a placeholder RecipeDto.
    /// Does NOT call any AI service in this phase.
    /// </summary>
    public Task<RecipeDto> SynthesizeRecipeAsync(string description)
    {
        _logger.LogInformation("SynthesizeRecipeAsync stub called with description: {Description}", description);

        var placeholder = new RecipeDto
        {
            Id = Guid.NewGuid(),
            Name = $"GOTO: {description}",
            Description = description,
            ImageUrl = null,
            TotalTime = null,
            Category = null,
            Difficulty = null,
            Rating = 0,
            IsVegetarian = false,
            IsHealthyChoice = false,
            AddedBy = null,
            Ingredients = [],
            RecipeInstructions = null,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        return Task.FromResult(placeholder);
    }
}
