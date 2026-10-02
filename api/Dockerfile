# =============================================================================
# Stage 1 — Base (Chiseled for Production Runtime)
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:11.0.0-rc.1-resolute-chiseled AS base
WORKDIR /app
EXPOSE 9001
ENV ASPNETCORE_URLS=http://+:9001

# =============================================================================
# Stage 2 — Dependency Extractor (Ubuntu Resolute)
# =============================================================================
FROM ubuntu:resolute AS extractor
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgssapi-krb5-2 \
    fonts-dejavu-core \
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

# Fonts are baked into the chiseled image; never installed at startup.
RUN mkdir -p /rootfs/usr/share/fonts && cp -a /usr/share/fonts/truetype /rootfs/usr/share/fonts/

# =============================================================================
# Stage 3 — Development (Hot Reload)
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:11.0.100-rc.1-resolute AS development
WORKDIR /src
# Workaround for JIT crashes under QEMU emulation (Mac ARM64 -> Linux AMD64)
ENV DOTNET_EnableWriteXorExecute=0
COPY RecipeApi.csproj ./
COPY Directory.Build.props ./
RUN dotnet restore RecipeApi.csproj
COPY . .
ENTRYPOINT ["dotnet", "watch", "run", "--project", "RecipeApi.csproj", "--urls", "http://+:9001"]

# =============================================================================
# Stage 4 — Build (Pinned SDK + QEMU Workaround)
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:11.0.100-rc.1-resolute AS build
WORKDIR /src
# Workaround for JIT crashes under QEMU emulation (Mac ARM64 -> Linux AMD64)
ENV DOTNET_EnableWriteXorExecute=0
COPY RecipeApi.csproj ./
COPY Directory.Build.props ./
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore RecipeApi.csproj
COPY . .
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish RecipeApi.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

# Preserve the notices shipped with the pinned wrapper/native dependencies.
COPY licenses/ /app/publish/licenses/
RUN mkdir -p /app/publish/licenses/nuget && \
    find /root/.nuget/packages/pdftoimage /root/.nuget/packages/bblanchon.pdfium.linux \
         /root/.nuget/packages/skiasharp /root/.nuget/packages/skiasharp.nativeassets.linux.nodependencies \
         -type f \( -iname '*license*' -o -iname '*notice*' -o -iname '*copying*' \) \
         -exec cp --parents {} /app/publish/licenses/nuget/ \;

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
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter
# Inherits ENTRYPOINT and WORKDIR from the production stage

