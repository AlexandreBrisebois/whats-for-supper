using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.Text.Json;
using PDFtoImage;
using SkiaSharp;

namespace RecipeApi.Services;

/// <summary>Runs only in the isolated --render-pdf process. No host services are started.</summary>
public static class PdfNativeWorker
{
    public static int Run(string[] args)
    {
        if (args.Length != 4) return 2;
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS() || OperatingSystem.IsWindows())
            return RunSupported(args);
        Console.Error.WriteLine("PDF rendering failed.");
        return 1;
    }

    [SupportedOSPlatform("linux")]
    [SupportedOSPlatform("macos")]
    [SupportedOSPlatform("windows")]
    private static int RunSupported(string[] args)
    {
        try
        {
            var limits = JsonSerializer.Deserialize<PdfRenderLimits>(args[3])
                ?? throw new InvalidDataException("Missing render limits.");
            // Detect encryption even when the user password is empty. PDFium's security
            // revision is authoritative; scanning PDF text for /Encrypt is not reliable.
            Pdfium.FPDF_InitLibrary();
            var document = IntPtr.Zero;
            try
            {
                document = Pdfium.FPDF_LoadDocument(args[1], null);
                if (document == IntPtr.Zero || Pdfium.FPDF_GetSecurityHandlerRevision(document) >= 0)
                    throw new InvalidDataException("Encrypted or corrupt PDF.");
                var count = Pdfium.FPDF_GetPageCount(document);
                if (count is < 1 or > 10) throw new InvalidDataException("PDF must contain 1–10 pages.");
            }
            finally
            {
                if (document != IntPtr.Zero) Pdfium.FPDF_CloseDocument(document);
                Pdfium.FPDF_DestroyLibrary();
            }
            using var source = File.OpenRead(args[1]);
            var sizes = Conversion.GetPageSizes(source, leaveOpen: true);
            if (sizes.Count is < 1 or > 10) throw new InvalidDataException("PDF must contain 1–10 pages.");
            foreach (var size in sizes) limits.ValidatePage(size.Width, size.Height);
            source.Position = 0;
            long total = 0;
            var index = 0;
            foreach (var bitmap in Conversion.ToImages(source, leaveOpen: true, options: new RenderOptions(Dpi: limits.Dpi)))
            {
                using (bitmap)
                {
                    using var png = new MemoryStream();
                    if (!bitmap.Encode(png, SKEncodedImageFormat.Png, 100))
                        throw new InvalidDataException("PNG encoding failed.");
                    total += png.Length;
                    if (total > limits.MaxOutputBytes) throw new InvalidDataException("PDF output exceeds the qualified disk budget.");
                    File.WriteAllBytes(Path.Combine(args[2], index++ + ".png"), png.ToArray());
                }
            }
            if (index != sizes.Count) throw new InvalidDataException("Incomplete PDF rendering.");
            return 0;
        }
        catch
        {
            // No document text, filename or native diagnostic in browser feedback/logs.
            Console.Error.WriteLine("PDF rendering failed.");
            return 1;
        }
    }

    private static class Pdfium
    {
        private const string Library = "pdfium";
        [DllImport(Library, CallingConvention = CallingConvention.Cdecl)] internal static extern void FPDF_InitLibrary();
        [DllImport(Library, CallingConvention = CallingConvention.Cdecl)] internal static extern void FPDF_DestroyLibrary();
        [DllImport(Library, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        internal static extern IntPtr FPDF_LoadDocument(string path, string? password);
        [DllImport(Library, CallingConvention = CallingConvention.Cdecl)] internal static extern int FPDF_GetSecurityHandlerRevision(IntPtr document);
        [DllImport(Library, CallingConvention = CallingConvention.Cdecl)] internal static extern int FPDF_GetPageCount(IntPtr document);
        [DllImport(Library, CallingConvention = CallingConvention.Cdecl)] internal static extern void FPDF_CloseDocument(IntPtr document);
    }
}
