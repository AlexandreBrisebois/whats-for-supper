using Microsoft.Extensions.Configuration;
using Moq;
using RecipeApi.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

[Collection("WorkflowRootResolver")]
public class WorkflowRootResolverTests : IDisposable
{
    public WorkflowRootResolverTests()
    {
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", null);
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", null);
    }

    [Fact]
    public void Root_Returns_EnvVar_When_Set()
    {
        // Arrange
        var expected = "/env/workflows";
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", expected);
        var config = new Mock<IConfiguration>().Object;
        var dataRoot = new DataRootResolver(config);
        var resolver = new WorkflowRootResolver(dataRoot, config);

        // Act
        var result = resolver.Root;

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Root_Returns_Config_When_EnvVar_Not_Set()
    {
        // Arrange
        var expected = "/config/workflows";
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", null);
        
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["WorkflowsRoot"]).Returns(expected);
        
        var dataRoot = new DataRootResolver(mockConfig.Object);
        var resolver = new WorkflowRootResolver(dataRoot, mockConfig.Object);

        // Act
        var result = resolver.Root;

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Root_Returns_Default_When_Neither_Set()
    {
        // Arrange
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", null);
        
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["WorkflowsRoot"]).Returns((string?)null);
        mockConfig.Setup(c => c["DataRoot"]).Returns("/data");
        
        var dataRoot = new DataRootResolver(mockConfig.Object);
        var resolver = new WorkflowRootResolver(dataRoot, mockConfig.Object);

        // Act
        var result = resolver.Root;

        // Assert
        Assert.Equal("/data/workflows", result);
    }
}
