namespace RecipeApi.Services;

/// <summary>Values must be supplied from qualification; there are no unmeasured production defaults.</summary>
public sealed record PdfRenderLimits(int Dpi, int MaxDimension, long MaxPixels, long MaxOutputBytes, long MaxResidentBytes, int TimeoutSeconds)
{
    public static PdfRenderLimits Read(IConfiguration config) => new(
        checked((int)Positive(config, "WFS_PDF_RENDER_DPI")),
        checked((int)Positive(config, "WFS_PDF_MAX_DIMENSION")),
        Positive(config, "WFS_PDF_MAX_PIXELS"),
        Positive(config, "WFS_PDF_MAX_OUTPUT_BYTES"),
        Positive(config, "WFS_PDF_MAX_RESIDENT_BYTES"),
        checked((int)Positive(config, "WFS_PDF_TIMEOUT_SECONDS")));

    private static long Positive(IConfiguration config, string key) =>
        long.TryParse(config[key], out var value) && value > 0 ? value
        : throw new InvalidOperationException("PDF renderer qualification setting is missing: " + key);

    public void ValidatePage(double widthPoints, double heightPoints)
    {
        var width = Math.Ceiling(widthPoints * Dpi / 72);
        var height = Math.Ceiling(heightPoints * Dpi / 72);
        if (!double.IsFinite(width) || !double.IsFinite(height) || width <= 0 || height <= 0
            || width > MaxDimension || height > MaxDimension || width * height > MaxPixels)
            throw new InvalidDataException("PDF page exceeds the qualified render dimensions.");
    }
}
