using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementMemberRecoveryService(
    RecipeDbContext db,
    IRecipeStore recipeStore,
    DataRootResolver dataRoot,
    IClock clock,
    DemoModeOptions demoMode,
    ILogger logger)
{
    private string DataRoot => dataRoot.Root;

    public async Task RestoreFamilyMembersAsync(SeedResult result, CancellationToken ct)
    {
        var membersPath = Path.Combine(DataRoot, "family-members.json");
        logger.LogInformation("Looking for family members at: {Path}", membersPath);
        if (File.Exists(membersPath))
        {
            var json = await File.ReadAllTextAsync(membersPath, ct);
            var members = JsonSerializer.Deserialize<List<FamilyMember>>(json, JsonDefaults.CamelCase) ?? [];
            ManagementSharedHelpers.FillMissingMemberTimestamps(members, clock.UtcNow);
            logger.LogInformation("Found {Count} family members to restore", members.Count);
            foreach (var member in members)
            {
                if (ct.IsCancellationRequested) break;
                var existing = await db.FamilyMembers.FindAsync(new object[] { member.Id }, ct);
                if (existing == null)
                {
                    db.FamilyMembers.Add(member);
                    result.MembersAdded++;
                }
                else
                {
                    existing.Name = member.Name;
                    existing.BrowseViewMode = member.BrowseViewMode;
                    existing.PreferredLanguage = member.PreferredLanguage;
                    existing.UpdatedAt = clock.UtcNow;
                    result.MembersUpdated++;
                }
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Family members restore complete - Added: {Added}, Updated: {Updated}", result.MembersAdded, result.MembersUpdated);
        }
        else
        {
            logger.LogWarning("Family members file not found at {Path}", membersPath);
        }
    }

    public async Task CreatePlaceholderMembersAsync(HashSet<Guid> missingMemberIds, SeedResult result, CancellationToken ct)
    {
        if (missingMemberIds.Count == 0) return;

        logger.LogInformation("Creating {Count} placeholder family members for referential integrity.", missingMemberIds.Count);
        foreach (var memberId in missingMemberIds)
        {
            db.FamilyMembers.Add(new FamilyMember
            {
                Id = memberId,
                Name = $"Recovered Member {memberId.ToString()[..4]}",
                CreatedAt = clock.UtcNow,
                UpdatedAt = clock.UtcNow
            });
            result.MembersAdded++;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<SeedResult> DisasterRecoveryAsync()
    {
        demoMode.EnsureManagementAvailable();
        var result = new SeedResult();

        var membersPath = Path.Combine(DataRoot, "family-members.json");
        List<FamilyMember> existingMembers = [];
        if (File.Exists(membersPath))
        {
            var json = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json, JsonDefaults.CamelCase) ?? [];
        }

        var recipeIds = await recipeStore.ListRecipeIdsAsync();
        if (recipeIds.Count == 0) return result;

        var missingIds = new HashSet<Guid>();
        foreach (var recipeId in recipeIds)
        {
            var info = await recipeStore.ReadInfoAsync(recipeId);
            Guid? addedBy = info?.AddedBy;

            if (!addedBy.HasValue)
            {
                var recipeJson = await recipeStore.ReadRecipeJsonAsync(recipeId);
                if (recipeJson != null)
                {
                    try
                    {
                        var recipe = JsonSerializer.Deserialize<Recipe>(recipeJson, JsonDefaults.CamelCase);
                        addedBy = recipe?.AddedBy;
                    }
                    catch (JsonException) { }
                }
            }

            if (addedBy.HasValue && !existingMembers.Any(m => m.Id == addedBy.Value))
            {
                missingIds.Add(addedBy.Value);
            }
        }

        var placeholders = missingIds.Select(id => new FamilyMember
        {
            Id = id,
            Name = $"Recovered Member {id.ToString()[..4]}",
            CreatedAt = clock.UtcNow,
            UpdatedAt = clock.UtcNow
        }).ToList();

        result.MembersAdded = await MergeFamilyMembersAsync(placeholders);
        return result;
    }

    private async Task<int> MergeFamilyMembersAsync(List<FamilyMember> sourceMembers)
    {
        var membersPath = Path.Combine(DataRoot, "family-members.json");
        List<FamilyMember> existingMembers = [];
        if (File.Exists(membersPath))
        {
            var json = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json, JsonDefaults.CamelCase) ?? [];
            ManagementSharedHelpers.FillMissingMemberTimestamps(existingMembers, clock.UtcNow);
        }

        int addedCount = 0;
        foreach (var member in sourceMembers)
        {
            if (!existingMembers.Any(m => m.Id == member.Id))
            {
                existingMembers.Add(member);
                addedCount++;
            }
        }

        if (addedCount > 0)
        {
            var updatedJson = JsonSerializer.Serialize(existingMembers, ManagementSharedHelpers.CycleIgnoreOptions);
            await File.WriteAllTextAsync(membersPath, updatedJson);
            logger.LogInformation("Merged {Count} family members into {Path}", addedCount, membersPath);
        }
        return addedCount;
    }
}
