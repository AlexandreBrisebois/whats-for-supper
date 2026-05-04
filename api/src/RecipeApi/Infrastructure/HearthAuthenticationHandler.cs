using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace RecipeApi.Infrastructure;

public class HearthAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string DefaultScheme = "HearthSecret";
    public string Secret { get; set; } = string.Empty;
}

public class HearthAuthenticationHandler : AuthenticationHandler<HearthAuthenticationOptions>
{
    public HearthAuthenticationHandler(
        IOptionsMonitor<HearthAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var secret = Options.Secret;
        if (string.IsNullOrEmpty(secret))
        {
            Logger.LogWarning("HEARTH_SECRET is not configured in the application settings.");
            return Task.FromResult(AuthenticateResult.Fail("HEARTH_SECRET is not configured."));
        }

        // 1. Check for raw secret in X-Hearth-Secret header (for restclient/tools)
        if (Request.Headers.TryGetValue("X-Hearth-Secret", out var headerSecret) && headerSecret == secret)
        {
            return Task.FromResult(Success("HeaderSecret"));
        }

        // 2. Check for HMAC token in Authorization header
        if (Request.Headers.TryGetValue("Authorization", out var authHeader) && authHeader.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.ToString()["Bearer ".Length..];
            if (ValidateHmacToken(token, secret))
            {
                return Task.FromResult(Success("BearerToken"));
            }
        }

        // 3. Check for HMAC token in h_access cookie
        if (Request.Cookies.TryGetValue("h_access", out var cookieToken))
        {
            if (ValidateHmacToken(cookieToken, secret))
            {
                return Task.FromResult(Success("CookieToken"));
            }
        }

        return Task.FromResult(AuthenticateResult.Fail("Invalid or missing Hearth secret/token."));
    }

    private AuthenticateResult Success(string method)
    {
        var claims = new[] {
            new Claim(ClaimTypes.Name, "HearthFamily"),
            new Claim("auth_method", method)
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }

    private bool ValidateHmacToken(string token, string secret)
    {
        var parts = token.Split('.');
        if (parts.Length != 2) return false;

        var timestamp = parts[0];
        var b64 = parts[1];

        try
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(timestamp));

            // Base64Url encoding logic: replace + with -, / with _, and remove padding =
            var expectedB64 = Convert.ToBase64String(hash)
                .Replace('+', '-')
                .Replace('/', '_')
                .TrimEnd('=');

            return b64 == expectedB64;
        }
        catch
        {
            return false;
        }
    }
}
