# WhatsForSupper.Import.WebJS

JavaScript-based web frontend for the What's for Supper recipe import application.

## Overview

This is a lightweight, vanilla JavaScript web application for importing recipes with photos and ratings. It provides a mobile-first experience without requiring WebSocket connections, making it highly compatible with all mobile browsers.

## Features

- ? **No WebSocket dependency** - Works on all mobile browsers
- ? **Smaller Docker image** - ~50-100MB
- ? **Faster load times** - Static assets with no framework overhead
- ? **Mobile-optimized** - Designed for phone/tablet use
- ? **Configurable API URL** - Set via environment variables

## Architecture

- **Frontend**: Vanilla JavaScript (no framework)
- **Backend**: ASP.NET Core 10 (serves static files + config endpoint)
- **API**: Uses `WhatsForSupper.Import.ApiService`
- **Styling**: Custom CSS with modern design system

## Project Structure

```
WhatsForSupper.Import.WebJS/
??? Program.cs                  # ASP.NET Core app configuration
??? Dockerfile                  # Docker build configuration
??? appsettings.json           # Configuration
??? wwwroot/
?   ??? index.html             # Main HTML page
?   ??? css/
?   ?   ??? app.css            # Styles
?   ??? js/
?       ??? app.js             # Main JavaScript application
??? Properties/
    ??? launchSettings.json    # Launch configuration
```

## Configuration

### API URL Configuration

The app reads the API base URL from the following sources (in order of precedence):

1. **Environment Variable** (Docker/Production):
   ```bash
   API_BASE_URL=http://whatsforsupper-import-apiservice:8080
   ```

2. **Configuration File** (appsettings.json):
   ```json
   {
     "API_BASE_URL": "http://localhost:5474"
   }
   ```

3. **Fallback Default**: `http://localhost:5474`

### Docker Environment Variables

When running in Docker, configure these environment variables:

```yaml
environment:
  ASPNETCORE_ENVIRONMENT: Production
  ASPNETCORE_URLS: http://+:8080
  API_BASE_URL: http://whatsforsupper-import-apiservice:8080
```

The app exposes an `/api/config` endpoint that the frontend calls to get the API URL dynamically at runtime.

## Development

### Running Locally

1. **Using Visual Studio:**
   - Open the solution
   - Set `WhatsForSupper.Import.AppHost` as startup project
   - Press F5
   - Access at: http://localhost:5001

2. **Using CLI:**
   ```bash
   cd WhatsForSupper.Import.WebJS
   dotnet run
   ```

3. **Using Docker:**
   ```bash
   docker-compose -f docker-compose.synology.yml up -d
   ```

## Deployment

### Docker Build & Push

Use the publish script to build and push images:

```powershell
.\publish-images.ps1 -Registry "192.168.1.226:5050" -Tag "0.1.0.17"
```

This builds and pushes:
- `whatsforsupper-import-apiservice`
- `whatsforsupper-import-webjs`

### Docker Compose Deployment

Deploy using the docker-compose file:

```bash
docker-compose -f docker-compose.synology.yml up -d
```

**Ports:**
- API: `8082` ? http://your-server:8082
- Web: `8080` ? http://your-server:8080

### Environment Variables for Production

```yaml
services:
  whatsforsupper-import-apiservice:
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: http://+:8080
      RECIPES_ROOT: /recipes
    volumes:
      - ./recipes:/recipes
    ports:
      - "8082:8080"

  whatsforsupper-import-webjs:
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: http://+:8080
      # Configure the API URL the web app will use
      API_BASE_URL: http://whatsforsupper-import-apiservice:8080
    depends_on:
      - whatsforsupper-import-apiservice
    ports:
      - "8080:8080"
```

## API Integration

The app uses these API endpoints:

- **POST** `/api/recipes` - Upload recipe with photos and rating
  - Accepts: `multipart/form-data`
  - Parameters: `rating` (0=unknown, 1=dislike, 2=like, 3=love), `images[]`
  
- **GET** `/health` - Health check endpoint

The JavaScript code fetches the API URL dynamically:

```javascript
// Get configuration from backend
const response = await fetch('/api/config');
const config = await response.json();
state.apiBaseUrl = config.apiBaseUrl;

// Use API URL for requests
const response = await fetch(`${state.apiBaseUrl}/api/recipes`, {
    method: 'POST',
    body: formData
});
```

## Features

### Photo Upload
- Multiple photo selection
- Camera capture on mobile devices
- Preview with remove functionality
- 10MB file size limit
- Automatic file input clearing (Android fix)

### Rating System
- **Unknown** (?) - Default, no opinion
- **Dislike** (??) - Rating 1
- **Like** (??) - Rating 2
- **Love** (??) - Rating 3

### Mobile Optimizations
- Touch-friendly UI
- Large tap targets
- Responsive design
- Proper viewport settings
- Hardware camera access

## Browser Compatibility

? **Fully Tested:**
- Chrome (Android/iOS/Desktop)
- Safari (iOS/Desktop)
- Edge (Android/iOS/Desktop)
- Firefox (Android/Desktop)

? **Known Issues Fixed:**
- Android camera capture delay
- Edge on iPad loading issues
- Photo upload on mobile browsers
- X button clipping on image corners

## Troubleshooting

### Issue: Photos not uploading

**Check 1:** Browser console for errors (F12)
```javascript
console.log(state.apiBaseUrl); // Check API URL
```

**Check 2:** CORS configuration
- Ensure API service has CORS enabled (already configured)
- Check network tab for blocked requests

**Check 3:** API service is running
```bash
curl http://localhost:8082/health
```

### Issue: API URL not found

**Solution:** Verify environment variable is set in docker-compose:
```yaml
environment:
  API_BASE_URL: http://whatsforsupper-import-apiservice:8080
```

### Issue: First photo is ignored (Android)

**Solution:** Already fixed! Delay is added before clearing file input:
```javascript
setTimeout(() => {
    elements.photoInput.value = '';
}, 100);
```

## Performance

**Load time** (3G connection): ~1 second
**Memory usage**: ~2-3MB
**Docker image size**: ~50-100MB

## Development Tips

### Adding New Features

1. Update HTML in `wwwroot/index.html`
2. Add styling to `wwwroot/css/app.css`
3. Implement logic in `wwwroot/js/app.js`
4. Test on mobile browsers
5. Update README

### Debugging

Enable browser console logging:
```javascript
console.log('Rating buttons found:', elements.ratingButtons.length);
console.log('Initial rating set to:', state.selectedRating);
```

### Hard Refresh

After code changes, use hard refresh to clear cache:
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R

## Contributing

When making changes:
1. Test on both desktop and mobile browsers
2. Ensure Docker build works
3. Update README if adding features
4. Follow existing code style

## License

MIT (same as parent project)
