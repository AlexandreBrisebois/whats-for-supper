using Microsoft.Extensions.Configuration;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>Opt-in native tests against generated qualification fixtures, never a fake renderer.</summary>
public sealed class PdfNativeRendererTests
{
    private static string Fixture(string name) => Path.Combine(Environment.GetEnvironmentVariable("WFS_NATIVE_PDF_FIXTURES")!, name + ".pdf");
    private static Dictionary<string, string?> Settings(int dpi = 200, int timeout = 60) => new()
    {
        ["WFS_PDF_RENDER_DPI"] = dpi.ToString(), ["WFS_PDF_MAX_DIMENSION"] = "20000",
        ["WFS_PDF_MAX_PIXELS"] = "300000000", ["WFS_PDF_MAX_OUTPUT_BYTES"] = "536870912",
        ["WFS_PDF_MAX_RESIDENT_BYTES"] = "4294967296", ["WFS_PDF_TIMEOUT_SECONDS"] = timeout.ToString()
    };
    private static PdfProcessRenderer Renderer(Dictionary<string, string?> settings) => new(new ConfigurationBuilder().AddInMemoryCollection(settings).Build());

    [NativePdfFact]
    public async Task Native_success_returns_ordered_pngs_and_cleans_attempt_directories()
    {
        var before = Directory.GetDirectories(Path.GetTempPath(), "wfs-pdf-*").Order().ToArray();
        await using var source = File.OpenRead(Fixture("bilingual"));
        var bytes = await Renderer(Settings()).RenderAsync(source, CancellationToken.None);
        Assert.Equal(2, bytes.Count);
        foreach (var page in bytes) Assert.Equal(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }, page.Take(8));
        Assert.NotEqual(Convert.ToBase64String(bytes[0]), Convert.ToBase64String(bytes[1]));
        Assert.Equal(before, Directory.GetDirectories(Path.GetTempPath(), "wfs-pdf-*").Order().ToArray());
    }

    [NativePdfFact]
    public async Task Native_failure_retains_input_and_next_attempt_can_succeed()
    {
        var renderer = Renderer(Settings());
        foreach (var name in new[] { "corrupt", "encrypted", "eleven", "giant" })
        {
            var path = Fixture(name);
            var original = await File.ReadAllBytesAsync(path);
            await using var source = File.OpenRead(path);
            await Assert.ThrowsAsync<InvalidDataException>(() => renderer.RenderAsync(source, CancellationToken.None));
            Assert.Equal(original, await File.ReadAllBytesAsync(path));
        }
        await using var valid = File.OpenRead(Fixture("text"));
        Assert.Single(await renderer.RenderAsync(valid, CancellationToken.None));
    }

    [NativePdfFact]
    public async Task Parent_timeout_kills_and_reaps_native_worker_before_releasing_gate()
    {
        await using var slow = File.OpenRead(Fixture("ten"));
        var failure = await Assert.ThrowsAsync<InvalidDataException>(() => Renderer(Settings(dpi: 1000, timeout: 1)).RenderAsync(slow, CancellationToken.None));
        Assert.Contains("time limit", failure.Message);
        await using var valid = File.OpenRead(Fixture("text"));
        Assert.Single(await Renderer(Settings()).RenderAsync(valid, CancellationToken.None));
    }

    private sealed class NativePdfFactAttribute : FactAttribute
    {
        public NativePdfFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_NATIVE_PDF_FIXTURES")))
                Skip = "Set WFS_NATIVE_PDF_FIXTURES to run native PDF qualification.";
        }
    }
}
