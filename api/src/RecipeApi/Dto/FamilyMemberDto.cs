namespace RecipeApi.Dto;

public class FamilyMemberDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, bool> CompletedTours { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
}
