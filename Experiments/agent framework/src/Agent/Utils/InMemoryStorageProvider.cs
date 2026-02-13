using System.Collections.Specialized;

namespace Agent.Utils;

public class InMemoryStorage : IStorage
{
    private readonly HybridDictionary _storage = new();

    public void Save(string partition, string key, string value)
    {
        if (!_storage.Contains(partition))
        {
            _storage[partition] = new Dictionary<string, string>();
        }

        var partitionDict = (Dictionary<string, string>)_storage[partition]!;
        partitionDict[key] = value;
    }

    public string? Load(string partition, string key)
    {
        if (_storage.Contains(partition))
        {
            var partitionDict = (Dictionary<string, string>)_storage[partition]!;
            if (partitionDict.TryGetValue(key, out var value))
            {
                return value;
            }
        }

        return null; // Return null if partition or key doesn't exist
    }
}