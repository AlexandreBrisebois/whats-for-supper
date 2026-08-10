# =============================================================================
# Stage 1 — Base (Chiseled for Production Runtime)
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:11.0-preview-resolute-chiseled AS base
WORKDIR /app
EXPOSE 9001
ENV ASPNETCORE_URLS=http://+:9001

# =============================================================================
# Stage 2 — Dependency Extractor (Ubuntu Resolute)
# =============================================================================
FROM ubuntu:resolute AS extractor
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

# Robust architecture-agnostic library extraction for GSSAPI
RUN LIB_PATH=$(find /usr/lib -name "libgssapi_krb5.so.2" | head -n 1 | xargs dirname) && \
    mkdir -p /rootfs${LIB_PATH} && \
    cp -P ${LIB_PATH}/libgssapi_krb5.so* /rootfs${LIB_PATH}/ && \
    cp -P ${LIB_PATH}/libkrb5.so* /rootfs${LIB_PATH}/ && \
    cp -P ${LIB_PATH}/libk5crypto.so* /rootfs${LIB_PATH}/ && \
    cp -P ${LIB_PATH}/libcom_err.so* /rootfs${LIB_PATH}/ && \
    cp -P ${LIB_PATH}/libkrb5support.so* /rootfs${LIB_PATH}/ && \
    cp -P ${LIB_PATH}/libkeyutils.so* /rootfs${LIB_PATH}/

# =============================================================================
# Stage 3 — Development (Hot Reload)
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:11.0.100-preview.6-resolute AS development
WORKDIR /src
# Workaround for JIT crashes under QEMU emulation (Mac ARM64 -> Linux AMD64)
ENV DOTNET_EnableWriteXorExecute=0
COPY RecipeApi.csproj ./
RUN dotnet restore RecipeApi.csproj
COPY . .
ENTRYPOINT ["dotnet", "watch", "run", "--project", "RecipeApi.csproj", "--urls", "http://+:9001"]

# =============================================================================
# Stage 4 — Build (Pinned SDK + QEMU Workaround)
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:11.0.100-preview.6-resolute AS build
WORKDIR /src
# Workaround for JIT crashes under QEMU emulation (Mac ARM64 -> Linux AMD64)
ENV DOTNET_EnableWriteXorExecute=0
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
# Stage 5 — Production (Chiseled - NAS Environment)
# =============================================================================
FROM base AS production
WORKDIR /app
COPY --from=extractor /rootfs /
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RecipeApi.dll"]

# =============================================================================
# Stage 6 — Demo (AWS Lambda Environment)
# =============================================================================
FROM production AS demo
# Install AWS Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
# Inherits ENTRYPOINT and WORKDIR from the production stage
