using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("feature_flag_overrides")]
public class FeatureFlagOverride
{
    [Column("member_id")]
    public Guid MemberId { get; set; }

    [Column("flag_key")]
    public string FlagKey { get; set; } = string.Empty;

    [Column("enabled")]
    public bool Enabled { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public FamilyMember Member { get; set; } = null!;
}
