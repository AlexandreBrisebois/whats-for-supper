#!/bin/sh
# Build and push API and PWA images for production with a version tag

set -e

# Always run from repo root
cd "$(dirname "$0")/.."

REGISTRY=192.168.1.226:5050
TAG=${1:-v0.1}

# Build and push API for linux/amd64 only (Apple Silicon workaround)
echo "Building and pushing API image for linux/amd64..."
docker buildx build --platform linux/amd64 -t $REGISTRY/whats-for-supper-api:$TAG ./api --push --load

# Build and push PWA for linux/amd64 only (Apple Silicon workaround)
echo "Building and pushing PWA image for linux/amd64..."
docker buildx build --platform linux/amd64 -t $REGISTRY/whats-for-supper-pwa:$TAG ./pwa --push --load

echo "Build and push complete for tag $TAG."
