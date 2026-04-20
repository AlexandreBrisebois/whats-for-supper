namespace RecipeApi.Services;

/// <summary>
/// Validates recipe upload inputs. Throws <see cref="ArgumentException"/> on failure.
/// Extracted as an interface to enable mocking in unit tests.
/// </summary>
public interface IValidationService
{
    void ValidateImage(IFormFile file);
    void ValidateImageCount(int count);
    void ValidateRating(int rating);
    void ValidateFinishedDishImageIndex(int index, int imageCount);
}
