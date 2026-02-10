# WhatsForSupper.Import.Exploration

This project contains exploratory tests for extracting recipes from images with Gemini. Tests rely on user secrets so that keys and paths do not get checked into source.

## Configure user secrets

The project already has a `UserSecretsId` (`337d2740-bd1c-4da8-9bbe-2e3f44c1f674`). From the `WhatsForSupper.Import.Exploration` folder run:

```bash
dotnet user-secrets set GEMINI_PROJECT_ID "your-gcp-project-id"
dotnet user-secrets set GEMINI_API_KEY "your-gemini-api-key"
dotnet user-secrets set RECIPE_IMAGE_ROOT "C:\\path\\to\\recipe-images"
```

Values used by `ExtractRecipeFromImagesWithGoogleGenAITest`:

- `GEMINI_PROJECT_ID`: Google Cloud project that has access to Gemini.
- `GEMINI_API_KEY`: API key with permissions to call the Gemini model.
- `RECIPE_IMAGE_ROOT`: Directory containing the recipe images used by the test (e.g., the two `*_0.jpg` and `*_1.jpg` files). Ensure the directory exists; otherwise the test will throw `DirectoryNotFoundException`.

To verify your configuration:

```bash
dotnet user-secrets list
```

Then run the tests (from the repository root or this project directory):

```bash
dotnet test WhatsForSupper.Import.Exploration/WhatsForSupper.Import.Exploration.csproj
```
