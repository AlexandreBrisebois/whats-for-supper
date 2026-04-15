using Microsoft.AspNetCore.Http;
using Moq;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class ValidationServiceTests
{
    private readonly ValidationService _sut = new();

    // ── ValidateImageCount ────────────────────────────────────────────────────

    [Fact]
    public void ValidateImageCount_Rejects_Zero_Images()
    {
        Assert.Throws<ArgumentException>(() => _sut.ValidateImageCount(0));
    }

    [Fact]
    public void ValidateImageCount_Rejects_Over_20_Images()
    {
        Assert.Throws<ArgumentException>(() => _sut.ValidateImageCount(21));
    }

    [Fact]
    public void ValidateImageCount_Accepts_Boundary_Values()
    {
        // Should not throw
        _sut.ValidateImageCount(1);
        _sut.ValidateImageCount(20);
    }

    // ── ValidateRating ────────────────────────────────────────────────────────

    [Theory]
    [InlineData(-1)]
    [InlineData(4)]
    [InlineData(100)]
    public void ValidateRating_Rejects_Invalid_Ratings(int rating)
    {
        Assert.Throws<ArgumentException>(() => _sut.ValidateRating(rating));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public void ValidateRating_Accepts_Valid_Ratings(int rating)
    {
        // Should not throw
        _sut.ValidateRating(rating);
    }

    // ── ValidateFinishedDishImageIndex ────────────────────────────────────────

    [Theory]
    [InlineData(-2, 3)]   // below -1
    [InlineData(3,  3)]   // equal to imageCount (0-based, so out of range)
    [InlineData(5,  3)]   // well beyond imageCount
    public void ValidateFinishedDishImageIndex_Rejects_Out_Of_Range(int index, int imageCount)
    {
        Assert.Throws<ArgumentException>(() => _sut.ValidateFinishedDishImageIndex(index, imageCount));
    }

    [Theory]
    [InlineData(-1, 3)]   // sentinel "none selected"
    [InlineData(0,  3)]   // first image
    [InlineData(2,  3)]   // last image (0-based in 3-image set)
    public void ValidateFinishedDishImageIndex_Accepts_Valid_Index(int index, int imageCount)
    {
        // Should not throw
        _sut.ValidateFinishedDishImageIndex(index, imageCount);
    }

    // ── ValidateImage ─────────────────────────────────────────────────────────

    [Fact]
    public void ValidateImage_Rejects_File_Over_20MB()
    {
        var file = MakeFormFile(length: 21 * 1024 * 1024, contentType: "image/jpeg");

        Assert.Throws<ArgumentException>(() => _sut.ValidateImage(file));
    }

    [Fact]
    public void ValidateImage_Rejects_Empty_File()
    {
        var file = MakeFormFile(length: 0, contentType: "image/jpeg");

        Assert.Throws<ArgumentException>(() => _sut.ValidateImage(file));
    }

    [Theory]
    [InlineData("image/gif")]
    [InlineData("image/bmp")]
    [InlineData("application/octet-stream")]
    [InlineData("text/plain")]
    public void ValidateImage_Rejects_Invalid_Mime_Types(string contentType)
    {
        var file = MakeFormFile(length: 1024, contentType: contentType);

        Assert.Throws<ArgumentException>(() => _sut.ValidateImage(file));
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("image/webp")]
    public void ValidateImage_Accepts_Valid_Mime_Types(string contentType)
    {
        var file = MakeFormFile(length: 1024, contentType: contentType);

        // Should not throw
        _sut.ValidateImage(file);
    }

    [Fact]
    public void ValidateImage_Accepts_File_At_20MB_Boundary()
    {
        var file = MakeFormFile(length: 20 * 1024 * 1024, contentType: "image/jpeg");

        // Should not throw
        _sut.ValidateImage(file);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static IFormFile MakeFormFile(long length, string contentType, string fileName = "test.jpg")
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.Length).Returns(length);
        mock.Setup(f => f.ContentType).Returns(contentType);
        mock.Setup(f => f.FileName).Returns(fileName);
        return mock.Object;
    }
}
