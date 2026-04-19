# =============================================================================
# Stage 1 — Base
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS base
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

# =============================================================================
# Stage 2 — Development (Hot Reload)
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS development
WORKDIR /src
COPY RecipeApi.csproj ./
RUN dotnet restore RecipeApi.csproj
COPY . .
# dotnet watch run uses the source code mounted via volume
ENTRYPOINT ["dotnet", "watch", "run", "--project", "RecipeApi.csproj", "--urls", "http://+:5000"]

# =============================================================================
# Stage 3 — Build
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
WORKDIR /src
COPY RecipeApi.csproj ./
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore RecipeApi.csproj
COPY . .
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish RecipeApi.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

# =============================================================================
# Stage 4 — Production (Full Ubuntu Noble)
#
# ADR 006: High-Efficiency Containerization - Standard Image for compatibility
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS production
WORKDIR /app
# Install Kerberos libraries required by Npgsql
USER root
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*
USER $APP_UID
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RecipeApi.dll"]
