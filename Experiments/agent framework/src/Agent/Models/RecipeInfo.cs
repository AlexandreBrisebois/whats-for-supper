namespace Agent.Models;

public class RecipeInfo
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public List<string> OriginalImages { get; set; } = new List<string>();
    public DateTime Created { get; set; } = DateTime.UtcNow;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Thumbnail { get; set; } = string.Empty;
    public int Rating { get; set; } = 0;
}