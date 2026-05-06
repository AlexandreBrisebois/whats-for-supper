namespace RecipeApi.Dto;

public class ToggleGroceryItemDto
{
    public string IngredientName { get; set; } = string.Empty;
    public bool Checked { get; set; }
}
