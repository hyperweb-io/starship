#!/bin/bash

DENOM="${DENOM:=uosmo}"
CHAIN_BIN="${CHAIN_BIN:=osmosisd}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.osmosisd}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"
VAL_NAME="${VAL_NAME:=osmosis}"
NODE_URL="${NODE_URL:=http://0.0.0.0:26657}"
NODE_ARGS="${NODE_ARGS}"
GAS="${GAS:=auto}"

set -eux

# Wait for the node to be synced
max_tries=10
while [[ $($CHAIN_BIN status --output json --node $NODE_URL 2>&1 | jq ".SyncInfo.catching_up") == true ]]
do
  if [[ max_tries -lt 0 ]]; then echo "Not able to sync with genesis node"; exit 1; fi
  echo "Still syncing... Sleeping for 15 secs. Tries left $max_tries"
  ((max_tries--))
  sleep 30
done

# Function to compare version numbers
version_compare() {
    version1="$1"
    version2="$2"
    if [[ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n 1)" == "$version1" ]]; then
        return 1 # version1 is greater
    else
        return 0 # version2 is greater or equal
    fi
}

# Check if cosmos_sdk_version is greater than a specified version
is_greater() {
    version_compare "$1" "$2"
    return $?
}

function cosmos-sdk-version-v50() {
  # Content for the validator.json file
  json_content='{
    "pubkey": '$($CHAIN_BIN tendermint show-validator $NODE_ARGS)',
    "amount": "5000000000'$DENOM'",
    "moniker": "'$VAL_NAME'",
    "commission-rate": "0.1",
    "commission-max-rate": "0.2",
    "commission-max-change-rate": "0.01",
    "min-self-delegation": "1000000"
  }'
  echo "$json_content" > /validator.json
  cat /validator.json

  # Run create validator tx command
  echo "Running txn for create-validator"
  $CHAIN_BIN tx staking create-validator /validator.json \
    --node $NODE_URL \
    --chain-id $CHAIN_ID \
    --from $VAL_NAME \
    --fees 100000$DENOM \
    --keyring-backend="test" \
    --output json \
    --gas $GAS \
    --gas-adjustment 1.5 $NODE_ARGS --yes > /validator.log

  cat /validator.log | jq
}

function cosmos-sdk-version-default() {
  # Run create validator tx command
  echo "Running txn for create-validator"
  args=''
  if [[ $($CHAIN_BIN tx staking create-validator --help | grep -c "min-self-delegation") -gt 0 ]];
  then
    args+='--min-self-delegation=1000000'
  fi
  $CHAIN_BIN keys list --keyring-backend test --output json --home $CHAIN_DIR | jq
  $CHAIN_BIN tx staking create-validator \
    --node $NODE_URL \
    --pubkey=$($CHAIN_BIN tendermint show-validator $NODE_ARGS) \
    --moniker $VAL_NAME \
    --amount 5000000000$DENOM \
    --chain-id $CHAIN_ID \
    --from $VAL_NAME \
    --commission-rate="0.10" \
    --commission-max-rate="0.20" \
    --commission-max-change-rate="0.01" \
    --keyring-backend test \
    --home $CHAIN_DIR \
    --fees 100000$DENOM \
    --gas $GAS \
    --output json \
    --gas-adjustment 1.5 $args $NODE_ARGS --yes > /validator.log

  cat /validator.log | jq
}

set +e
# Fetch the cosmos-sdk version to be able to perform the create-validator tx
cosmos_sdk_version=$($CHAIN_BIN version --long | sed -n 's/cosmos_sdk_version: \(.*\)/\1/p')
echo "cosmos_sdk_version: $cosmos_sdk_version"
set -e

if is_greater "$cosmos_sdk_version" "v0.50.0"; then
  echo "cosmos_sdk_version is greater than v0.50.0, running create-validator tx with new format"
  cosmos-sdk-version-v50
else
  echo "cosmos_sdk_version is less than v0.50.0, running create-validator tx with old format"
  cosmos-sdk-version-default
fi
