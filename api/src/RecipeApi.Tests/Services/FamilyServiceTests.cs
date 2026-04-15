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
