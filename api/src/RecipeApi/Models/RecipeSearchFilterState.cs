using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

/// <summary>One replaceable household snapshot for filter-discovery cuisine metadata.</summary>
[Table("recipe_search_filter_state")]
public class RecipeSearchFilterState
{
    public const int SingletonId = 1;

    [Key]
    [Column("id")]
    public int Id { get; set; } = SingletonId;

    [Column("generated_at")]
    public DateTimeOffset GeneratedAt { get; set; }

    [Column("cuisine_payload", TypeName = "jsonb")]
    public string CuisinePayload { get; set; } = "{}";
}
