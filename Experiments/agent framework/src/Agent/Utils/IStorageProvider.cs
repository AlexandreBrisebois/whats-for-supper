namespace Agent.Utils;

using System.Collections.Generic;

public interface IStorageProvider
{
    Task SaveAsync(string partition, string key, string value);
    
    Task SaveAsync(string partition, string key, byte[] value);
    
    Task<byte[]?> LoadAsync(string partition, string key);
    
    Task<List<KeyValuePair<string,string>>> FindAsync(string partition, string key);
    List<string> List(string partition);
}