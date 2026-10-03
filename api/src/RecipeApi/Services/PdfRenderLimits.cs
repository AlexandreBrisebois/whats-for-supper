namespace RecipeApi.Services;

/// <summary>Code-owned production profile selected from measured Ubuntu amd64 qualification.</summary>
public sealed record PdfRenderLimits(int Dpi, int MaxDimension, long MaxPixels, long MaxOutputBytes, long MaxResidentBytes, int TimeoutSeconds)
{
    // Operators do not tune PDF rendering. Keep the measured profile in one immutable value.
    public static PdfRenderLimits Default { get; } = new(
        Dpi: 200,
        MaxDimension: 4096,
        MaxPixels: 16_777_216,
        MaxOutputBytes: 64L * 1024 * 1024,
        MaxResidentBytes: 512L * 1024 * 1024,
        TimeoutSeconds: 60);

    public void ValidatePage(double widthPoints, double heightPoints)
    {
        var width = Math.Ceiling(widthPoints * Dpi / 72);
        var height = Math.Ceiling(heightPoints * Dpi / 72);
        if (!double.IsFinite(width) || !double.IsFinite(height) || width <= 0 || height <= 0
            || width > MaxDimension || height > MaxDimension || width * height > MaxPixels)
            throw new InvalidDataException("PDF page exceeds the qualified render dimensions.");
    }
}
