using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class FamilyServiceTests
{
    // ── CreateFamilyMember ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateFamilyMember_Creates_With_Unique_Id()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        var alice = await service.CreateFamilyMember("Alice");
        var bob   = await service.CreateFamilyMember("Bob");

        Assert.NotEqual(alice.Id, bob.Id);
        Assert.NotEqual(Guid.Empty, alice.Id);
        Assert.NotEqual(Guid.Empty, bob.Id);
    }

    [Fact]
    public async Task CreateFamilyMember_Empty_Name_Throws()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateFamilyMember(""));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateFamilyMember("   "));
    }

    // ── GetAllFamilyMembers ────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllFamilyMembers_Returns_All_Members()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        await service.CreateFamilyMember("Charlie");
        await service.CreateFamilyMember("Dana");
        await service.CreateFamilyMember("Eve");

        var members = await service.GetAllFamilyMembers();

        Assert.Equal(3, members.Count);
        Assert.Contains(members, m => m.Name == "Charlie");
        Assert.Contains(members, m => m.Name == "Dana");
        Assert.Contains(members, m => m.Name == "Eve");
    }

    // ── UpdateFamilyMember ────────────────────────────────────────────────────
    
    [Fact]
    public async Task UpdateFamilyMember_Updates_Name_And_UpdatedAt()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        var member = await service.CreateFamilyMember("Old Name");
        var originalUpdatedAt = member.UpdatedAt;

        // Ensure a tiny delay so UtcNow changes
        await Task.Delay(10);

        var updated = await service.UpdateFamilyMember(member.Id, "New Name");

        Assert.Equal("New Name", updated.Name);
        Assert.True(updated.UpdatedAt > originalUpdatedAt);
        
        // Re-fetch from DB to be sure
        var reFetched = await ctx.FamilyMembers.FindAsync(member.Id);
        Assert.Equal("New Name", reFetched!.Name);
    }

    [Fact]
    public async Task UpdateFamilyMember_Empty_Name_Throws()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        var member = await service.CreateFamilyMember("Valid Name");

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateFamilyMember(member.Id, ""));
        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateFamilyMember(member.Id, "   "));
    }

    [Fact]
    public async Task UpdateFamilyMember_NonExistent_Throws_KeyNotFoundException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.UpdateFamilyMember(Guid.NewGuid(), "New Name"));
    }

    // ── DeleteFamilyMember ────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteFamilyMember_Removes_Member()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        var member = await service.CreateFamilyMember("Frank");

        await service.DeleteFamilyMember(member.Id);

        var remaining = await service.GetAllFamilyMembers();
        Assert.DoesNotContain(remaining, m => m.Id == member.Id);
    }

    [Fact]
    public async Task DeleteFamilyMember_NonExistent_Throws_KeyNotFoundException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(ctx);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.DeleteFamilyMember(Guid.NewGuid()));
    }
}
