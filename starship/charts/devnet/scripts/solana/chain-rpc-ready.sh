#!/bin/bash
# chain-rpc-ready.sh - Check if a Solana RPC service is ready
# Usage: chain-rpc-ready.sh [RPC_URL]

set -euo pipefail

RPC_URL=${1:-"http://localhost:8899"}

echo 1>&2 "Checking if Solana RPC at $RPC_URL is ready..."

# Check if the RPC URL is reachable
json=$(curl -s --connect-timeout 2 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  "$RPC_URL")

# Check if we got a valid response
if [ $? -ne 0 ]; then
  echo 1>&2 "$RPC_URL is not reachable"
  exit 1
fi

# Check if the response contains an error
if echo "$json" | jq -e '.error' > /dev/null 2>&1; then
  echo 1>&2 "$RPC_URL returned an error: $(echo "$json" | jq -r '.error.message // "Unknown error"')"
  exit 1
fi

# Check if the health status is ok
health_status=$(echo "$json" | jq -r '.result // "unknown"')
if [ "$health_status" != "ok" ]; then
  echo 1>&2 "$RPC_URL is not healthy: status is $health_status"
  exit 1
fi

# Get slot info to check if the node is processing blocks
slot_info=$(curl -s --connect-timeout 2 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
  "$RPC_URL")

# Check if we can get slot info
if [ $? -ne 0 ]; then
  echo 1>&2 "$RPC_URL slot info not available"
  exit 1
fi

# Check if slot is progressing (not stuck at 0)
current_slot=$(echo "$slot_info" | jq -r '.result // 0')
if [ "$current_slot" -eq 0 ]; then
  echo 1>&2 "$RPC_URL is not ready: slot is 0 (node may not be synced)"
  exit 1
fi

# Get epoch info to check if the node is properly synced
epoch_info=$(curl -s --connect-timeout 2 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getEpochInfo"}' \
  "$RPC_URL")

# Check if we can get epoch info
if [ $? -ne 0 ]; then
  echo 1>&2 "$RPC_URL epoch info not available"
  exit 1
fi

# Check if epoch info is valid
if echo "$epoch_info" | jq -e '.error' > /dev/null 2>&1; then
  echo 1>&2 "$RPC_URL epoch info error: $(echo "$epoch_info" | jq -r '.error.message // "Unknown error"')"
  exit 1
fi

# Get cluster nodes to check if the node is part of the network
cluster_info=$(curl -s --connect-timeout 2 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getClusterNodes"}' \
  "$RPC_URL")

# Check if we can get cluster info
if [ $? -ne 0 ]; then
  echo 1>&2 "$RPC_URL cluster info not available"
  exit 1
fi

# Check if cluster info is valid
if echo "$cluster_info" | jq -e '.error' > /dev/null 2>&1; then
  echo 1>&2 "$RPC_URL cluster info error: $(echo "$cluster_info" | jq -r '.error.message // "Unknown error"')"
  exit 1
fi

# Check if there are nodes in the cluster
node_count=$(echo "$cluster_info" | jq -r '.result | length // 0')
if [ "$node_count" -eq 0 ]; then
  echo 1>&2 "$RPC_URL is not ready: no nodes in cluster"
  exit 1
fi

echo 1>&2 "Solana RPC at $RPC_URL is ready and healthy"
echo "Health: $health_status, Slot: $current_slot, Cluster Nodes: $node_count"
exit 0
