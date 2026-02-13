using System.Text.Json.Serialization;

namespace Agent.Models;

public class Recipe
{
    [JsonPropertyName("@context")]
    public string? Context { get; set; }
    
    [JsonPropertyName("@type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("author")]
    public object? Author { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("totalTime")]
    public string? TotalTime { get; set; }
    
    [JsonPropertyName("recipeYield")]
    public string? RecipeYield { get; set; }
    
    [JsonPropertyName("keywords")]
    public object? Keywords { get; set; }
    
    [JsonPropertyName("recipeIngredient")]
    public string[]? RecipeIngredients { get; set; }
    
    [JsonPropertyName("nutrition")]
    public Nutrition? Nutrition { get; set; }
    
    [JsonPropertyName("recipeInstructions")]
    public RecipeInstructions[]? RecipeInstructions { get; set; }
}

public class Nutrition
{
    [JsonPropertyName("@type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("calories")]
    public string? Calories { get; set; }
    
    [JsonPropertyName("fatContent")]
    public string? FatContent { get; set; }
    
    [JsonPropertyName("saturatedFatContent")]
    public string? SaturatedFatContent { get; set; }
    
    [JsonPropertyName("transFatContent")]
    public string? TransFatContent { get; set; }
    
    [JsonPropertyName("cholesterolContent")]
    public string? CholesterolContent { get; set; }
    
    [JsonPropertyName("sodiumContent")]
    public string? SodiumContent { get; set; }
    
    [JsonPropertyName("carbohydrateContent")]
    public string? CarbohydrateContent { get; set; }
    
    [JsonPropertyName("fiberContent")]
    public string? FiberContent { get; set; }
    
    [JsonPropertyName("sugarContent")]
    public string? SugarContent { get; set; }
    
    [JsonPropertyName("proteinContent")]
    public string? ProteinContent { get; set; }
}

public class RecipeInstructions
{
    [JsonPropertyName("@type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("itemListElement")]
    public ItemListElement[]? ItemListElements { get; set; }
}

public class ItemListElement
{
    [JsonPropertyName("@type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

