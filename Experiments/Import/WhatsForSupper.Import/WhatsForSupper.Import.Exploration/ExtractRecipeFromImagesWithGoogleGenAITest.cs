using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Configuration;
using System.IO;
using Xunit.Abstractions;
using File = System.IO.File;

namespace WhatsForSupper.Import.Exploration
{
    public class ExtractRecipeFromImagesWithGoogleGenAITest
    {
        private readonly ITestOutputHelper _output;
        private readonly IConfiguration _configuration;
        private readonly string _projectId;
        private readonly string _apiKey;

        public ExtractRecipeFromImagesWithGoogleGenAITest(ITestOutputHelper output)
        {
            _output = output;

            _configuration = new ConfigurationBuilder()
                .AddUserSecrets<ExtractRecipeFromImagesWithGoogleGenAITest>()
                .Build();

            _projectId = _configuration["GEMINI_PROJECT_ID"]
                         ?? throw new InvalidOperationException("Set GEMINI_PROJECT_ID in user secrets before running the tests.");

            _apiKey = _configuration["GEMINI_API_KEY"]
                     ?? throw new InvalidOperationException("Set GEMINI_API_KEY before running the tests.");
        }

        [Fact]
        public async Task ExtractRecipeFromImagesWithGemini()
        {
            var imageRoot = _configuration["RECIPE_IMAGE_ROOT"];

            if (!Directory.Exists(imageRoot))
            {
                throw new DirectoryNotFoundException($"Image directory not found: {imageRoot}. Set RECIPE_IMAGE_ROOT in user secrets or place images under an 'originals' folder next to the project file.");
            }

            var imagePaths = new[]
            {
                Path.Combine(imageRoot, "2f503c5a6a44420b8fa728d598c858d5_0.jpg"),
                Path.Combine(imageRoot, "2f503c5a6a44420b8fa728d598c858d5_1.jpg")
            };

            var modelId = "models/gemini-2.5-pro";

            string promptPath = Path.Combine(AppContext.BaseDirectory, "prompts/extract-recipe-prompt.md");

            if (!File.Exists(promptPath))
            {
                throw new FileNotFoundException($"Prompt file not found at {promptPath}. Ensure prompts are available locally.");
            }

            string recipePrompt = await File.ReadAllTextAsync(promptPath);

            Client client = new(apiKey: _apiKey);

            var content = new Content
            {
                Role = "user",
                Parts =
                [
                    new Part
                    {
                        Text = recipePrompt
                    }
                ]
            };

            foreach (var path in imagePaths)
            {
                var imageBytes = await File.ReadAllBytesAsync(path);
                content.Parts.Add(new Part
                {
                    InlineData = new Blob
                    {
                        Data = imageBytes,
                        MimeType = "image/jpeg"
                    }
                });
            }

            var response = await client.Models.GenerateContentAsync(modelId, content);

            var candidate = response.Candidates.FirstOrDefault();

            _output.WriteLine(candidate?.Content?.Parts?.FirstOrDefault()?.Text ?? string.Empty);

        }
    }
}