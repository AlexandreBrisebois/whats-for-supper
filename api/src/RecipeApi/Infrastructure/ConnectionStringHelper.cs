namespace RecipeApi.Infrastructure;

/// <summary>
/// Utility for converting a postgres:// URI connection string into Npgsql keyword=value format.
/// Npgsql does not accept URI-style connection strings natively.
/// </summary>
public static class ConnectionStringHelper
{
    /// <summary>
    /// Converts a <c>postgres://user:pass@host:port/db</c> URI to Npgsql
    /// <c>Host=...;Port=...;Database=...;Username=...;Password=...</c> format.
    /// Returns the input unchanged if it is not a postgres URI.
    /// </summary>
    public static string NormalizeForNpgsql(string connectionString)
    {
        if (!connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString;
        }

        var u = new Uri(connectionString);
        var userInfo = u.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var db = u.AbsolutePath.TrimStart('/');
        var port = u.Port > 0 ? u.Port : 5432;

        return $"Host={u.Host};Port={port};Database={db};Username={user};Password={password}";
    }

    /// <summary>
    /// Returns a version of the connection string safe for logging (password masked).
    /// </summary>
    public static string MaskPassword(string connectionString)
    {
        if (connectionString.Contains("Password="))
        {
            return System.Text.RegularExpressions.Regex.Replace(
                connectionString, "Password=[^;]+", "Password=***");
        }

        if (connectionString.Contains("://") && connectionString.Contains(":"))
        {
            return System.Text.RegularExpressions.Regex.Replace(
                connectionString, ":[^:@]+@", ":***@");
        }

        return connectionString;
    }
}
