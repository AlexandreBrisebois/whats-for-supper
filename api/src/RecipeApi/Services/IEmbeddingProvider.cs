namespace RecipeApi.Services;

public interface IEmbeddingProvider
{
    Task<float[]> GenerateAsync(string text, CancellationToken ct = default);
}
