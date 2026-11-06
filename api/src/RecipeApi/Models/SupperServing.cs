using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("supper_servings")]
public class SupperServing
{
    [Key, Column("date")] public DateOnly Date { get; set; }
    [Column("override_servings")] public int? OverrideServings { get; set; }
    [Column("inherited_servings")] public int? InheritedServings { get; set; }
    [Column("version")] public Guid Version { get; set; } = Guid.NewGuid();
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
}
