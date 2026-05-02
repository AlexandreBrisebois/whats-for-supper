namespace RecipeApi.Infrastructure;

using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

/// <summary>
/// Thread-safe in-memory implementation of <see cref="IStorageProvider"/> for testing.
/// Stores data in a nested concurrent dictionary: Partition -> Key -> Data.
/// </summary>
public class InMemoryStorageProvider : IStorageProvider
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte[]>> _storage = new();

    public Task SaveAsync(string partition, string key, string value)
    {
        return SaveAsync(partition, key, Encoding.UTF8.GetBytes(value));
    }

    public Task SaveAsync(string partition, string key, byte[] value)
    {
        var partitionStorage = _storage.GetOrAdd(partition, _ => new ConcurrentDictionary<string, byte[]>());
        partitionStorage[key] = value;
        return Task.CompletedTask;
    }

    public Task<byte[]?> LoadAsync(string partition, string key)
    {
        if (_storage.TryGetValue(partition, out var partitionStorage) &&
            partitionStorage.TryGetValue(key, out var value))
        {
            return Task.FromResult<byte[]?>(value);
        }
        return Task.FromResult<byte[]?>(null);
    }

    public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key)
    {
        if (_storage.TryGetValue(partition, out var partitionStorage))
        {
            var matches = partitionStorage
                .Where(kvp => kvp.Key.Contains(key))
                .Select(kvp => new KeyValuePair<string, string>(kvp.Key, Encoding.UTF8.GetString(kvp.Value)))
                .ToList();
            return Task.FromResult(matches);
        }
        return Task.FromResult(new List<KeyValuePair<string, string>>());
    }

    public List<string> List(string partition)
    {
        if (_storage.TryGetValue(partition, out var partitionStorage))
        {
            // In LocalStorage, List returns immediate subdirectories (recipe IDs).
            // Here, we simulate that by taking the first segment of the key if it contains a slash.
            return partitionStorage.Keys
                .Select(k => k.Contains('/') ? k.Split('/')[0] : k)
                .Distinct()
                .ToList();
        }
        return [];
    }
}
