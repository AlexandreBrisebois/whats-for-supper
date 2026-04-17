namespace RecipeApi.Dto;

public class RecipeImportSummaryDto
{
    public int ImportedCount { get; set; }
    public int QueueCount { get; set; }
    public int FailedCount { get; set; }
}
