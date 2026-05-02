namespace RecipeApi.Infrastructure;

using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// Generic interface for partitioned key-value storage, ported from the agent-framework experiment.
/// Used to decouple domain logic from the physical file system.
/// </summary>
public interface IStorageProvider
{
    Task SaveAsync(string partition, string key, string value);

    Task SaveAsync(string partition, string key, byte[] value);

    Task<byte[]?> LoadAsync(string partition, string key);

    Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key);

    List<string> List(string partition);
}
