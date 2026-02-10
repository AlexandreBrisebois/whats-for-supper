# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["WhatsForSupper.Import.ApiService/WhatsForSupper.Import.ApiService.csproj", "WhatsForSupper.Import.ApiService/"]
COPY ["WhatsForSupper.Import.ServiceDefaults/WhatsForSupper.Import.ServiceDefaults.csproj", "WhatsForSupper.Import.ServiceDefaults/"]
RUN dotnet restore "./WhatsForSupper.Import.ApiService/WhatsForSupper.Import.ApiService.csproj"
COPY . .
WORKDIR "/src/WhatsForSupper.Import.ApiService"
RUN dotnet build "./WhatsForSupper.Import.ApiService.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./WhatsForSupper.Import.ApiService.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "WhatsForSupper.Import.ApiService.dll"]