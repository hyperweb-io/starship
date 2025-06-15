#!/bin/bash

set -euxo pipefail

DENOM="${DENOM:=uatom}"
CHAIN_ID="${CHAIN_ID:=cosmoshub-1}"
CHAIN_BIN="${CHAIN_BIN:=gaiad}"
NODE_URL="${NODE_URL:=http://0.0.0.0:26657}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

PROPOSAL_FILE="${PROPOSAL_FILE}"
KEY_NAME="ics-setup"
MAX_RETRIES=3
RETRY_INTERVAL=30
SUBMIT_PROPOSAL_CMD=""

add_key() {
  # Add test keys to the keyring and self delegate initial coins
  echo "Adding key...." $(jq -r ".keys[0].name" $KEYS_CONFIG)
  jq -r ".keys[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $KEY_NAME --recover --keyring-backend="test"
  echo $($CHAIN_BIN keys show -a $KEY_NAME --keyring-backend="test")
}

get_validator_address() {
  echo "Getting validator address..."
  VALIDATOR_ADDRESS=$($CHAIN_BIN q staking validators --node $NODE_URL --output json | jq -r '.validators[0].operator_address')
  echo "Selected validator address: $VALIDATOR_ADDRESS"
}

stake_tokens() {
  COINS="10000000$DENOM"
  echo "Staking tokens..."
  $CHAIN_BIN tx staking delegate $VALIDATOR_ADDRESS $COINS \
    --from $KEY_NAME \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --keyring-backend="test" \
    --gas auto --gas-adjustment 2 \
    --output json \
    --yes
  sleep 5
}

determine_proposal_command() {
  echo "Determining the correct command to submit proposals..."
  HELP_OUTPUT=$($CHAIN_BIN tx gov --help)
  if echo "$HELP_OUTPUT" | grep -q "submit-legacy-proposal"; then
    SUBMIT_PROPOSAL_CMD="submit-legacy-proposal"
  else
    SUBMIT_PROPOSAL_CMD="submit-proposal"
  fi
  echo "Using $SUBMIT_PROPOSAL_CMD for submitting proposals."
}

submit_proposal() {
  echo "Get all proposals"
  PROPOSALS_OUTPUT=$($CHAIN_BIN query gov proposals --output json --node $NODE_URL 2>&1 || true)
  if echo "$PROPOSALS_OUTPUT" | grep -q "no proposals found"; then
    echo "No existing proposals found. Proceeding to submit a new proposal."
  else
    echo "Existing proposals: $PROPOSALS_OUTPUT"
  fi

  echo "Submit gov proposal on chain"
  PROPOSAL_TX=$($CHAIN_BIN tx gov $SUBMIT_PROPOSAL_CMD consumer-addition $PROPOSAL_FILE \
    --from $KEY_NAME \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --keyring-backend="test" \
    --gas auto --gas-adjustment 2 \
    --output json \
    --yes)
  echo $PROPOSAL_TX

  # Extract JSON part from the output
  TX_HASH=$(echo "$PROPOSAL_TX" | grep -o '{.*}' | jq -r '.txhash')
  if [ -n "$TX_HASH" ]; then
    echo "Transaction hash: $TX_HASH"
  else
    echo "Failed to submit proposal. Output was not as expected."
    exit 1
  fi

  sleep 5
}

get_proposal_id() {
  echo "Getting proposal ID"
  PROPOSAL_QUERY=$(gaiad query tx $TX_HASH --node $NODE_URL --output json)
  LOGS=$(echo $PROPOSAL_QUERY | jq -r '.logs')
  if [ "$LOGS" != "null" ] && [ "$LOGS" != "[]" ]; then
    PROPOSAL_ID=$(echo $PROPOSAL_QUERY | jq -r '.logs[0].events[] | select(.type=="submit_proposal").attributes[] | select(.key=="proposal_id").value')
    if [ -n "$PROPOSAL_ID" ]; then
      echo "Proposal ID: $PROPOSAL_ID"
      return 0
    fi
  fi
  echo "Failed to retrieve proposal ID from transaction logs. Logs might be empty."
  exit 1
}

vote_proposal() {
  echo "Voting on proposal"
  $CHAIN_BIN tx gov vote $PROPOSAL_ID yes \
    --from $KEY_NAME \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --keyring-backend="test" \
    --gas auto --gas-adjustment 2 \
    --output json \
    --yes
  sleep 5
}

wait_for_proposal_to_pass() {
  echo "Waiting for proposal to pass"
  for ((i=1; i<=$MAX_RETRIES; i++)); do
    STATUS=$($CHAIN_BIN query gov proposal $PROPOSAL_ID --node $NODE_URL --output json | jq -r '.status')
    if [ "$STATUS" == "PROPOSAL_STATUS_PASSED" ]; then
      echo "Proposal has passed!"
      return 0
    else
      echo "Current status: $STATUS. Attempt $i/$MAX_RETRIES. Waiting..."
      sleep $RETRY_INTERVAL
    fi
  done
  echo "Proposal did not pass after $MAX_RETRIES attempts."
  exit 1
}

main() {
  add_key
  get_validator_address
  stake_tokens
  determine_proposal_command
  submit_proposal
  get_proposal_id
  vote_proposal
  wait_for_proposal_to_pass
}

main
