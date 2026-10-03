namespace RecipeApi.Services;

public interface IPdfPageRenderer
{
    Task<IReadOnlyList<byte[]>> RenderAsync(Stream source, CancellationToken ct);
}
