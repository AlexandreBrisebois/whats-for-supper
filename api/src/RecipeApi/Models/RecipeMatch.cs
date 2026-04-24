using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("vw_recipe_matches")]
public class RecipeMatch
{
    [Key]
    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("like_count")]
    public int LikeCount { get; set; }
}
