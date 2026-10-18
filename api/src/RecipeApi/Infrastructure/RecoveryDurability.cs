using System.ComponentModel;
using System.Runtime.InteropServices;

namespace RecipeApi.Infrastructure;

/// <summary>Flush publication metadata as well as file bytes on the supported Linux storage host.</summary>
internal static class RecoveryDurability
{
    public static void Flush(string path)
    {
        if (!OperatingSystem.IsLinux())
            throw new PlatformNotSupportedException("Exact recovery publication requires a Linux storage host with fsync support.");
        var descriptor = Open(path, 0);
        if (descriptor < 0) throw new IOException("Cannot open recovery path for durability: " + path, new Win32Exception(Marshal.GetLastPInvokeError()));
        try
        {
            if (Sync(descriptor) != 0) throw new IOException("Cannot flush recovery path: " + path, new Win32Exception(Marshal.GetLastPInvokeError()));
        }
        finally { _ = Close(descriptor); }
    }

    public static void FlushTree(string root, CancellationToken ct)
    {
        foreach (var path in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
        { ct.ThrowIfCancellationRequested(); Flush(path); }
        foreach (var directory in Directory.EnumerateDirectories(root, "*", SearchOption.AllDirectories).OrderByDescending(p => p.Length))
        { ct.ThrowIfCancellationRequested(); Flush(directory); }
        Flush(root);
        Flush(Path.GetDirectoryName(root)!);
    }

    [DllImport("libc", EntryPoint = "open", SetLastError = true)]
    private static extern int Open([MarshalAs(UnmanagedType.LPUTF8Str)] string path, int flags);
    [DllImport("libc", EntryPoint = "fsync", SetLastError = true)]
    private static extern int Sync(int descriptor);
    [DllImport("libc", EntryPoint = "close", SetLastError = true)]
    private static extern int Close(int descriptor);
}
