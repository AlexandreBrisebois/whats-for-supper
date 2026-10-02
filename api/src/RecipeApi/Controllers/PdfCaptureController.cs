using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/recipes")]
public sealed class PdfCaptureController(FeatureFlagService flags, PdfCaptureService capture) : ControllerBase
{
    [HttpPost("capture-pdf")]
    [SkipWrapping]
    [RequestFormLimits(MultipartBodyLengthLimit = 20 * 1024 * 1024)]
    [RequestSizeLimit(500 * 1024 * 1024)] // Multipart envelope is separate from the 20 MiB file bound.
    public async Task<IActionResult> Capture(
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId,
        CancellationToken ct)
    {
        if (familyMemberId is null || !await flags.MemberExistsAsync(familyMemberId.Value, ct))
            return Reject(400, "An established family member is required.");
        var snapshot = await flags.GetSnapshotAsync(familyMemberId.Value, ct);
        if (!snapshot.Any(flag => flag.Key == "preview-pdf-recipe-import" && flag.Enabled))
            return Reject(409, "PDF import preview isn't enabled. This file hasn't been added.");
        if (!Request.HasFormContentType || !Request.ContentType!.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
            return Reject(415, "Choose a PDF file.");

        IFormCollection form;
        try { form = await Request.ReadFormAsync(ct); }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 413) { return Reject(413, "Choose a PDF up to 20 MiB."); }
        catch (InvalidDataException ex) when (ex.Message.Contains("length limit", StringComparison.OrdinalIgnoreCase)) { return Reject(413, "Choose a PDF up to 20 MiB."); }
        catch (InvalidDataException) { return Reject(400, "The upload form is invalid."); }
        if (form.Files.Count != 1 || form.Files[0].Name != "file")
            return Reject(400, "Choose exactly one PDF.");
        var file = form.Files[0];
        if (file.Length > PdfCaptureService.MaxFileBytes)
            return Reject(413, "Choose a PDF up to 20 MiB.");
        if (file.Length == 0) return Reject(400, "Choose a PDF file.");
        if (!Path.GetExtension(file.FileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase)
            || !file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
            return Reject(415, "Choose a .pdf file with PDF content type.");
        if (form.Keys.Any(key => key is not ("rating" or "notes"))
            || form["rating"].Count > 1 || form["notes"].Count > 1)
            return Reject(400, "The upload metadata is invalid.");
        var rating = 0;
        if (form.ContainsKey("rating")
            && (!int.TryParse(form["rating"][0], NumberStyles.Integer, CultureInfo.InvariantCulture, out rating) || rating is < 0 or > 3))
            return Reject(400, "Choose a rating between 0 and 3.");
        try
        {
            var id = await capture.AcceptAsync(familyMemberId.Value, file, rating, form["notes"].FirstOrDefault(), ct);
            return Accepted(new { data = new { id } });
        }
        catch (PdfUploadTooLargeException) { return Reject(413, "Choose a PDF up to 20 MiB."); }
    }

    private ObjectResult Reject(int status, string message) => StatusCode(status, new { status, message });
}

