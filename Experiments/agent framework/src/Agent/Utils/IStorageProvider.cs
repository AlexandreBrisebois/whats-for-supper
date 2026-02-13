namespace Agent.Utils;

public interface IStorage
{
    void Save(string partition, string key, string value);
    
    string? Load(string partition, string key);
}