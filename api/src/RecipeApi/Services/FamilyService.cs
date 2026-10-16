using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class FamilyService(RecipeDbContext db)
{
    public const string BrowseViewModeStack = "stack";
    public const string BrowseViewModeList = "list";

    public async Task<List<FamilyMember>> GetAllFamilyMembers()
    {
        return await db.FamilyMembers
            .OrderBy(m => m.Name)
            .ToListAsync();
    }

    public async Task<FamilyMember> CreateFamilyMember(string name)
    {
        var trimmed = name.Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new ArgumentException("Family member name must not be empty.");

        var normalized = trimmed.ToLowerInvariant();
        var exists = await db.FamilyMembers
            .AnyAsync(m => m.Name.Trim().ToLower() == normalized);
        if (exists)
            throw new DuplicateFamilyMemberException("A family member with this name already exists.");

        var member = new FamilyMember { Name = trimmed };
        db.FamilyMembers.Add(member);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new DuplicateFamilyMemberException("A family member with this name already exists.");
        }
        return member;
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        return ex.InnerException is Npgsql.PostgresException { SqlState: "23505" }
            || ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true
            || ex.InnerException?.Message.Contains("duplicate key value") == true;
    }

    public async Task<FamilyMember> UpdateFamilyMember(Guid id, string name)
    {
        var trimmed = name.Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new ArgumentException("Family member name must not be empty.");

        var member = await db.FamilyMembers.FindAsync(id)
            ?? throw new KeyNotFoundException($"Family member {id} not found.");

        member.Name = trimmed;
        member.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return member;
    }

    public async Task<FamilyMember> UpdateFamilyMemberPreferences(Guid id, string? browseViewMode, string? preferredLanguage)
    {
        var member = await db.FamilyMembers.FindAsync(id)
            ?? throw new KeyNotFoundException($"Family member {id} not found.");

        if (!string.IsNullOrEmpty(browseViewMode))
        {
            var normalizedMode = browseViewMode.Trim().ToLowerInvariant();
            if (normalizedMode is not (BrowseViewModeStack or BrowseViewModeList))
                throw new ArgumentException("browseViewMode must be stack or list.");
            member.BrowseViewMode = normalizedMode;
        }

        if (!string.IsNullOrEmpty(preferredLanguage))
        {
            var normalizedLang = preferredLanguage.Trim().ToLowerInvariant();
            if (normalizedLang is not ("en" or "fr"))
                throw new ArgumentException("preferredLanguage must be en or fr.");
            member.PreferredLanguage = normalizedLang;
        }

        member.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return member;
    }

    public async Task DeleteFamilyMember(Guid id)
    {
        var member = await db.FamilyMembers.FindAsync(id)
            ?? throw new KeyNotFoundException($"Family member {id} not found.");

        db.FamilyMembers.Remove(member);
        await db.SaveChangesAsync();
    }
}
