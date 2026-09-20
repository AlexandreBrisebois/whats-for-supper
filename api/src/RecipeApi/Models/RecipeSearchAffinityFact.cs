using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

/// <summary>Bounded, internal recipe facts for the later Search-only rediscovery policy.</summary>
[Table("recipe_search_affinity_facts")]
public class RecipeSearchAffinityFact
{
    [Key]
    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("affinity")]
    public int Affinity { get; set; }

    [Column("last_cooked_on")]
    public DateOnly? LastCookedOn { get; set; }

    [Column("generated_at")]
    public DateTimeOffset GeneratedAt { get; set; }

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }
}
