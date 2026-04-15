# =============================================================================
# Stage 1 — Build
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore dependencies first (layer-cache friendly)
COPY RecipeApi.csproj ./
RUN dotnet restore RecipeApi.csproj

# Copy source and publish
COPY src/ src/
RUN dotnet publish RecipeApi.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

# =============================================================================
# Stage 2 — Runtime (Ubuntu Noble)
#
# Using regular Ubuntu image instead of chiseled for dev/debugging visibility.
# For production, switch to chiseled: mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgssapi-krb5-2 \
 && rm -rf /var/lib/apt/lists/*

EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "RecipeApi.dll"]
