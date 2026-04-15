namespace RecipeApi.Models;

/// <summary>
/// Internal model representing a single completed hint tour for a family member.
/// Used when updating the CompletedTours JSONB field on FamilyMember.
/// </summary>
public class TourCompletion
{
    public string TourId { get; set; } = string.Empty;
    public bool Completed { get; set; } = true;
}
