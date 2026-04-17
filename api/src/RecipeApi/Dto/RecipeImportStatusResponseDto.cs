namespace RecipeApi.Dto;

public class RecipeImportStatusResponseDto
{
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}
