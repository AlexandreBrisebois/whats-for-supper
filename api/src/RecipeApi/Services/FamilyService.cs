using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class FamilyService(RecipeDbContext db)
{
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

        var member = new FamilyMember { Name = trimmed };
        db.FamilyMembers.Add(member);
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
