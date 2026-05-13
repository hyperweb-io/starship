#!/bin/bash

DENOM="${DENOM:=uosmo}"
CHAIN_BIN="${CHAIN_BIN:=osmosisd}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.osmosisd}"
WASM_PERMISSIONLESS="${WASM_PERMISSIONLESS:=true}"

set -eu

ls $CHAIN_DIR/config

echo "Update genesis.json file with updated local params"
sed -i -e "s/\"stake\"/\"$DENOM\"/g" $CHAIN_DIR/config/genesis.json
sed -i "s/\"time_iota_ms\": \".*\"/\"time_iota_ms\": \"$TIME_IOTA_MS\"/" $CHAIN_DIR/config/genesis.json

jq -r '.app_state.staking.params.unbonding_time |= "15s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.slashing.params.downtime_jail_duration |= "6s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.gov.deposit_params.max_deposit_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.gov.deposit_params.min_deposit[0].amount |= "10"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.gov.voting_params.voting_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.gov.tally_params.quorum |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.gov.tally_params.threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.gov.tally_params.veto_threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# Set wasm as permissioned or permissionless based on environment variable
wasm_permission="Nobody"
if [ $WASM_PERMISSIONLESS == "true" ]
then
  wasm_permission="Everybody"
fi

jq -r ".app_state.wasm.params.code_upload_access.permission |= \"${wasm_permission}\"" $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r ".app_state.wasm.params.instantiate_default_permission |= \"${wasm_permission}\"" $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

$CHAIN_BIN tendermint show-node-id
