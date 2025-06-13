#!/bin/bash

STAKEDENOM=${DENOM:-untrn}
CHAIN_ID="${CHAIN_ID:=osmosis}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.osmosisd}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

P2PPORT=${P2PPORT:-26656}
RPCPORT=${RPCPORT:-26657}
RESTPORT=${RESTPORT:-1317}
ROSETTA=${ROSETTA:-8080}

set -eux

ls $CHAIN_DIR

sed -i -e 's/timeout_commit = "5s"/timeout_commit = "1s"/g' "$CHAIN_DIR/config/config.toml"
sed -i -e 's/timeout_propose = "3s"/timeout_propose = "1s"/g' "$CHAIN_DIR/config/config.toml"
sed -i -e 's/index_all_keys = false/index_all_keys = true/g' "$CHAIN_DIR/config/config.toml"
sed -i -e 's/enable = false/enable = true/g' "$CHAIN_DIR/config/app.toml"
sed -i -e 's/swagger = false/swagger = true/g' "$CHAIN_DIR/config/app.toml"
sed -i -e "s/minimum-gas-prices = \"\"/minimum-gas-prices = \"0$STAKEDENOM\"/g" "$CHAIN_DIR/config/app.toml"
sed -i -e 's/enabled = false/enabled = true/g' "$CHAIN_DIR/config/app.toml"
sed -i -e 's/prometheus-retention-time = 0/prometheus-retention-time = 1000/g' "$CHAIN_DIR/config/app.toml"
sed -i -e 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' "$CHAIN_DIR/config/app.toml"

sed -i -e 's#"tcp://0.0.0.0:26656"#"tcp://0.0.0.0:'"$P2PPORT"'"#g' "$CHAIN_DIR/config/config.toml"
sed -i -e 's#"tcp://127.0.0.1:26657"#"tcp://0.0.0.0:'"$RPCPORT"'"#g' "$CHAIN_DIR/config/config.toml"
sed -i -e 's#"tcp://localhost:1317"#"tcp://0.0.0.0:'"$RESTPORT"'"#g' "$CHAIN_DIR/config/app.toml"
sed -i -e 's#"tcp://0.0.0.0:1317"#"tcp://0.0.0.0:'"$RESTPORT"'"#g' "$CHAIN_DIR/config/app.toml"
sed -i -e 's#":8080"#":'"$ROSETTA"'"#g' "$CHAIN_DIR/config/app.toml"
sed -i -e 's#localhost#0.0.0.0#g' "$CHAIN_DIR/config/app.toml"

echo "Update client.toml file"
sed -i -e 's#keyring-backend = "os"#keyring-backend = "test"#g' $CHAIN_DIR/config/client.toml
sed -i -e 's#output = "text"#output = "json"#g' $CHAIN_DIR/config/client.toml
sed -i -e "s#chain-id = \"\"#chain-id = \"$CHAIN_ID\"#g" $CHAIN_DIR/config/client.toml
