using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public enum FeatureFlagMode { Off, OptIn, On }

public sealed record FeatureFlagDefinition(
    string Key,
    string EnvironmentVariable,
    string Owner,
    string DisplayName,
    string Description,
    DateOnly IntroducedOn,
    string GraduationCriterion,
    FeatureFlagMode Mode);

public sealed class FeatureFlagRegistry
{
    private readonly IReadOnlyDictionary<string, FeatureFlagDefinition> _definitions;

    public FeatureFlagRegistry(IConfiguration configuration, ILogger<FeatureFlagRegistry> logger)
    {
        var definition = Create(
            "single-page-recipe-steps",
            "WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS",
            "cooking-experience",
            "Recipe on one page",
            "After getting ready, scroll through all the cooking steps on one page.",
            new DateOnly(2026, 9, 30),
            "Responsive and accessibility acceptance passes and the owner approves graduation after the opt-in observation period.",
            configuration,
            logger);
        _definitions = new Dictionary<string, FeatureFlagDefinition>(StringComparer.Ordinal) { [definition.Key] = definition };
    }

    public IEnumerable<FeatureFlagDefinition> All => _definitions.Values;
    public FeatureFlagDefinition? Get(string key) => _definitions.GetValueOrDefault(key);

    private static FeatureFlagDefinition Create(
        string key, string environmentVariable, string owner, string displayName, string description,
        DateOnly introducedOn, string graduationCriterion, IConfiguration configuration,
        ILogger<FeatureFlagRegistry> logger)
    {
        var raw = configuration[environmentVariable];
        var normalized = raw?.Trim().ToLowerInvariant();
        var mode = normalized switch
        {
            "opt-in" => FeatureFlagMode.OptIn,
            "on" => FeatureFlagMode.On,
            "off" or null or "" => FeatureFlagMode.Off,
            _ => FeatureFlagMode.Off
        };
        if (normalized is not (null or "" or "off" or "opt-in" or "on"))
            logger.LogWarning("Invalid deployment mode for feature flag {FeatureFlagKey}; using off.", key);
        return new(key, environmentVariable, owner, displayName, description, introducedOn, graduationCriterion, mode);
    }
}

public sealed class FeatureFlagService(RecipeDbContext db, FeatureFlagRegistry registry)
{
    public Task<bool> MemberExistsAsync(Guid memberId, CancellationToken cancellationToken = default) =>
        db.FamilyMembers.AnyAsync(member => member.Id == memberId, cancellationToken);

    public async Task<IReadOnlyList<FeatureFlagDto>> GetSnapshotAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        var overrides = await db.FeatureFlagOverrides.AsNoTracking()
            .Where(item => item.MemberId == memberId)
            .ToDictionaryAsync(item => item.FlagKey, item => item.Enabled, cancellationToken);
        return registry.All.Select(definition => ToDto(
            definition,
            overrides.TryGetValue(definition.Key, out var enabled) ? enabled : null)).ToList();
    }

    public async Task<FeatureFlagDto?> SetOverrideAsync(
        Guid memberId, string key, bool enabled, CancellationToken cancellationToken = default)
    {
        var definition = registry.Get(key);
        if (definition is null) return null;
        if (definition.Mode != FeatureFlagMode.OptIn)
            throw new FeatureFlagNotOptInException(key);
        if (!await db.FamilyMembers.AnyAsync(member => member.Id == memberId, cancellationToken))
            return null;

        var value = await db.FeatureFlagOverrides.FindAsync([memberId, key], cancellationToken);
        if (value is null)
        {
            value = new FeatureFlagOverride { MemberId = memberId, FlagKey = key };
            db.FeatureFlagOverrides.Add(value);
        }
        value.Enabled = enabled;
        value.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(definition, enabled);
    }

    public static bool Resolve(FeatureFlagMode mode, bool? memberEnabled) => mode switch
    {
        FeatureFlagMode.On => true,
        FeatureFlagMode.OptIn => memberEnabled ?? false,
        _ => false
    };

    private static FeatureFlagDto ToDto(FeatureFlagDefinition definition, bool? memberEnabled) =>
        definition.Mode == FeatureFlagMode.OptIn
            ? new(definition.Key, Resolve(definition.Mode, memberEnabled), "opt-in", memberEnabled ?? false,
                definition.DisplayName, definition.Description)
            : new(definition.Key, Resolve(definition.Mode, memberEnabled),
                definition.Mode == FeatureFlagMode.On ? "on" : "off");
}

public sealed class FeatureFlagNotOptInException(string key) : Exception($"Feature flag '{key}' is not available for opt-in.");
