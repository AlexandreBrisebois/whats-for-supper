using Microsoft.Extensions.Configuration;

namespace Agent.Utils;

public class LocalStorage(IConfiguration configuration) : IStorageProvider
{
    private readonly string _path = configuration["LOCAL_STORAGE_PATH"] ?? throw new InvalidOperationException("Set LOCAL_STORAGE_PATH before running the tests.");

    public async Task SaveAsync(string partition, string key, string value)
    {
        var folderPath = Path.Combine(_path, partition);
     
        var filePath = Path.Combine(folderPath, key);
        
        Directory.CreateDirectory(Path.GetDirectoryName(filePath));
        
        await File.WriteAllTextAsync(filePath, value);
    }

    public async Task SaveAsync(string partition, string key, byte[] value)
    {
        var folderPath = Path.Combine(_path, partition);
        
        var filePath = Path.Combine(folderPath, key);
        
        Directory.CreateDirectory(Path.GetDirectoryName(filePath));
        
        await File.WriteAllBytesAsync(filePath, value);
    }

    public async Task<byte[]?> LoadAsync(string partition, string key)
    {
        var filePath = Path.Combine(_path, partition, key);
        if (File.Exists(filePath))
        {
            return await File.ReadAllBytesAsync(filePath);
        }

        return null;
    }

    public Task<List<KeyValuePair<string, string>>> FindAsync(string recipes, string key)
    {
        throw new NotImplementedException();
    }

    public List<string> List(string partition)
    {
        var folderPath = Path.Combine(_path, partition);
        if (Directory.Exists(folderPath))
        {
            var directories = Directory.GetDirectories(folderPath).Select(Path.GetFileName).ToList();
            return directories;
        }

        return [];
    }
}