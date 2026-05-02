namespace RecipeApi.Infrastructure;

using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

/// <summary>
/// Physical disk implementation of <see cref="IStorageProvider"/>, adapted from the agent-framework experiment.
/// Uses <see cref="DataRootResolver"/> as the base path for all partitions.
/// </summary>
public class LocalStorageProvider(DataRootResolver dataRoot) : IStorageProvider
{
    private string GetFullPath(string partition, string key)
    {
        return Path.Combine(dataRoot.Root, partition, key);
    }

    public async Task SaveAsync(string partition, string key, string value)
    {
        var filePath = GetFullPath(partition, key);
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        await File.WriteAllTextAsync(filePath, value);
    }

    public async Task SaveAsync(string partition, string key, byte[] value)
    {
        var filePath = GetFullPath(partition, key);
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        await File.WriteAllBytesAsync(filePath, value);
    }

    public async Task<byte[]?> LoadAsync(string partition, string key)
    {
        var filePath = GetFullPath(partition, key);
        if (File.Exists(filePath))
        {
            return await File.ReadAllBytesAsync(filePath);
        }
        return null;
    }

    public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key)
    {
        // Not currently used in the main project workflows, but maintained for interface parity
        throw new System.NotImplementedException();
    }

    public List<string> List(string partition)
    {
        var folderPath = Path.Combine(dataRoot.Root, partition);
        if (Directory.Exists(folderPath))
        {
            return Directory.GetDirectories(folderPath)
                .Select(Path.GetFileName)
                .OfType<string>()
                .ToList();
        }
        return [];
    }
}
