# WhatsForSupper.Import Experiment

[![repo-size]][repo] [![license]][license] [![ci]][ci] [![issues]][issues]

## Overview

This experiment is a .NET 10 Aspire-based recipe import application with a mobile-first JavaScript web frontend. The goal is to provide a simple, lightweight interface for capturing recipe photos with ratings from mobile devices.

## Architecture

This solution consists of four projects:

- **WhatsForSupper.Import.AppHost** - .NET Aspire orchestration host for local development
- **WhatsForSupper.Import.ApiService** - ASP.NET Core 10 API for recipe uploads
- **WhatsForSupper.Import.WebJS** - Vanilla JavaScript frontend served by ASP.NET Core
- **WhatsForSupper.Import.ServiceDefaults** - Shared Aspire service configuration

## Features

- ✅ **Mobile-first design** - Optimized for phone/tablet browsers
- ✅ **No framework overhead** - Vanilla JavaScript for fast load times
- ✅ **Camera integration** - Direct camera access on mobile devices
- ✅ **Rating system** - Unknown (⚪), Dislike (🔴), Like (🟡), Love (💚)
- ✅ **Multi-photo upload** - Capture and upload multiple recipe photos
- ✅ **Docker deployment** - Ready for container-based deployment
- ✅ **No WebSocket dependency** - Works on all mobile browsers

## Project Structure

```
WhatsForSupper.Import/
├── WhatsForSupper.Import.AppHost/       # Aspire orchestration
├── WhatsForSupper.Import.ApiService/    # REST API backend
│   ├── Models/                          # Request/response models
│   ├── Services/                        # Recipe storage service
│   └── Program.cs                       # API configuration
├── WhatsForSupper.Import.WebJS/         # JavaScript frontend
│   ├── wwwroot/
│   │   ├── index.html                   # Main UI
│   │   ├── js/app.js                    # Frontend logic
│   │   └── css/app.css                  # Styling
│   ├── Program.cs                       # Web host
│   └── Dockerfile                       # Container build
├── WhatsForSupper.Import.ServiceDefaults/  # Aspire defaults
├── docker-compose.synology.yml          # Production deployment
└── README.md                            # This file
```

## Quick Start (Local Development)

### Prerequisites
- .NET 10 SDK
- Visual Studio 2022 or VS Code
- Docker (optional, for containerized testing)

### Running with .NET Aspire

1. **Clone the repository**
   ```bash
   cd Experiments/Import/WhatsForSupper.Import
   ```

2. **Run with Aspire AppHost**
   ```bash
   dotnet run --project WhatsForSupper.Import.AppHost
   ```
   
   Or in Visual Studio:
   - Open `WhatsForSupper.Import.sln`
   - Set `WhatsForSupper.Import.AppHost` as startup project
   - Press F5

3. **Access the applications**
   - Web UI: http://localhost:5001
   - API: http://localhost:5474
   - Aspire Dashboard: http://localhost:15000 (or check console output)

### Running Individual Services

**API Service:**
```bash
cd WhatsForSupper.Import.ApiService
dotnet run
```

**Web Frontend:**
```bash
cd WhatsForSupper.Import.WebJS
dotnet run
```

### Configuration

**Environment Variables:**

API Service:
```yaml
ASPNETCORE_ENVIRONMENT: Production
ASPNETCORE_URLS: http://+:8080
RECIPES_ROOT: /recipes
```

Web Service:
```yaml
ASPNETCORE_ENVIRONMENT: Production
ASPNETCORE_URLS: http://+:8080
API_BASE_URL: http:/localhost:8082  # Adjust to your server IP
```

## API Endpoints

### Upload Recipe
```http
POST /api/recipes
Content-Type: multipart/form-data

Parameters:
- rating: 0 (unknown), 1 (dislike), 2 (like), 3 (love)
- images[]: Multiple image files

Response:
{
  "recipeId": "20250101_120000_abc123"
}
```

### Health Check
```http
GET /health
```

## Usage

1. **Open the web app** on your mobile device
2. **Tap the camera icon** to take photos or select from gallery
3. **Select a rating** (Unknown, Dislike, Like, Love)
4. **Upload** the recipe
5. **View confirmation** and take another photo or refresh

### Rating Guide

- **⚪ Unknown** (0) - Default, no opinion yet
- **🔴 Dislike** (1) - Not recommended
- **🟡 Like** (2) - Good, would make again
- **💚 Love** (3) - Favorite, highly recommended

## Storage

Recipes are stored on disk with the following structure:

```
/recipes/
└── 20250101_120000_abc123/
    ├── recipe.json           # Metadata (rating, timestamp)
    ├── image_001.jpg         # First photo
    ├── image_002.jpg         # Second photo
    └── ...
```

## Browser Compatibility

✅ Tested and working:
- Chrome (Android/iOS/Desktop)
- Safari (iOS/Desktop)
- Edge (Android/iOS/Desktop)
- Firefox (Android/Desktop)

## Development

### Adding Features

1. Update models in `WhatsForSupper.Import.ApiService/Models/`
2. Modify API logic in `WhatsForSupper.Import.ApiService/Program.cs`
3. Update frontend in `WhatsForSupper.Import.WebJS/wwwroot/`
4. Test locally with Aspire
5. Build and test Docker images

### Testing

**Unit/Integration Tests:** (To be added)
```bash
dotnet test
```

**Manual Testing:**
1. Run with Aspire AppHost
2. Test on desktop browser
3. Test on mobile devices (Chrome, Safari)
4. Test Docker deployment

## Troubleshooting

### Issue: Web app can't reach API

**Check:**
1. Verify `API_BASE_URL` environment variable is set correctly
2. Check browser console (F12) for network errors
3. Test API directly: `curl http://localhost:8082/health`
4. Review CORS configuration in API service

## Performance Metrics

- **Docker image size:** ~50-100MB (WebJS), ~200MB (API)
- **Load time (3G):** ~1 second
- **Memory usage:** ~2-3MB frontend
- **Concurrent uploads:** Limited by ASP.NET Core configuration

## Experiment Goals

1. ✅ Create lightweight mobile recipe capture interface
2. ✅ Avoid WebSocket dependencies for broader compatibility
3. ✅ Use vanilla JavaScript to minimize bundle size
4. ✅ Deploy with Docker for easy hosting
5. ⏳ Future: Add recipe management UI

## Related Documentation

- [WebJS Frontend Details](WhatsForSupper.Import.WebJS/README.md)
- [Main Project Repository](https://github.com/AlexandreBrisebois/whats-for-supper)

## Contributing

This is an experimental project. When making changes:
1. Test on both desktop and mobile browsers
2. Ensure Docker builds complete successfully
3. Update relevant README files
4. Follow existing code style (minimal comments, clean code)

## License

MIT (same as parent project)

## Contact

For questions or issues related to this experiment, please open an issue in the main repository.
