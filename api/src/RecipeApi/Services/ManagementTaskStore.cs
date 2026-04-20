using System.Threading.Channels;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class ManagementTaskStore
{
    private ManagementTask? _currentTask;
    private readonly object _lock = new();
    private readonly Channel<ManagementTask> _channel = Channel.CreateBounded<ManagementTask>(1);

    public ManagementTask? GetCurrentTask()
    {
        lock (_lock) return _currentTask;
    }

    public bool TryEnqueue(ManagementTaskType type, out ManagementTask? task)
    {
        task = null;

        lock (_lock)
        {
            // If a task is already processing, deny new requests
            if (_currentTask != null &&
                _currentTask.Status is ManagementTaskStatus.Pending or ManagementTaskStatus.Processing)
            {
                return false;
            }

            task = new ManagementTask { Type = type };
            _currentTask = task;
        }

        // Since capacity is 1 and we check _currentTask under the lock, this should succeed
        return _channel.Writer.TryWrite(task);
    }

    public ChannelReader<ManagementTask> Reader => _channel.Reader;

    public void UpdateTask(ManagementTaskStatus status, object? result = null, string? error = null)
    {
        lock (_lock)
        {
            if (_currentTask != null)
            {
                _currentTask.Status = status;
                _currentTask.Result = result;
                _currentTask.ErrorMessage = error;
                _currentTask.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }
    }
}
