using Amazon.CDK;
using Amazon.CDK.AWS.RDS;
using Constructs;

namespace Aws
{
    internal static class DatabaseCredentialContract
    {
        public const string DatabaseName = "recipe_app_db";
        public const string Username = "recipe_app";
        public const string PasswordContextKey = "dbPassword";
        public const string LegacyFallbackPassword = "whatsforsupper";

        public static string ResolvePassword(Construct scope)
        {
            var password = scope.Node.TryGetContext(PasswordContextKey) as string;
            if (string.IsNullOrWhiteSpace(password))
            {
                Annotations.Of(scope).AddWarning(
                    $"CDK context '{PasswordContextKey}' was not provided. " +
                    "Falling back to legacy demo password for backward compatibility.");
                return LegacyFallbackPassword;
            }

            return password;
        }

        public static Credentials BuildDatabaseCredentials(Construct scope)
        {
            return Credentials.FromPassword(
                Username,
                SecretValue.UnsafePlainText(ResolvePassword(scope)));
        }
    }
}
