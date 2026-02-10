# Configuration Guide - WhatsForSupper.Import.WebJS

## Overview

The WebJS application requires configuration of the API base URL to communicate with the API service. This document explains all configuration methods.

## Configuration Sources (Priority Order)

The application reads the `API_BASE_URL` in the following order:

1. **Environment Variable** (highest priority)
2. **appsettings.json** / **appsettings.{Environment}.json**
3. **Hardcoded Fallback** (`http://localhost:5474`)

## Local Development

### Option 1: appsettings.json (Default)

**File:** `appsettings.json`
```json
{
  "API_BASE_URL": "http://localhost:5474"
}
```

This is the default for local development when running via Visual Studio or `dotnet run`.

### Option 2: Environment Variable

Set the environment variable before running:

**Windows PowerShell:**
```powershell
$env:API_BASE_URL = "http://localhost:5474"
dotnet run
```

**Windows CMD:**
```cmd
set API_BASE_URL=http://localhost:5474
dotnet run
```

**Linux/Mac:**
```bash
export API_BASE_URL=http://localhost:5474
dotnet run
```

### Option 3: launchSettings.json

**File:** `Properties/launchSettings.json`
```json
{
  "profiles": {
    "http": {
      "environmentVariables": {
        "API_BASE_URL": "http://localhost:5474",
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

## Docker Deployment

### Docker Compose (Recommended)

**File:** `docker-compose.synology.yml`

```yaml
version: '3.8'

services:
  whatsforsupper-import-apiservice:
    image: registry:port/whatsforsupper-import-apiservice:tag
    container_name: whatsforsupper-import-apiservice
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: http://+:8080
      RECIPES_ROOT: /recipes
    volumes:
      - ./recipes:/recipes
    ports:
      - "8082:8080"

  whatsforsupper-import-webjs:
    image: registry:port/whatsforsupper-import-webjs:tag
    container_name: whatsforsupper-import-webjs
    depends_on:
      - whatsforsupper-import-apiservice
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: http://+:8080
      # ? Configure API URL here
      API_BASE_URL: http://whatsforsupper-import-apiservice:8080
    ports:
      - "8080:8080"
```

**Key Points:**
- Use Docker service name for internal communication: `http://whatsforsupper-import-apiservice:8080`
- Use host IP for external access: `http://192.168.1.226:8082`
- Port `8080` is the internal container port
- Port mapping determines external access

### Docker Run Command

```bash
docker run -d \
  --name whatsforsupper-import-webjs \
  -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ASPNETCORE_URLS=http://+:8080 \
  -e API_BASE_URL=http://whatsforsupper-import-apiservice:8080 \
  registry:port/whatsforsupper-import-webjs:tag
```

## Aspire AppHost

**File:** `WhatsForSupper.Import.AppHost/AppHost.cs`

```csharp
var apiService = builder.AddProject<Projects.WhatsForSupper_Import_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.WhatsForSupper_Import_WebJS>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithEnvironment("API_BASE_URL", apiService.GetEndpoint("http"))
    .WaitFor(apiService);
```

Aspire automatically injects the API service URL using service discovery.

## Verification

### Check Current Configuration

Open browser console (F12) and run:
```javascript
fetch('/api/config')
  .then(r => r.json())
  .then(config => console.log('API URL:', config.apiBaseUrl));
```

### Test API Connection

```javascript
fetch('/api/config')
  .then(r => r.json())
  .then(config => fetch(`${config.apiBaseUrl}/health`))
  .then(r => r.json())
  .then(data => console.log('API Health:', data));
```

### Curl Test

```bash
# Test web app config endpoint
curl http://localhost:8080/api/config

# Test API service health
curl http://localhost:8082/health
```

## Common Scenarios

### Scenario 1: Local Development with Local API

```json
{
  "API_BASE_URL": "http://localhost:5474"
}
```

### Scenario 2: Docker Compose (Same Host)

```yaml
environment:
  API_BASE_URL: http://whatsforsupper-import-apiservice:8080
```

### Scenario 3: Web App in Docker, API on Host

```yaml
environment:
  API_BASE_URL: http://host.docker.internal:5474
```

### Scenario 4: External API Service

```yaml
environment:
  API_BASE_URL: https://api.example.com
```

### Scenario 5: Production with Reverse Proxy

```yaml
environment:
  API_BASE_URL: https://api.yourdomain.com
```

## Troubleshooting

### Issue: "Failed to fetch" Error

**Symptoms:** Network error when saving recipes

**Solutions:**
1. Check API_BASE_URL is set correctly
   ```bash
   docker exec whatsforsupper-import-webjs env | grep API_BASE_URL
   ```

2. Verify API service is running
   ```bash
   curl http://whatsforsupper-import-apiservice:8080/health
   ```

3. Check CORS configuration in API service

### Issue: Wrong API URL in Browser

**Symptoms:** `/api/config` returns wrong URL

**Solution:** Restart container with correct environment variable:
```bash
docker-compose down
docker-compose up -d
```

### Issue: Cannot Connect to API from Browser

**Symptoms:** CORS or network errors

**Possible Causes:**
- API URL is internal Docker address (use public URL for browser access)
- CORS not enabled on API service
- Firewall blocking ports

**Solution:** For browser access, use public URLs:
```yaml
environment:
  API_BASE_URL: http://192.168.1.226:8082  # Use host IP, not Docker service name
```

## Security Considerations

### Production Checklist

- ? Use HTTPS for API_BASE_URL in production
- ? Enable CORS only for specific origins (not wildcard)
- ? Set ASPNETCORE_ENVIRONMENT to "Production"
- ? Use environment-specific appsettings files
- ? Don't commit sensitive URLs to source control
- ? Use Docker secrets for sensitive configuration

### Example Production Configuration

```yaml
services:
  whatsforsupper-import-webjs:
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: http://+:8080
      API_BASE_URL: https://api.yourdomain.com
      ASPNETCORE_FORWARDEDHEADERS_ENABLED: "true"
    secrets:
      - api_key
```

## Related Documentation

- [Program.cs](Program.cs) - See how configuration is loaded
- [README.md](README.md) - General project documentation
- [docker-compose.synology.yml](../docker-compose.synology.yml) - Deployment configuration
