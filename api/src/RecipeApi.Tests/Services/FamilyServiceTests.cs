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
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        var alice = await service.CreateFamilyMember("Alice");
        var bob   = await service.CreateFamilyMember("Bob");

        Assert.NotEqual(alice.Id, bob.Id);
        Assert.NotEqual(Guid.Empty, alice.Id);
        Assert.NotEqual(Guid.Empty, bob.Id);
    }

    [Fact]
    public async Task CreateFamilyMember_Defaults_BrowseViewMode_To_Stack()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        var member = await service.CreateFamilyMember("Alice");

        Assert.Equal("stack", member.BrowseViewMode);
    }

    [Fact]
    public async Task CreateFamilyMember_Empty_Name_Throws()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateFamilyMember(""));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateFamilyMember("   "));
    }

    [Fact]
    public async Task CreateFamilyMember_Exact_Duplicate_Throws_DuplicateFamilyMemberException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await service.CreateFamilyMember("Alex");
        await Assert.ThrowsAsync<DuplicateFamilyMemberException>(() => service.CreateFamilyMember("Alex"));
    }

    [Fact]
    public async Task CreateFamilyMember_Casing_Variant_Throws_DuplicateFamilyMemberException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await service.CreateFamilyMember("Alex");
        await Assert.ThrowsAsync<DuplicateFamilyMemberException>(() => service.CreateFamilyMember("alex"));
    }

    [Fact]
    public async Task CreateFamilyMember_Whitespace_Variant_Throws_DuplicateFamilyMemberException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await service.CreateFamilyMember("Alex");
        await Assert.ThrowsAsync<DuplicateFamilyMemberException>(() => service.CreateFamilyMember(" Alex "));
    }

    [Fact]
    public async Task CreateFamilyMember_Stored_Whitespace_Variant_Throws_DuplicateFamilyMemberException()
    {
        await using var ctx = TestDbContextFactory.Create();
        // Insert a member with stored untrimmed whitespace directly
        ctx.FamilyMembers.Add(new RecipeApi.Models.FamilyMember { Name = " Alex " });
        await ctx.SaveChangesAsync();

        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);
        await Assert.ThrowsAsync<DuplicateFamilyMemberException>(() => service.CreateFamilyMember("alex"));
    }

    [Fact]
    public async Task CreateFamilyMember_Distinct_Name_Preserves_Display_Casing()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        var member = await service.CreateFamilyMember(" aLeX ");
        Assert.Equal("aLeX", member.Name);
    }

    // ── GetAllFamilyMembers ────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllFamilyMembers_Returns_All_Members()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

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
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

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
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        var member = await service.CreateFamilyMember("Valid Name");

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateFamilyMember(member.Id, ""));
        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateFamilyMember(member.Id, "   "));
    }

    [Fact]
    public async Task UpdateFamilyMember_NonExistent_Throws_KeyNotFoundException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.UpdateFamilyMember(Guid.NewGuid(), "New Name"));
    }

    [Theory]
    [InlineData("stack")]
    [InlineData("list")]
    public async Task UpdateFamilyMemberPreferences_Persists_BrowseViewMode_And_Preserves_Name(
        string browseViewMode)
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);
        var member = await service.CreateFamilyMember("Alex");

        var updated = await service.UpdateFamilyMemberPreferences(member.Id, browseViewMode, null, null);

        Assert.Equal("Alex", updated.Name);
        Assert.Equal(browseViewMode, updated.BrowseViewMode);

        var reFetched = await ctx.FamilyMembers.FindAsync(member.Id);
        Assert.Equal("Alex", reFetched!.Name);
        Assert.Equal(browseViewMode, reFetched.BrowseViewMode);
    }

    [Fact]
    public async Task UpdateFamilyMemberPreferences_Invalid_BrowseViewMode_Throws()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);
        var member = await service.CreateFamilyMember("Alex");

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.UpdateFamilyMemberPreferences(member.Id, "carousel", null, null));
    }

    [Fact]
    public async Task UpdateFamilyMemberPreferences_NonExistent_Throws_KeyNotFoundException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.UpdateFamilyMemberPreferences(Guid.NewGuid(), "list", null, null));
    }

    [Theory]
    [InlineData("step-by-step")]
    [InlineData("all-steps")]
    public async Task UpdateFamilyMemberPreferences_Persists_CookingView_Only(string cookingViewMode)
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);
        var member = await service.CreateFamilyMember("Alex");
        member.PreferredLanguage = "fr";
        await ctx.SaveChangesAsync();

        var updated = await service.UpdateFamilyMemberPreferences(member.Id, null, null, cookingViewMode);

        Assert.Equal(cookingViewMode, updated.CookingViewMode);
        Assert.Equal("stack", updated.BrowseViewMode);
        Assert.Equal("fr", updated.PreferredLanguage);
        Assert.Equal("Alex", updated.Name);
    }

    [Fact]
    public async Task UpdateFamilyMemberPreferences_Invalid_CookingView_Does_Not_Change_Member()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);
        var member = await service.CreateFamilyMember("Alex");

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.UpdateFamilyMemberPreferences(member.Id, null, null, "carousel"));
        Assert.Null(member.CookingViewMode);
    }

    // ── DeleteFamilyMember ────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteFamilyMember_Removes_Member()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        var member = await service.CreateFamilyMember("Frank");

        await service.DeleteFamilyMember(member.Id);

        var remaining = await service.GetAllFamilyMembers();
        Assert.DoesNotContain(remaining, m => m.Id == member.Id);
    }

    [Fact]
    public async Task DeleteFamilyMember_NonExistent_Throws_KeyNotFoundException()
    {
        await using var ctx = TestDbContextFactory.Create();
        var service = new FamilyService(new RecipeApi.Services.SystemClock(), ctx);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.DeleteFamilyMember(Guid.NewGuid()));
    }
}
