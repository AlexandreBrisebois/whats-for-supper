namespace RecipeApi.Services;

public class ValidationService
{
    private const long MaxImageSizeBytes = 20 * 1024 * 1024; // 20 MB
    private const int MaxImageCount = 20;

    private static readonly HashSet<string> AllowedMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    /// <summary>Validates a single uploaded image file. Throws ArgumentException on failure.</summary>
    public void ValidateImage(IFormFile file)
    {
        if (file.Length == 0)
            throw new ArgumentException("Image file must not be empty.");

        if (file.Length > MaxImageSizeBytes)
            throw new ArgumentException(
                $"Image '{file.FileName}' exceeds the 20 MB size limit ({file.Length / (1024 * 1024)} MB).");

        var mime = file.ContentType.ToLowerInvariant();
        if (!AllowedMimeTypes.Contains(mime))
            throw new ArgumentException(
                $"Unsupported image type '{file.ContentType}'. Allowed: jpeg, png, webp.");
    }

    /// <summary>Validates that the uploaded file count is within bounds. Throws ArgumentException on failure.</summary>
    public void ValidateImageCount(int count)
    {
        if (count < 1)
            throw new ArgumentException("At least one image is required.");

        if (count > MaxImageCount)
            throw new ArgumentException($"A maximum of {MaxImageCount} images may be uploaded per recipe.");
    }

    /// <summary>Validates rating is 0–3. Throws ArgumentException on failure.</summary>
    public void ValidateRating(int rating)
    {
        if (rating < 0 || rating > 3)
            throw new ArgumentException($"Rating must be 0, 1, 2, or 3. Received: {rating}.");
    }

    /// <summary>Validates finishedDishImageIndex is -1 or a valid 0-based index. Throws ArgumentException on failure.</summary>
    public void ValidateFinishedDishImageIndex(int index, int imageCount)
    {
        if (index < -1 || index >= imageCount)
            throw new ArgumentException(
                $"finishedDishImageIndex must be -1 or 0–{imageCount - 1}. Received: {index}.");
    }
}
