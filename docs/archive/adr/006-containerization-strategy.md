# ADR 006: High-Efficiency Containerization & Native AOT
# Status: Accepted

## Context
Deploying to a home NAS environment imposes strict resource constraints (RAM and storage). To ensure the "What's For Supper" ecosystem remains lightweight and responsive, we need a deployment strategy that minimizes the container footprint and startup time.

## Decision
We will implement the Recipe API (and future services where applicable) using **.NET 10** with **Native AOT (Ahead-of-Time)** compilation, deployed on **Ubuntu Chiseled** container images.

### Key Components
1. **.NET 10 Minimal APIs**: Used for a low-overhead web server implementation.
2. **Native AOT**: The application will be compiled directly to machine code, removing the need for the JIT compiler and the full .NET Runtime in the production container.
3. **Ubuntu Chiseled Images**: We will use `mcr.microsoft.com/dotnet/nightly/runtime-deps:10.0-noble-chiseled` as the base for production. These images contain only the minimal dependencies required to run the native binary, without a shell, package manager, or unnecessary libraries.

## Rationale
- **Minimal Footprint**: Native AOT with Chiseled images can reduce container sizes to < 50MB and RAM usage to < 40MB.
- **Fast Startup**: Native binaries start instantly, which is crucial for container restarts on NAS hardware.
- **Security**: Chiseled images lack a shell and other common attack vectors, significantly hardening the service.
- **NAS Optimization**: By minimizing CPU and RAM overhead, we leave more resources for the AI models and the PostgreSQL database.

## Consequences
- **Build Complexity**: Requires a multi-stage Docker build with a full SDK (Ubuntu-based) for compilation, and a Chiseled base for the final image.
- **Platform Specificity**: Native AOT binaries are platform-dependent; the build process must target the NAS architecture (likely `linux-x64` or `linux-arm64`).
- **Limited Debugging**: No shell in the production container makes "exec-ing" into it more difficult; logs must be the primary diagnostic tool.

## Participants
- **Architect Alex** (Infrastructure Lead)
- **Gopher Greg** (The Resource Optimizer)
- **DotNet Dan** (The Reliable Pro)
