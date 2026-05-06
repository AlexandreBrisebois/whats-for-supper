using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("ingredient_categories")]
public class IngredientCategory
{
    [Key]
    [Column("normalized_key")]
    public string NormalizedKey { get; set; } = string.Empty;

    [Column("grocery_section")]
    public string GrocerySection { get; set; } = string.Empty;

    [Column("confidence")]
    public double Confidence { get; set; } = 1.0;

    [Column("source")]
    public string Source { get; set; } = "llm";

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
