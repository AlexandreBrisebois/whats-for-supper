using System.ComponentModel.DataAnnotations;

namespace RecipeApi.Dto;

public class CreateFamilyMemberDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
