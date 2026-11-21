using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("grocery_mutation_outcomes")]
public sealed class GroceryMutationOutcome
{
    [Key, Column("id")] public Guid Id { get; set; }
    [Column("input_hash")] public string InputHash { get; set; } = "";
    [Column("week_start_date")] public DateOnly WeekStartDate { get; set; }
    [Column("outcome", TypeName = "jsonb")] public string Outcome { get; set; } = "";
}
