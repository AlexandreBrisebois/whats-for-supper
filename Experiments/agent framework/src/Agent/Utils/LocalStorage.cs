using Microsoft.Extensions.Configuration;

namespace Agent.Utils;

public class LocalStorage(IConfiguration configuration) : IStorage
{
    private readonly string _path = configuration["LOCAL_STORAGE_PATH"] ?? throw new InvalidOperationException("Set LOCAL_STORAGE_PATH before running the tests.");

    public void Save(string partition, string key, string value)
    {
        var folderPath = Path.Combine(_path, partition);
        Directory.CreateDirectory(folderPath);
        
        var filePath = Path.Combine(folderPath, key + ".txt");
        File.WriteAllText(filePath, value);
    }

    public string? Load(string partition, string key)
    {
        var filePath = Path.Combine(_path, partition, key + ".txt");
        if (File.Exists(filePath))
        {
            return File.ReadAllText(filePath);
        }

        return null;
    }
}