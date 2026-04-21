using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Utils;

public class JsonUtilsTests
{
    [Theory]
    [InlineData("{\"name\": \"Test\"}", "{\"name\": \"Test\"}")]
    [InlineData("```json\n{\"name\": \"Test\"}\n```", "{\"name\": \"Test\"}")]
    [InlineData("Preamble {\"name\": \"Test\"} Postamble", "{\"name\": \"Test\"}")]
    [InlineData("[\"item1\", \"item2\"]", "[\"item1\", \"item2\"]")]
    [InlineData("```\n[\"item1\", \"item2\"]\n```", "[\"item1\", \"item2\"]")]
    [InlineData("Here is the JSON: {\n  \"key\": \"value\"\n}\nHope this helps!", "{\n  \"key\": \"value\"\n}")]
    public void SanitizeJson_ShouldExtractJson_WhenValidBracesExist(string input, string expected)
    {
        // Act
        var result = JsonUtils.SanitizeJson(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("", "")]
    [InlineData("   ", "   ")]
    [InlineData("no braces here", "no braces here")]
    public void SanitizeJson_ShouldReturnInput_WhenNoBracesExist(string input, string expected)
    {
        // Act
        var result = JsonUtils.SanitizeJson(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void SanitizeJson_ShouldHandleMalformedMarkdown_FromScratchTest()
    {
        // This test case is inspired by the user's scratch/test_json_extraction.cs
        string json = @"
```json
{
  ""name"": ""Test"",
  ""recipeInstructions"": [
    {
      ""text"": ""Step 1""
    }
  ]
}
```
";
        string expected = @"{
  ""name"": ""Test"",
  ""recipeInstructions"": [
    {
      ""text"": ""Step 1""
    }
  ]
}";
        // Act
        var result = JsonUtils.SanitizeJson(json);

        // Assert
        Assert.Equal(expected.Trim(), result.Trim());
    }
}
