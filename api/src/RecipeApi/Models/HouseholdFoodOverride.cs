using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

// One database is one household. Recovery binds these rows to its captured
// manifest household identity; no synthetic global household UUID is stored.
[Table("household_food_overrides")]
public sealed class HouseholdFoodOverride
{
    [Key, Column("id")] public Guid Id { get; set; }
    [Column("revision")] public string Revision { get; set; } = "";
    [Column("food_id")] public Guid? FoodId { get; set; }
    [Column("dictionary_revision")] public string? DictionaryRevision { get; set; }
    [Column("fallback_key")] public string? FallbackKey { get; set; }
    [Column("shopping_name")] public string? ShoppingName { get; set; }
    [Column("grocery_section")] public string? GrocerySection { get; set; }
    [Column("protected_fields")] public string[] ProtectedFields { get; set; } = [];
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
    [Column("document_revision")] public string? DocumentRevision { get; set; }
    [Column("document_sha256")] public string? DocumentSha256 { get; set; }
    [Column("presentation_sequence")] public string PresentationSequence { get; set; } = "";
}
