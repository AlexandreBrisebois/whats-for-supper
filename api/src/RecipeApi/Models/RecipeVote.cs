using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public enum VoteType : short
{
    Like = 1,
    Dislike = 2
}

[Table("recipe_votes")]
public class RecipeVote
{
    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("family_member_id")]
    public Guid FamilyMemberId { get; set; }

    [Column("vote")]
    public VoteType Vote { get; set; }

    [Column("voted_at")]
    public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }

    [ForeignKey(nameof(FamilyMemberId))]
    public FamilyMember? FamilyMember { get; set; }
}
