namespace RecipeApi.Models;

public enum ManagementTaskType
{
    Backup,
    Restore,
    DisasterRecovery
}

public enum ManagementTaskStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}

public class ManagementTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public ManagementTaskType Type { get; set; }
    public ManagementTaskStatus Status { get; set; } = ManagementTaskStatus.Pending;
    public string? ErrorMessage { get; set; }
    public object? Result { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
