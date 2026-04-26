namespace RecipeApi.Dto;

public class BulkImportTriggerResponseDto
{
    public int QueuedCount { get; set; }
    public List<Guid> InstanceIds { get; set; } = [];
}
