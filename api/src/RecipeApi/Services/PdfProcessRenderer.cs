using System.Diagnostics;
using System.Text.Json;

namespace RecipeApi.Services;

/// <summary>One disposable native subprocess, with a parent-enforced timeout and resource monitoring.</summary>
public sealed class PdfProcessRenderer(IConfiguration config) : IPdfPageRenderer
{
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public async Task<IReadOnlyList<byte[]>> RenderAsync(Stream source, CancellationToken ct)
    {
        var limits = PdfRenderLimits.Read(config);
        await Gate.WaitAsync(ct);
        var attempt = Path.Combine(Path.GetTempPath(), "wfs-pdf-" + Guid.NewGuid().ToString("N"));
        Process? process = null;
        try
        {
            Directory.CreateDirectory(attempt);
            var input = Path.Combine(attempt, "source.pdf");
            await using (var output = File.Create(input)) await source.CopyToAsync(output, ct);
            var pages = Path.Combine(attempt, "pages");
            Directory.CreateDirectory(pages);
            var start = new ProcessStartInfo("dotnet") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
            start.ArgumentList.Add(typeof(PdfNativeWorker).Assembly.Location);
            start.ArgumentList.Add("--render-pdf");
            start.ArgumentList.Add(input);
            start.ArgumentList.Add(pages);
            start.ArgumentList.Add(JsonSerializer.Serialize(limits));
            process = Process.Start(start) ?? throw new InvalidOperationException("PDF worker did not start.");
            // Drain output to avoid pipe deadlock; never log user PDF content.
            var stdout = process.StandardOutput.ReadToEndAsync(ct);
            var stderr = process.StandardError.ReadToEndAsync(ct);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(limits.TimeoutSeconds));
            while (!process.HasExited)
            {
                timeout.Token.ThrowIfCancellationRequested();
                process.Refresh();
                if (process.WorkingSet64 > limits.MaxResidentBytes
                    || Directory.EnumerateFiles(pages).Sum(path => new FileInfo(path).Length) > limits.MaxOutputBytes)
                    throw new InvalidDataException("PDF exceeds the qualified render resource budget.");
                await Task.Delay(50, timeout.Token);
            }
            await process.WaitForExitAsync(ct);
            await stdout;
            await stderr;
            if (process.ExitCode != 0)
                throw new InvalidDataException("PDF could not be prepared. Retry or delete the failed import in Settings.");
            var paths = Directory.GetFiles(pages, "*.png").OrderBy(path => int.Parse(Path.GetFileNameWithoutExtension(path))).ToArray();
            if (paths.Length is < 1 or > 10 || paths.Sum(path => new FileInfo(path).Length) > limits.MaxOutputBytes)
                throw new InvalidDataException("PDF exceeds the supported page or output limit.");
            var result = new List<byte[]>(paths.Length);
            for (var i = 0; i < paths.Length; i++)
            {
                if (Path.GetFileName(paths[i]) != i + ".png")
                    throw new InvalidDataException("PDF worker returned incomplete pages.");
                result.Add(await File.ReadAllBytesAsync(paths[i], ct));
            }
            return result;
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new InvalidDataException("PDF preparation exceeded the qualified time limit.");
        }
        finally
        {
            // Cancellation does not stop PDFium: explicitly kill and reap the child before cleanup/releasing the gate.
            if (process is not null)
            {
                if (!process.HasExited) process.Kill(entireProcessTree: true);
                await process.WaitForExitAsync(CancellationToken.None);
                process.Dispose();
            }
            if (Directory.Exists(attempt)) Directory.Delete(attempt, recursive: true);
            Gate.Release();
        }
    }
}

