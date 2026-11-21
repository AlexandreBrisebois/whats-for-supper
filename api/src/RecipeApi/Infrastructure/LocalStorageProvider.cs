namespace RecipeApi.Infrastructure;

using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

/// <summary>
/// Physical disk implementation of <see cref="IStorageProvider"/>, adapted from the agent-framework experiment.
/// Uses <see cref="DataRootResolver"/> as the base path for all partitions.
/// </summary>
public class LocalStorageProvider(DataRootResolver dataRoot, RecipesRootResolver? recipes = null, WorkflowRootResolver? workflows = null) : IStorageProvider
{
    private string GetFullPath(string partition, string key)
    {
        return partition switch
        {
            "recipes" => Path.Combine((recipes ?? new RecipesRootResolver(dataRoot, new ConfigurationManager())).Root, key),
            "workflows" => Path.Combine((workflows ?? new WorkflowRootResolver(dataRoot, new ConfigurationManager())).Root, key),
            _ => Path.Combine(dataRoot.Root, partition, key)
        };
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

    public async Task SaveAtomicallyAsync(string partition, string key, byte[] value)
    {
        var path = GetFullPath(partition, key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var pending = path + ".pending-" + Guid.NewGuid().ToString("N");
        // Retain an interrupted candidate for diagnosis; never truncate the live file.
        await using (var stream = new FileStream(pending, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await stream.WriteAsync(value);
            await stream.FlushAsync();
            stream.Flush(flushToDisk: true);
        }
        File.Move(pending, path, overwrite: true);
        // Linux is the supported durable recovery host. Native development hosts
        // still get whole-file replacement and a flushed file, without a false
        // claim of Linux directory durability qualification.
        if (OperatingSystem.IsLinux())
        {
            var root = Path.GetFullPath(GetFullPath(partition, ""));
            for (var directory = new DirectoryInfo(Path.GetDirectoryName(path)!); directory is not null; directory = directory.Parent)
            {
                RecoveryDurability.Flush(directory.FullName);
                if (directory.FullName == root) break;
            }
        }
    }

    public Task DeleteAtomicallyAsync(string partition, string key)
    {
        var path = GetFullPath(partition, key);
        if (File.Exists(path)) File.Delete(path);
        // A prior unlink may have succeeded before directory fsync failed. A
        // retry must flush even when the file is already absent.
        var directory = Path.GetDirectoryName(path)!;
        if (OperatingSystem.IsLinux() && Directory.Exists(directory)) RecoveryDurability.Flush(directory);
        return Task.CompletedTask;
    }

    public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key)
    {
        // Not currently used in the main project workflows, but maintained for interface parity
        throw new System.NotImplementedException();
    }

    public List<string> List(string partition)
    {
        var folderPath = GetFullPath(partition, "");
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
