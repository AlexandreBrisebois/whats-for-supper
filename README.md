# What's for Supper? 🍽️

A modular .NET application with React frontend that enables family members to vote on supper options.

![Application Screenshot](https://github.com/user-attachments/assets/da3ebb4d-c8a8-4cb9-b85d-cd205917fcad)

## Features

- 👨‍👩‍👧‍👦 **Family Member Selection**: Choose who you are before voting
- 🍕 **Supper Options**: View available meal options with descriptions
- 🗳️ **Voting System**: Vote for your preferred supper option
- 📊 **Real-time Results**: See voting results with progress bars and rankings
- ➕ **Add Options**: Family members can add new supper options
- 🔄 **Live Updates**: Results update in real-time as votes are cast

## Architecture

This application follows a modular .NET architecture:

- **WhatsForSupper.Api**: ASP.NET Core Web API with Entity Framework and SQLite
- **whats-for-supper-web**: React TypeScript frontend built with Vite
- **WhatsForSupper.AppHost**: Application orchestrator to manage all services
- **WhatsForSupper.ServiceDefaults**: Shared configuration and services

## Quick Start

### Option 1: Using the AppHost (Recommended)

```bash
# Navigate to the AppHost project
cd src/WhatsForSupper.AppHost

# Run the application orchestrator
dotnet run
```

This will automatically start both the API and React frontend services.

### Option 2: Manual Start

**Start the API:**
```bash
cd src/WhatsForSupper.Api
dotnet run --urls http://localhost:5223
```

**Start the React Frontend:**
```bash
cd src/whats-for-supper-web
npm install
npm run dev
```

## Application URLs

- **Frontend**: http://localhost:5173
- **API**: http://localhost:5223
- **API Documentation**: http://localhost:5223/swagger

## How to Use

1. **Select Family Member**: Choose your name from the buttons or enter a custom name
2. **View Options**: Browse the available supper options with descriptions and vote counts
3. **Vote**: Click "Vote for this!" on your preferred option
4. **View Results**: Click "Show Results" to see real-time voting statistics
5. **Add Options**: Click "Add Option" to suggest new supper choices

## API Endpoints

- `GET /api/supper-options` - Get all supper options
- `POST /api/supper-options` - Create a new supper option
- `POST /api/votes` - Cast a vote
- `DELETE /api/votes/{familyMember}/{supperOptionId}` - Remove a vote
- `GET /api/voting-results` - Get voting results with rankings

## Technology Stack

- **Backend**: .NET 8, ASP.NET Core, Entity Framework Core, SQLite
- **Frontend**: React 18, TypeScript, Vite, Axios
- **Styling**: Custom CSS with responsive design
- **Database**: SQLite (for simplicity)

## Development

The application uses Entity Framework migrations and will automatically create the database on first run. Sample data (Pizza, Pasta, Tacos) is seeded automatically.

### Prerequisites

- .NET 8 SDK
- Node.js 18+ and npm
- Git