FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["WhatsForSupper.Import.WebJS/WhatsForSupper.Import.WebJS.csproj", "WhatsForSupper.Import.WebJS/"]
COPY ["WhatsForSupper.Import.ServiceDefaults/WhatsForSupper.Import.ServiceDefaults.csproj", "WhatsForSupper.Import.ServiceDefaults/"]
RUN dotnet restore "WhatsForSupper.Import.WebJS/WhatsForSupper.Import.WebJS.csproj"
COPY . .
WORKDIR "/src/WhatsForSupper.Import.WebJS"
RUN dotnet build "WhatsForSupper.Import.WebJS.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "WhatsForSupper.Import.WebJS.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Runtime configuration via environment variables:
# - API_BASE_URL: http://whatsforsupper-import-apiservice:8080
# - ASPNETCORE_URLS: URLs to listen on (default: http://+:8080)
# - ASPNETCORE_ENVIRONMENT: Environment name (Development/Production)
ENTRYPOINT ["dotnet", "WhatsForSupper.Import.WebJS.dll"]
