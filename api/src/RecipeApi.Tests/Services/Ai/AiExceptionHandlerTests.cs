using System.ClientModel;
using System.ClientModel.Primitives;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Services.Ai;
using Xunit;

namespace RecipeApi.Tests.Services.Ai;

public class AiExceptionHandlerTests
{
    private readonly AiExceptionHandler _handler;
    private readonly Mock<ILogger<AiExceptionHandler>> _loggerMock;

    public AiExceptionHandlerTests()
    {
        _loggerMock = new Mock<ILogger<AiExceptionHandler>>();
        _handler = new AiExceptionHandler(_loggerMock.Object);
    }

    [Fact]
    public void IsTransient_ShouldReturnTrue_For503ClientResultException()
    {
        // Arrange
        var mockResponse = new Mock<PipelineResponse>();
        mockResponse.SetupGet(r => r.Status).Returns(503);
        var ex = new ClientResultException(mockResponse.Object);

        // Act
        var result = _handler.IsTransient(ex);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsTransient_ShouldReturnFalse_For400ClientResultException()
    {
        // Arrange
        var mockResponse = new Mock<PipelineResponse>();
        mockResponse.SetupGet(r => r.Status).Returns(400);
        var ex = new ClientResultException(mockResponse.Object);

        // Act
        var result = _handler.IsTransient(ex);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsTransient_ShouldReturnTrue_ForTimeoutException()
    {
        // Arrange
        var ex = new TimeoutException("Operation timed out");

        // Act
        var result = _handler.IsTransient(ex);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsTransient_ShouldReturnTrue_ForTaskCanceledException_WithTimeout()
    {
        // Arrange
        var ex = new TaskCanceledException("The request was canceled due to the configured HttpClient.Timeout of 300 seconds elapsing.");

        // Act
        var result = _handler.IsTransient(ex);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsTransient_ShouldReturnTrue_ForHtmlErrorResponse()
    {
        // Arrange
        var ex = new Exception("The provider returned an error: <!DOCTYPE html><html>...</html>");

        // Act
        var result = _handler.IsTransient(ex);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsTransient_ShouldReturnTrue_ForHttpRequestException_408()
    {
        // Arrange
        var ex = new HttpRequestException("Request timeout", null, System.Net.HttpStatusCode.RequestTimeout);

        // Act
        var result = _handler.IsTransient(ex);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void MapException_ShouldCaptureStatusCode()
    {
        // Arrange
        var mockResponse = new Mock<PipelineResponse>();
        mockResponse.SetupGet(r => r.Status).Returns(503);
        var ex = new ClientResultException(mockResponse.Object);

        // Act
        var detail = _handler.MapException(ex, "test-model");

        // Assert
        Assert.Equal(503, detail.StatusCode);
        Assert.Equal("test-model", detail.ModelId);
        Assert.Equal("OpenAI/Gemini", detail.Provider);
    }
}
