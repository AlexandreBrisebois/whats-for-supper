using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class AisleMapperTests
{
    private readonly AisleMapper _mapper = new();

    // ── Unit tests ────────────────────────────────────────────────────────────

    [Fact]
    public void MapToSection_Lettuce_ReturnsProduce()
    {
        Assert.Equal(GrocerySection.Produce, _mapper.MapToSection("lettuce"));
    }

    [Fact]
    public void MapToSection_ChickenBreast_ReturnsMeat()
    {
        Assert.Equal(GrocerySection.Meat, _mapper.MapToSection("chicken breast"));
    }

    [Fact]
    public void MapToSection_Milk_ReturnsDairyAndEggs()
    {
        Assert.Equal(GrocerySection.DairyAndEggs, _mapper.MapToSection("milk"));
    }

    [Fact]
    public void MapToSection_FrozenPeas_ReturnsFrozen()
    {
        Assert.Equal(GrocerySection.Frozen, _mapper.MapToSection("frozen peas"));
    }

    [Fact]
    public void MapToSection_Bread_ReturnsBakery()
    {
        Assert.Equal(GrocerySection.Bakery, _mapper.MapToSection("bread"));
    }

    [Fact]
    public void MapToSection_Broth_ReturnsBeverages_NotPantry()
    {
        Assert.Equal(GrocerySection.Beverages, _mapper.MapToSection("broth"));
    }

    [Fact]
    public void MapToSection_Stock_ReturnsBeverages_NotPantry()
    {
        Assert.Equal(GrocerySection.Beverages, _mapper.MapToSection("stock"));
    }

    [Fact]
    public void MapToSection_Salami_ReturnsDeli()
    {
        Assert.Equal(GrocerySection.Deli, _mapper.MapToSection("salami"));
    }

    [Fact]
    public void MapToSection_Flour_ReturnsPantry()
    {
        Assert.Equal(GrocerySection.Pantry, _mapper.MapToSection("flour"));
    }

    [Fact]
    public void MapToSection_UnknownIngredient_ReturnsGrocery()
    {
        Assert.Equal(GrocerySection.Grocery, _mapper.MapToSection("xyz123"));
    }

    [Fact]
    public void MapToSection_EmptyString_ReturnsGrocery()
    {
        Assert.Equal(GrocerySection.Grocery, _mapper.MapToSection(""));
    }

    [Fact]
    public void MapToSection_WhitespaceOnly_ReturnsGrocery()
    {
        Assert.Equal(GrocerySection.Grocery, _mapper.MapToSection("   "));
    }

    // Longest-match precedence: "chicken" (7 chars, Meat) beats "frozen" (6 chars, Frozen)
    [Fact]
    public void MapToSection_FrozenChicken_ReturnsMeat_LongestMatchWins()
    {
        Assert.Equal(GrocerySection.Meat, _mapper.MapToSection("frozen chicken"));
    }

    // Longest-match precedence: "frozen peas" (11 chars, Frozen) beats "peas" alone
    [Fact]
    public void MapToSection_FrozenPeasExplicit_ReturnsFrozen_LongestMatchWins()
    {
        Assert.Equal(GrocerySection.Frozen, _mapper.MapToSection("frozen peas"));
    }

    [Fact]
    public void MapToSection_Salmon_ReturnsSeafood()
    {
        Assert.Equal(GrocerySection.Seafood, _mapper.MapToSection("salmon"));
    }

    [Fact]
    public void MapToSection_Shrimp_ReturnsSeafood()
    {
        Assert.Equal(GrocerySection.Seafood, _mapper.MapToSection("shrimp"));
    }

    // ── Property-based tests (FsCheck) ────────────────────────────────────────

    // Feature: grocery-section-categorization, Property 1: closed-set section assignment
    // For any ingredient string, MapToSection SHALL return a value that is a member of the
    // defined GrocerySection enum — never a value outside the 9-element set.
    // Validates: Requirements 1.1, 1.4, 6.2
    [Property(MaxTest = 100)]
    public Property P1_ClosedSetSectionAssignment()
    {
        var validSections = Enum.GetValues<GrocerySection>();

        // Generate arbitrary strings including empty, whitespace, and random chars
        var stringGen =
            from length in Gen.Choose(0, 30)
            from chars in Gen.Elements(
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'é', 'è', 'ê', 'à', 'ù', 'ç', 'ô', 'î').ListOf(length)
            select new string(chars.ToArray());

        return Prop.ForAll(stringGen.ToArbitrary(), input =>
        {
            var result = _mapper.MapToSection(input);
            return Array.IndexOf(validSections, result) >= 0;
        });
    }

    // Feature: grocery-section-categorization, Property 2: idempotence
    // For any ingredient string, calling MapToSection twice with the same input SHALL return
    // the same GrocerySection — the function has no side effects and no mutable state.
    // Validates: Requirements 6.3
    [Property(MaxTest = 100)]
    public Property P2_Idempotence()
    {
        var stringGen =
            from length in Gen.Choose(0, 30)
            from chars in Gen.Elements(
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'é', 'è', 'ê', 'à', 'ù', 'ç', 'ô', 'î').ListOf(length)
            select new string(chars.ToArray());

        return Prop.ForAll(stringGen.ToArbitrary(), input =>
        {
            var first = _mapper.MapToSection(input);
            var second = _mapper.MapToSection(input);
            return first == second;
        });
    }

    // Feature: grocery-section-categorization, Property 10: keyword membership implies correct section
    // For any canonical name that contains a keyword from a known section's keyword set
    // (and no longer keyword from a competing section), AisleMapper.MapToSection SHALL return
    // that section — keyword membership is a sufficient condition for section assignment.
    // Validates: Requirements 4.1–4.7
    [Property(MaxTest = 100)]
    public Property P10_KeywordMembershipImpliesSection()
    {
        // Representative unambiguous keywords per section (no competing longer keyword in another section)
        var unambiguousKeywords = new (string keyword, GrocerySection expectedSection)[]
        {
            // Produce — keywords that don't appear in other sections
            ("lettuce", GrocerySection.Produce),
            ("carrot", GrocerySection.Produce),
            ("zucchini", GrocerySection.Produce),
            ("avocado", GrocerySection.Produce),
            ("cauliflower", GrocerySection.Produce),
            // Meat — keywords that don't appear in other sections
            ("beef", GrocerySection.Meat),
            ("lamb", GrocerySection.Meat),
            ("turkey", GrocerySection.Meat),
            ("venison", GrocerySection.Meat),
            // Seafood — keywords that don't appear in other sections
            ("shrimp", GrocerySection.Seafood),
            ("lobster", GrocerySection.Seafood),
            ("scallop", GrocerySection.Seafood),
            ("halibut", GrocerySection.Seafood),
            // DairyAndEggs — keywords that don't appear in other sections
            ("yogurt", GrocerySection.DairyAndEggs),
            ("cheddar", GrocerySection.DairyAndEggs),
            ("mozzarella", GrocerySection.DairyAndEggs),
            ("kefir", GrocerySection.DairyAndEggs),
            // Frozen — keywords that don't appear in other sections
            ("gelato", GrocerySection.Frozen),
            ("sorbet", GrocerySection.Frozen),
            ("edamame", GrocerySection.Frozen),
            // Bakery — keywords that don't appear in other sections
            ("sourdough", GrocerySection.Bakery),
            ("focaccia", GrocerySection.Bakery),
            ("brioche", GrocerySection.Bakery),
            ("baguette", GrocerySection.Bakery),
            // Beverages — broth/stock intentionally here, not Pantry
            ("broth", GrocerySection.Beverages),
            ("stock", GrocerySection.Beverages),
            ("cider", GrocerySection.Beverages),
            ("coffee", GrocerySection.Beverages),
            // Deli — keywords that don't appear in other sections
            ("hummus", GrocerySection.Deli),
            ("pastrami", GrocerySection.Deli),
            ("pepperoni", GrocerySection.Deli),
            ("prosciutto", GrocerySection.Deli),
            // Pantry — keywords that don't appear in other sections
            ("flour", GrocerySection.Pantry),
            ("vinegar", GrocerySection.Pantry),
            ("sugar", GrocerySection.Pantry),
        };

        // Generate a random index into the unambiguous keyword table
        var gen =
            from idx in Gen.Choose(0, unambiguousKeywords.Length - 1)
            select unambiguousKeywords[idx];

        return Prop.ForAll(gen.ToArbitrary(), pair =>
        {
            var (keyword, expectedSection) = pair;
            // The canonical name IS the keyword — no competing longer keyword from another section
            var result = _mapper.MapToSection(keyword);
            return result == expectedSection;
        });
    }
}
