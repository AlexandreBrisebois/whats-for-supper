using System.Globalization;
using System.Text.Json;
using Xunit;

namespace RecipeApi.Tests.Integration;

internal static class GroceryQuantityAssertions
{
    // These integration fixtures use whole-gram scalars. Assert the exact wire
    // representation so a legacy numeric response or a range cannot pass.
    internal static double ExactScalar(this JsonElement quantity)
    {
        Assert.Equal("scalar", quantity.GetProperty("kind").GetString());
        var value = quantity.GetProperty("value");
        Assert.Equal("1", value.GetProperty("d").GetString());
        return double.Parse(value.GetProperty("n").GetString()!, CultureInfo.InvariantCulture);
    }
}
