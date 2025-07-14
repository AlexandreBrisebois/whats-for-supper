namespace WhatsForSupper.Api.Models;

public class Vote
{
    public int Id { get; set; }
    public int SupperOptionId { get; set; }
    public string FamilyMember { get; set; } = string.Empty;
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public SupperOption SupperOption { get; set; } = null!;
}