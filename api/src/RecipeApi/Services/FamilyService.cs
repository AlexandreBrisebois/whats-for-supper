using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class FamilyService(IClock clock, RecipeDbContext db, DeploymentCalendar calendar,
    SupperProjectionInvalidation projectionInvalidation, ISupperProjectionPublisher projectionPublisher, VotingSession votingSession)
{
    public const string BrowseViewModeStack = "stack";
    public const string BrowseViewModeList = "list";
    public const string CookingViewModeStepByStep = "step-by-step";
    public const string CookingViewModeAllSteps = "all-steps";

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

        FamilyMember member;
        bool automatic;
        IReadOnlyList<DateOnly> weeks;
        await using (var transaction = await SupperServingsService.BeginAsync(db, CancellationToken.None))
        {
            var before = await SupperServingsService.ReadUsualAsync(db, CancellationToken.None);
            automatic = before.Source == "family";
            var normalized = trimmed.ToLowerInvariant();
            var exists = await db.FamilyMembers.AnyAsync(m => m.Name.Trim().ToLower() == normalized);
            if (exists) throw new DuplicateFamilyMemberException("A family member with this name already exists.");
            member = new FamilyMember { Name = trimmed, CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow };
            db.FamilyMembers.Add(member);
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            { throw new DuplicateFamilyMemberException("A family member with this name already exists."); }
            weeks = await EnlistMembershipChangeAsync(before);
            if (transaction is not null) await transaction.CommitAsync();
        }
        // Both notifications observe a committed/disposed transaction. Portions publish first.
        if (automatic) await projectionPublisher.PublishAsync(weeks);
        await votingSession.RefreshAfterMutationAsync();
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
        member.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        return member;
    }

    public async Task<FamilyMember> UpdateFamilyMemberPreferences(
        Guid id,
        string? browseViewMode,
        string? preferredLanguage,
        string? cookingViewMode)
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

        if (!string.IsNullOrEmpty(cookingViewMode))
        {
            var normalizedCookingView = cookingViewMode.Trim().ToLowerInvariant();
            if (normalizedCookingView is not (CookingViewModeStepByStep or CookingViewModeAllSteps))
                throw new ArgumentException("cookingViewMode must be step-by-step or all-steps.");
            member.CookingViewMode = normalizedCookingView;
        }

        if (string.IsNullOrEmpty(browseViewMode)
            && string.IsNullOrEmpty(preferredLanguage)
            && string.IsNullOrEmpty(cookingViewMode))
            throw new ArgumentException("At least one preference must be supplied.");

        member.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        return member;
    }

    public async Task DeleteFamilyMember(Guid id)
    {
        bool automatic;
        IReadOnlyList<DateOnly> weeks;
        await using (var transaction = await SupperServingsService.BeginAsync(db, CancellationToken.None))
        {
            var before = await SupperServingsService.ReadUsualAsync(db, CancellationToken.None);
            automatic = before.Source == "family";
            var member = await db.FamilyMembers.FindAsync(id)
                ?? throw new KeyNotFoundException($"Family member {id} not found.");
            db.FamilyMembers.Remove(member);
            await db.SaveChangesAsync();
            weeks = await EnlistMembershipChangeAsync(before);
            if (transaction is not null) await transaction.CommitAsync();
        }
        if (automatic) await projectionPublisher.PublishAsync(weeks);
        await votingSession.RefreshAfterMutationAsync();
    }

    private async Task<IReadOnlyList<DateOnly>> EnlistMembershipChangeAsync(SupperServingsService.UsualSnapshot before)
    {
        if (before.Source != "family") return [];
        var after = await SupperServingsService.ReadUsualAsync(db, CancellationToken.None);
        var weeks = await SupperServingsService.MaterializeInheritedAsync(db, clock, calendar, after.Count, CancellationToken.None);
        return await projectionInvalidation.EnlistWeeksAsync(weeks, CancellationToken.None);
    }
}
