# Use Ubuntu as the base image
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Task (Taskfile runner)
RUN apt-get update \
    && apt-get install -y curl \
    && sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Install .NET 8 SDK
RUN curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 8.0 --install-dir /usr/share/dotnet \
    && ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet

# Install Node.js (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs

# Set up workspace
WORKDIR /workspace

# Default command
CMD ["sleep", "infinity"]
