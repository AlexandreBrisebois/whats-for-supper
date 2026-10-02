using Microsoft.Extensions.Configuration;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class PdfRenderLimitsTests
{
    [Fact]
    public void Unmeasured_limits_are_not_silently_selected()
    {
        Assert.Throws<InvalidOperationException>(() => PdfRenderLimits.Read(new ConfigurationBuilder().Build()));
    }

    [Fact]
    public void Qualified_profile_checks_dimensions_before_native_render()
    {
        var limits = new PdfRenderLimits(200, 4096, 12000000, 128 * 1024 * 1024, 512 * 1024 * 1024, 60);
        limits.ValidatePage(612, 792);
        Assert.Throws<InvalidDataException>(() => limits.ValidatePage(100000, 100000));
        Assert.Throws<InvalidDataException>(() => limits.ValidatePage(double.NaN, 792));
        Assert.Throws<InvalidDataException>(() => limits.ValidatePage(0, 792));
    }
}
