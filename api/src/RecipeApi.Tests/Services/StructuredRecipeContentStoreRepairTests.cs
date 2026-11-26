using System.Reflection;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class StructuredRecipeContentStoreRepairTests
{
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    private static RecipePublicationFields Observe(Recipe recipe) =>
        (RecipePublicationFields)typeof(StructuredRecipeContentStore)
            .GetMethod("Observe", BindingFlags.NonPublic | BindingFlags.Static)!
            .Invoke(null, [recipe])!;

    private static StructuredRecipeExport PreparePhotoIngredientRepair(RecipePublicationFields captured, string raw, string revision)
    {
        try
        {
            return (StructuredRecipeExport)typeof(StructuredRecipeContentStore)
                .GetMethod("PreparePhotoIngredientRepair", BindingFlags.NonPublic | BindingFlags.Static)!
                .Invoke(null, [captured, raw, revision])!;
        }
        catch (TargetInvocationException ex) when (ex.InnerException is not null)
        {
            System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(ex.InnerException).Throw();
            throw;
        }
    }

    private static FoodMappingPreparation PrepareCapturedPhotoRepair(
        StructuredRecipeExport export, FoodVocabularyAuthority authority,
        Guid operationId, StructuredRecipeContent priorContent, string? priorEvidence, string? sourceUrl = null)
    {
        try
        {
            return (FoodMappingPreparation)typeof(FoodMappingQualification)
                .GetMethod("PrepareCapturedPhotoRepair", BindingFlags.NonPublic | BindingFlags.Static)!
                .Invoke(null, [export, authority, operationId, priorContent, priorEvidence, sourceUrl])!;
        }
        catch (TargetInvocationException ex) when (ex.InnerException is not null)
        {
            System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(ex.InnerException).Throw();
            throw;
        }
    }

    private static FoodVocabularyAuthority CreateFixtureAuthority()
    {
        var bytes = File.ReadAllBytes(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        var reference = new FoodVocabularyReference("fixture-three-anchor-v1", FoodVocabularyDefinitions.Sha256(bytes));
        return new FoodVocabularyAuthority(reference, [new(reference, 1, bytes)]);
    }

    [Fact]
    public void PreparePhotoIngredientRepair_SourceOnlyChangedDescriptionsAndMembership_ReconcilesAndQualifies()
    {
        var recipeId = Guid.NewGuid();
        var authority = CreateFixtureAuthority();
        const string initialRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "One-Pan Chicken and Orzo",
              "recipeYield": "4 portions",
              "recipeIngredient": ["2 Chicken Breasts *", "270 g Chicken Thighs", "170 g Orzo", "1 tomato"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "1. Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Cook chicken and orzo." }] }
              ]
            }
            """;

        var (initialContent, initialEvidence) = StructuredRecipeContentStore.FromSchemaOrg(
            recipeId, initialRaw, sourceUrl: null, authority: authority, operationId: Guid.NewGuid(), origin: "source");
        var orzoId = initialContent.IngredientLines.Single(l => l.Description == "Orzo").Id;

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "One-Pan Chicken and Orzo",
            RawMetadata = initialRaw,
            StructuredContent = JsonSerializer.Serialize(initialContent, WebJson),
            FoodMappingEvidence = initialEvidence,
            Servings = initialContent.Servings
        };
        var captured = Observe(recipe);

        const string repairedRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "One-Pan Chicken and Orzo",
              "recipeYield": "2 portions",
              "recipeIngredient": ["2 Chicken Breasts", "170 g Orzo", "3 cups warm water", "0.5 tbsp oil", "1 onion"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "1. Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Cook chicken and orzo." }] }
              ]
            }
            """;

        var prepared = PreparePhotoIngredientRepair(captured, repairedRaw, "repair-rev-1");
        var qualified = PrepareCapturedPhotoRepair(
            prepared, authority, Guid.NewGuid(), initialContent, initialEvidence, sourceUrl: null);

        var lines = qualified.Export.Content.IngredientLines;
        Assert.Equal(2, qualified.Export.Content.Servings);
        Assert.Contains(lines, l => l.Description == "Chicken Breasts");
        Assert.DoesNotContain(lines, l => l.Description.Contains('*'));
        Assert.DoesNotContain(lines, l => l.Description == "Chicken Thighs");
        Assert.Contains(lines, l => l.Description == "Orzo" && l.Id == orzoId);
        Assert.Contains(lines, l => l.Description == "warm water");
        Assert.Contains(lines, l => l.Description == "oil");
        var onionLine = Assert.Single(lines, l => l.Description == "onion");
        Assert.Equal(Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee"), onionLine.Shopping.FoodId);
        Assert.NotNull(qualified.Evidence);
    }

    [Fact]
    public void PreparePhotoIngredientRepair_MixedHumanProtectedAndChangedSource_PreservesHumanAndRepairsSource()
    {
        var recipeId = Guid.NewGuid();
        var authority = CreateFixtureAuthority();
        const string initialRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Tomato Chicken",
              "recipeYield": "4 portions",
              "recipeIngredient": ["500 g tomatoes", "2 Chicken Breasts *", "270 g Chicken Thighs"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "1. Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Cook together." }] }
              ]
            }
            """;

        var (initialContent, initialEvidence) = StructuredRecipeContentStore.FromSchemaOrg(
            recipeId, initialRaw, sourceUrl: null, authority: authority, operationId: Guid.NewGuid(), origin: "source");

        var editedFirst = initialContent.IngredientLines[0] with
        {
            Description = "heirloom tomatoes",
            Provenance = initialContent.IngredientLines[0].Provenance with
            {
                Origin = "human",
                ProtectedFields = ["description", "amount", "amountText", "unit"]
            }
        };
        var addedHuman = new RecipeIngredientLineDto
        {
            Id = Guid.NewGuid(),
            Description = "secret spice",
            Amount = QuantityMath.Parse("1"),
            AmountText = "1",
            Unit = new RecipeUnitDto("pinch", null),
            Scaling = "proportional",
            Package = null,
            Shopping = new RecipeShoppingAssociationDto("secret spice", null, null),
            Provenance = new RecipeIngredientProvenanceDto("human", null, ["description", "amount", "amountText", "unit", "scaling", "package", "shopping"])
        };

        var currentContent = initialContent with
        {
            ContentRevision = "human-edit-rev",
            IngredientLines = [editedFirst, initialContent.IngredientLines[1], initialContent.IngredientLines[2], addedHuman]
        };
        var qualifiedPrior = FoodMappingQualification.Prepare(
            new StructuredRecipeExport(recipeId, currentContent, initialRaw), authority, Guid.NewGuid(), initialContent, initialEvidence);
        currentContent = qualifiedPrior.Export.Content;

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Tomato Chicken",
            RawMetadata = initialRaw,
            StructuredContent = JsonSerializer.Serialize(currentContent, WebJson),
            FoodMappingEvidence = qualifiedPrior.Evidence,
            Servings = currentContent.Servings
        };
        var captured = Observe(recipe);

        const string repairedRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Tomato Chicken",
              "recipeYield": "2 portions",
              "recipeIngredient": ["500 g tomatoes", "2 Chicken Breasts", "1 tbsp oil"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "1. Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Cook together." }] }
              ]
            }
            """;

        var prepared = PreparePhotoIngredientRepair(captured, repairedRaw, "repair-rev-2");
        var qualified = PrepareCapturedPhotoRepair(
            prepared, authority, Guid.NewGuid(), currentContent, qualifiedPrior.Evidence, sourceUrl: null);

        var lines = qualified.Export.Content.IngredientLines;
        Assert.Equal(4, qualified.Export.Content.Servings);
        Assert.Equal("heirloom tomatoes", Assert.Single(lines, l => l.Id == editedFirst.Id).Description);
        Assert.DoesNotContain(lines, l => l.Description == "tomatoes");
        Assert.Contains(lines, l => l.Id == addedHuman.Id && l.Description == "secret spice");
        Assert.Contains(lines, l => l.Description == "Chicken Breasts");
        Assert.DoesNotContain(lines, l => l.Description.Contains('*'));
        Assert.DoesNotContain(lines, l => l.Description == "Chicken Thighs");
        Assert.Contains(lines, l => l.Description == "oil");
    }

    [Fact]
    public void PreparePhotoIngredientRepair_ProtectedClearMapping_SurvivesSourceMembershipRepair()
    {
        var recipeId = Guid.NewGuid();
        var authority = CreateFixtureAuthority();
        const string initialRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Onion Chicken",
              "recipeYield": "2 portions",
              "recipeIngredient": ["1 onion", "2 Chicken Breasts *"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "1. Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Cook chicken with onion." }] }
              ]
            }
            """;

        var (initialContent, initialEvidence) = StructuredRecipeContentStore.FromSchemaOrg(
            recipeId, initialRaw, sourceUrl: null, authority: authority, operationId: Guid.NewGuid(), origin: "source");

        var clearedOnion = initialContent.IngredientLines[0] with
        {
            Shopping = new RecipeShoppingAssociationDto("onion", null, null),
            Provenance = new RecipeIngredientProvenanceDto(
                "human",
                initialContent.IngredientLines[0].Provenance.SourceRef,
                ["description", "amount", "amountText", "unit", "scaling", "package", "shopping"])
        };
        var editedContent = initialContent with
        {
            ContentRevision = "clear-mapping-rev",
            IngredientLines = [clearedOnion, initialContent.IngredientLines[1]]
        };
        var qualifiedClear = FoodMappingQualification.Prepare(
            new StructuredRecipeExport(recipeId, editedContent, initialRaw), authority, Guid.NewGuid(), initialContent, initialEvidence);
        var currentContent = qualifiedClear.Export.Content;

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Onion Chicken",
            RawMetadata = initialRaw,
            StructuredContent = JsonSerializer.Serialize(currentContent, WebJson),
            FoodMappingEvidence = qualifiedClear.Evidence,
            Servings = currentContent.Servings
        };
        var captured = Observe(recipe);

        const string repairedRaw = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Onion Chicken",
              "recipeYield": "2 portions",
              "recipeIngredient": ["1 onion", "2 Chicken Breasts", "1 tbsp oil"],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "1. Cook", "itemListElement": [{ "@type": "HowToStep", "text": "Cook chicken with onion." }] }
              ]
            }
            """;

        var prepared = PreparePhotoIngredientRepair(captured, repairedRaw, "repair-rev-3");
        var qualified = PrepareCapturedPhotoRepair(
            prepared, authority, Guid.NewGuid(), currentContent, qualifiedClear.Evidence, sourceUrl: null);

        var repairedOnion = Assert.Single(qualified.Export.Content.IngredientLines, l => l.Id == clearedOnion.Id);
        Assert.Null(repairedOnion.Shopping.FoodId);
        Assert.Null(repairedOnion.Shopping.MappingRevision);
        Assert.Contains(qualified.Decisions, d => d.IngredientLineId == clearedOnion.Id && d.Kind == "protected_clear");
        Assert.Contains(qualified.Export.Content.IngredientLines, l => l.Description == "Chicken Breasts");
        Assert.Contains(qualified.Export.Content.IngredientLines, l => l.Description == "oil");
    }
}
