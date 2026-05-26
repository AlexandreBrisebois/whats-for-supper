using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DemoModeOptionsTests
{
    [Fact]
    public void Enabled_WhenDemoModeValueInvalid_LogsWarningWithRawValue()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DEMO_MODE"] = "definitely" })
            .Build();
        var logger = new Mock<ILogger<DemoModeOptions>>();
        var options = new DemoModeOptions(configuration, logger.Object);

        var enabled = options.Enabled;

        Assert.False(enabled);
        logger.Verify(
            l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((state, _) => state.ToString()!.Contains("definitely")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
