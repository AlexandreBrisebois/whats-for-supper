#!/bin/bash
set -e

echo "Installing System Utilities..."
sudo apt-get update
sudo apt-get install -y \
    jq \
    lsof \
    postgresql-client \
    curl \
    git

# Install Task (go-task)
echo "Installing Taskfile CLI..."
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin v3.41.0

# Install Python dependencies for your automation
echo "Installing Python dependencies..."
pip3 install PyYAML

# Optional: Install Playwright browsers (for your test:e2e task)
# echo "Installing Playwright Browsers..."
# npx playwright install --with-deps

echo "✓ Dev Container tools installed successfully!"