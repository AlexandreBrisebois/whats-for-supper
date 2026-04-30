using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace RecipeApi.Models;

[Table("family_settings")]
public class FamilySetting
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("key")]
    public string Key { get; set; } = string.Empty;

    [Column("value", TypeName = "jsonb")]
    public JsonElement Value { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
