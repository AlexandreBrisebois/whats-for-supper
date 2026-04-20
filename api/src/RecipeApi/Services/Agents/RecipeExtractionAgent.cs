using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using RecipeApi.Models;

namespace RecipeApi.Services.Agents;

public class RecipeExtractionAgent(
    IChatClient chatClient,
    IConfiguration configuration,
    ILogger<RecipeExtractionAgent> logger)
{
    private string RecipesRoot =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? "/data/recipes";

    private const string SystemPrompt = @"
Role: You are a specialized High-Precision Data Extraction Agent. Your task is to process multiple images of a recipe card and synthesize them into a single, valid schema.org/Recipe JSON object.

0. LOGICAL PRE-PROCESSING (Thinking Phase):
   Spatial Mapping: Identify the two numeric columns in the ingredients table. The first column corresponds to 2 servings (2P); the second to 3 servings.
   Unit Reconciliation: If a row lacks a unit (e.g., ""1 | 2 Ginger""), scan the ""Preparation"" steps for the corresponding measurement (e.g., ""1 tsp of ginger"").
   Constraint: Use the 2P (first value) exclusively for all quantities and recipe yields.

1. STRICT OUTPUT FORMAT:
   Return ONLY a raw JSON object.
   No markdown code blocks (no ```json). No preamble. No conversational filler.
   If data is missing or illegible, use null.

2. DATA MAPPING RULES:
   name: The primary title of the recipe (e.g., ""Korean Bulgogi Chicken"").
   recipeYield: Hardcode to ""2 servings"".
   recipeIngredient:
   - Output as an array of strings.
   - Format: ""[Quantity] [Unit] [Ingredient Name]"" (e.g., ""30 ml Soy Sauce"").
   supply:
   - Output as an array of HowToSupply objects.
   - For each ingredient, extract the quantity into QuantitativeValue.
   - name: The name of the ingredient.
   - requiredQuantity: { ""@type"": ""QuantitativeValue"", ""value"": [number], ""unitText"": ""[unit]"" }
   recipeInstructions:
   - Use HowToSection to group steps by their headers (e.g., ""Setup"", ""Marinate the chicken"").
   - Within each section, provide an itemListElement array of HowToStep objects.
   - Crucial: Sanitized quantities. Replace references like ""1.5^2P | 2^3P"" with just the 2P value ""1.5"". Remove all superscripts.
   Time (ISO 8601): Convert minutes to ISO format (e.g., ""35 minutes"" -> PT35M). Map ""Preparation/Total time"" to totalTime.
   Nutrition (NutritionInformation): Map footer values to: calories, fatContent, saturatedFatContent, sodiumContent, carbohydrateContent, fiberContent, sugarContent, proteinContent. Include units (e.g., ""39 g"").

3. TECHNICAL SCHEMA STRUCTURE:
   Ensure the final object includes:
   {
     ""@context"": ""https://schema.org/"",
     ""@type"": ""Recipe"",
     ""name"": """",
     ""recipeYield"": ""2 servings"",
     ""totalTime"": ""PT...M"",
     ""recipeIngredient"": [],
     ""supply"": [{ ""@type"": ""HowToSupply"", ""name"": """", ""requiredQuantity"": { ""@type"": ""QuantitativeValue"", ""value"": 0, ""unitText"": """" } }],
     ""recipeInstructions"": [{""@type"": ""HowToSection"", ""name"": """", ""itemListElement"": []}],
     ""nutrition"": {""@type"": ""NutritionInformation"", ""calories"": """", ""..."": """"},
     ""suggestedPairing"": """"
   }

4. RESOLUTION AWARENESS:
   Gemma4:e4b uses high-fidelity vision processing. Carefully distinguish between ml, g, tsp, and tbsp. If a quantity is ambiguous, prioritize the value written in the ""Preparation"" text over the table.
";

    public async Task<SchemaOrgRecipe?> ExtractRecipe(Guid recipeId)
    {
        var originalDir = Path.Combine(RecipesRoot, recipeId.ToString(), "original");
        if (!Directory.Exists(originalDir))
        {
            logger.LogWarning("Original images directory not found for recipe {RecipeId} at {Directory}", recipeId, originalDir);
            return null;
        }

        var imageFiles = Directory.GetFiles(originalDir)
            .Where(f => f.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                        f.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                        f.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
            .OrderBy(f => f)
            .ToList();

        if (imageFiles.Count == 0)
        {
            logger.LogWarning("No images found for recipe {RecipeId} in {Directory}", recipeId, originalDir);
            return null;
        }

        logger.LogInformation("Extracting recipe {RecipeId} from {Count} images.", recipeId, imageFiles.Count);

        // Build the multi-modal message
        var message = new ChatMessage(ChatRole.User, "Please extract the recipe from these images as instructed.");

        foreach (var imagePath in imageFiles)
        {
            var bytes = await File.ReadAllBytesAsync(imagePath);
            var mimeType = GetMimeType(imagePath);
            message.Contents.Add(new DataContent(bytes, mimeType));
        }

        // Initialize the Agent
        var agent = chatClient.AsAIAgent(
            name: "RecipeExtractor",
            instructions: SystemPrompt
        );

        try
        {
            // Execute the agent call with low temperature for precision
            // Note: Microsoft.Agents.AI 1.0.0-rc1 ChatClientAgent's RunAsync
            // takes IEnumerable<ChatMessage>.
            var response = await agent.RunAsync(
                new[] { message },
                options: new ChatClientAgentRunOptions
                {
                    ChatOptions = new ChatOptions { Temperature = 0.0f }
                });

            var json = response.Text;

            // Clean up possible markdown wrappers if the LLM ignored the instructions
            if (json.StartsWith("```json"))
            {
                json = json.Substring(7);
                if (json.EndsWith("```"))
                {
                    json = json.Substring(0, json.Length - 3);
                }
            }
            json = json.Trim();

            // Save recipe.json to the recipe folder
            var outputPath = Path.Combine(RecipesRoot, recipeId.ToString(), "recipe.json");
            await File.WriteAllTextAsync(outputPath, json);
            logger.LogInformation("Saved extracted recipe to {Path}", outputPath);

            return JsonSerializer.Deserialize<SchemaOrgRecipe>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to extract recipe {RecipeId}", recipeId);
            throw;
        }
    }

    private string GetMimeType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };
    }
}
