using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class PdfRenderLimitsTests
{
    [Fact]
    public void Qualified_profile_checks_dimensions_before_native_render()
    {
        var limits = new PdfRenderLimits(200, 4096, 12000000, 128 * 1024 * 1024, 512 * 1024 * 1024, 60);
        limits.ValidatePage(612, 792);
        Assert.Throws<InvalidDataException>(() => limits.ValidatePage(100000, 100000));
        Assert.Throws<InvalidDataException>(() => limits.ValidatePage(double.NaN, 792));
        Assert.Throws<InvalidDataException>(() => limits.ValidatePage(0, 792));
    }

    [Fact]
    public void Production_profile_matches_the_measured_200_DPI_limits()
    {
        Assert.Equal(new PdfRenderLimits(200, 4096, 16777216, 67108864, 536870912, 60), PdfRenderLimits.Default);
        PdfRenderLimits.Default.ValidatePage(612, 792);
    }

    [Theory]
    [InlineData(0, 792)]
    [InlineData(-1, 792)]
    [InlineData(double.NaN, 792)]
    [InlineData(double.PositiveInfinity, 792)]
    [InlineData(2000, 792)]
    [InlineData(612, 2000)]
    public void Production_profile_rejects_invalid_or_oversized_pages(double width, double height)
    {
        Assert.Throws<InvalidDataException>(() => PdfRenderLimits.Default.ValidatePage(width, height));
    }

    [Fact]
    public void Explicit_test_profile_can_exercise_the_pixel_guard_without_changing_the_default()
    {
        var limited = PdfRenderLimits.Default with { MaxPixels = 100 };
        Assert.Throws<InvalidDataException>(() => limited.ValidatePage(612, 792));
        PdfRenderLimits.Default.ValidatePage(612, 792);
    }
}
