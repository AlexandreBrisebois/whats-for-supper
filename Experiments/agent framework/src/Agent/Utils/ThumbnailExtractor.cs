namespace Agent;

using System.Text.Json;

public class ThumbnailExtractor
{
    /// <summary>
    /// Extracts a thumbnail from a base64-encoded data URL and saves it to disk.
    /// </summary>
    /// <param name="jsonResponse">The JSON response containing the thumbnail (from the AI model)</param>
    /// <param name="outputPath">The file path where the thumbnail should be saved</param>
    /// <returns>True if successful, false otherwise</returns>
    public static async Task<bool> ExtractAndSaveAsync(string jsonResponse, string outputPath)
    {
        try
        {
            // Parse the JSON response
            var response = JsonSerializer.Deserialize<ThumbnailResponse>(jsonResponse);
            
            if (response?.Thumbnail == null)
            {
                throw new InvalidOperationException("No thumbnail found in response");
            }

            // Extract the base64 data from the data URL
            // Format: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
            var base64Data = ExtractBase64FromDataUrl(response.Thumbnail);

            // Create output directory if it doesn't exist
            var outputDirectory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(outputDirectory) && !Directory.Exists(outputDirectory))
            {
                Directory.CreateDirectory(outputDirectory);
            }

            // Decode base64 and save to disk
            var imageBytes = Convert.FromBase64String(base64Data);
            await File.WriteAllBytesAsync(outputPath, imageBytes);

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error extracting thumbnail: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Extracts base64 string from a data URL.
    /// </summary>
    private static string ExtractBase64FromDataUrl(string dataUrl)
    {
        // Remove "data:image/jpeg;base64," prefix
        const string prefix = "data:image/jpeg;base64,";
        
        if (dataUrl.StartsWith(prefix))
        {
            return dataUrl.Substring(prefix.Length);
        }

        // Handle other image types or formats
        var parts = dataUrl.Split(',');
        if (parts.Length == 2)
        {
            return parts[1];
        }

        throw new ArgumentException("Invalid data URL format");
    }
}

