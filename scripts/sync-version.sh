#!/bin/bash

# Exit on error
set -e

# Function to read version from VERSION file
read_version() {
    cat VERSION | tr -d '[:space:]'
}

# Function to sync version across all files
sync_version() {
    local version=$1
    echo "Syncing version $version across all files..."

    # Update Chart.yaml
    echo "Updating Chart.yaml..."
    sed -i '' "s/^version: .*/version: $version/" starship/charts/devnet/Chart.yaml

    # Update root package.json
    echo "Updating root package.json..."
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$version\"/" clients/js/package.json

    # Update all package.json files in packages
    echo "Updating package.json files in packages..."
    find clients/js/packages -name "package.json" -exec sed -i '' "s/\"version\": \".*\"/\"version\": \"$version\"/" {} \;

    echo "Version sync complete!"
}

# Main script logic
case "$1" in
    "read")
        read_version
        ;;
    "sync")
        version=$(read_version)
        sync_version "$version"
        ;;
    *)
        echo "Usage: $0 {read|sync}"
        exit 1
        ;;
esac 