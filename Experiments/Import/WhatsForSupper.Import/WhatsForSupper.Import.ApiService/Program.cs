using WhatsForSupper.Import.ApiService.Models;
using WhatsForSupper.Import.ApiService.Services;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddScoped<RecipeService>();
builder.Services.AddHttpClient();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Enable CORS
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapPost("/api/recipes", async (HttpRequest request, RecipeService recipeService) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "Invalid content type. Expecting multipart/form-data." });
    }

    var form = await request.ReadFormAsync();

    var ratingValue = form["rating"].FirstOrDefault();
    if (!int.TryParse(ratingValue, out var rating))
    {
        return Results.BadRequest(new { error = "Rating is required and must be an integer." });
    }

    var files = form.Files;
    if (files == null || files.Count == 0)
    {
        return Results.BadRequest(new { error = "Recipe must contain at least one image." });
    }

    if (rating < 0 || rating > 3)
    {
        return Results.BadRequest(new { error = "Rating must be 0 (unknown), 1 (dislike), 2 (like), or 3 (love)." });
    }

    try
    {
        var uploadRequest = new UploadRecipeRequest { Rating = rating };

        foreach (var file in files)
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();

            uploadRequest.Images.Add(new RecipeImageData
            {
                FileName = file.FileName,
                ContentType = file.ContentType ?? "application/octet-stream",
                Data = bytes
            });
        }

        var recipeId = await recipeService.SaveRecipeAsync(uploadRequest);
        return Results.Ok(new { recipeId = recipeId });
    }
    catch (Exception ex)
    {
        return Results.StatusCode(500);
    }
})
.WithName("UploadRecipe")
.WithOpenApi();

app.MapGet("/recipe/{recipeId}/original/{photoId:int}", async (string recipeId, int photoId, RecipeService recipeService) =>
{
    var imagePath = recipeService.GetImagePath(recipeId, photoId.ToString());
    
    if (imagePath == null)
    {
        return Results.NotFound(new { error = "Image not found" });
    }

    try
    {
        var imageBytes = await File.ReadAllBytesAsync(imagePath);
        var base64String = Convert.ToBase64String(imageBytes);
        
        var contentType = Path.GetExtension(imagePath).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };

        return Results.Ok(new
        {
            recipeId = recipeId,
            photoId = photoId,
            contentType = contentType,
            base64Data = base64String
        });
    }
    catch (Exception ex)
    {
        return Results.StatusCode(500);
    }
})
.WithName("GetRecipeImageBase64")
.WithOpenApi();

app.MapDefaultEndpoints();

app.Run();
