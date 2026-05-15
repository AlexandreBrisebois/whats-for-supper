using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("health_recipe_profiles")]
public class HealthRecipeProfile
{
    [Key]
    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("is_healthy_choice")]
    public bool IsHealthyChoice { get; set; } = false;

    [Column("is_vegetarian")]
    public bool IsVegetarian { get; set; } = false;

    [Column("primary_food_group")]
    [MaxLength(50)]
    public string? PrimaryFoodGroup { get; set; }

    [Column("dietary_profile", TypeName = "jsonb")]
    public string? DietaryProfile { get; set; }

    [Column("fop_flags", TypeName = "jsonb")]
    public string? FopFlags { get; set; }

    [Column("last_recomputed_at")]
    public DateTimeOffset LastRecomputedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("version")]
    public int Version { get; set; } = 1;

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }
}
