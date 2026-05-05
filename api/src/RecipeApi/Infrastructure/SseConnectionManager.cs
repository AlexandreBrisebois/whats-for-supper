using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Singleton that holds open SSE response streams for all connected clients.
/// Each connection gets its own SemaphoreSlim(1,1) write lock to prevent
/// concurrent writes from the heartbeat loop and BroadcastAsync from
/// corrupting the response body (BS-5).
/// </summary>
public class SseConnectionManager
{
    private readonly ConcurrentDictionary<string, (HttpResponse Response, SemaphoreSlim Lock)> _connections = new();

    public string AddConnection(HttpResponse response)
    {
        var id = Guid.NewGuid().ToString();
        _connections[id] = (response, new SemaphoreSlim(1, 1));
        return id;
    }

    public void RemoveConnection(string id)
    {
        if (_connections.TryRemove(id, out var entry))
            entry.Lock.Dispose();
    }

    public async Task BroadcastAsync(string eventType, object payload)
    {
        var data = JsonSerializer.Serialize(payload);
        var message = $"event: {eventType}\ndata: {data}\n\n";
        var bytes = Encoding.UTF8.GetBytes(message);

        foreach (var (id, entry) in _connections)
        {
            await entry.Lock.WaitAsync();
            try
            {
                await entry.Response.Body.WriteAsync(bytes);
                await entry.Response.Body.FlushAsync();
            }
            catch
            {
                // Client disconnected or response disposed — remove immediately (do not defer) (BS-6)
                RemoveConnection(id);
            }
            finally
            {
                // Guard: semaphore may already be disposed if RemoveConnection was called above
                try { entry.Lock.Release(); } catch (ObjectDisposedException) { }
            }
        }
    }

    /// <summary>Returns the number of active connections (for diagnostics/testing).</summary>
    public int ConnectionCount => _connections.Count;
}
