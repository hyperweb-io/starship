#!/bin/bash

DENOM="${DENOM:=uosmo}"
COINS="${COINS:=100000000000000000uosmo}"
CHAIN_ID="${CHAIN_ID:=osmosis}"
CHAIN_BIN="${CHAIN_BIN:=osmosisd}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.osmosisd}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

set -eu

# check if the binary has genesis subcommand or not, if not, set CHAIN_GENESIS_CMD to empty
CHAIN_GENESIS_CMD=$($CHAIN_BIN 2>&1 | grep -q "genesis-related subcommands" && echo "genesis" || echo "")

CHAIN_INIT_ID="$CHAIN_ID"
if [ "$CHAIN_BIN" == "osmosisd" ]; then
  CHAIN_INIT_ID="test-1"
fi
jq -r ".genesis[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN init $CHAIN_ID --chain-id $CHAIN_INIT_ID --recover
sed -i -e "s/$CHAIN_INIT_ID/$CHAIN_ID/g" $CHAIN_DIR/config/genesis.json

# Add genesis keys to the keyring and self delegate initial coins
echo "Adding key...." $(jq -r ".genesis[0].name" $KEYS_CONFIG)
jq -r ".genesis[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".genesis[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $(jq -r .genesis[0].name $KEYS_CONFIG) --keyring-backend="test") $COINS --keyring-backend="test"


# Add faucet key to the keyring and self delegate initial coins
echo "Adding key...." $(jq -r ".faucet[0].name" $KEYS_CONFIG)
jq -r ".faucet[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".faucet[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $(jq -r .faucet[0].name $KEYS_CONFIG) --keyring-backend="test") $COINS --keyring-backend="test"

# Add relayer key and delegate tokens
echo "Adding key...." $(jq -r ".relayers[0].name" $KEYS_CONFIG)
jq -r ".relayers[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".relayers[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $(jq -r .relayers[0].name $KEYS_CONFIG) --keyring-backend="test") $COINS --keyring-backend="test"

echo "Creating gentx..."
$CHAIN_BIN $CHAIN_GENESIS_CMD gentx $(jq -r ".genesis[0].name" $KEYS_CONFIG) 5000000000$DENOM --keyring-backend="test" --chain-id $CHAIN_ID

echo "Output of gentx"
cat $CHAIN_DIR/config/gentx/*.json | jq

echo "Running collect-gentxs"
$CHAIN_BIN $CHAIN_GENESIS_CMD collect-gentxs

ls $CHAIN_DIR/config
