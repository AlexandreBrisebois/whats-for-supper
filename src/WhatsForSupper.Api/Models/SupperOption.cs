namespace WhatsForSupper.Api.Models;

public class SupperOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    
    // Navigation property
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}