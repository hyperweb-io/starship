#!/usr/bin/env bash
#
# Start the bootstrap validator node
#
set -ex

here=$(dirname "$0")
source "$here"/common.sh

if [[ "$SOLANA_GPU_MISSING" -eq 1 ]]; then
  echo "Testnet requires GPUs, but none were found!  Aborting..."
  exit 1
fi

if [[ -n $SOLANA_CUDA ]]; then
  program=$agave_validator_cuda
else
  program=$agave_validator
fi

no_restart=0
maybeRequireTower=true

args=()
while [[ -n $1 ]]; do
  if [[ ${1:0:1} = - ]]; then
    if [[ $1 = --init-complete-file ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --bind-address ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --gossip-port ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --dev-halt-at-slot ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --dynamic-port-range ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --limit-ledger-size ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --no-rocksdb-compaction ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --enable-rpc-transaction-history ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --rpc-pubsub-enable-block-subscription ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --enable-cpi-and-log-storage ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --enable-extended-tx-metadata-storage ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --enable-rpc-bigtable-ledger-storage ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --tpu-disable-quic ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --tpu-enable-udp ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --rpc-send-batch-ms ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --rpc-send-batch-size ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --skip-poh-verify ]]; then
      args+=("$1")
      shift
    elif [[ $1 = --log ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 = --no-restart ]]; then
      no_restart=1
      shift
    elif [[ $1 == --wait-for-supermajority ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --expected-bank-hash ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --expected-shred-version ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --accounts ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --maximum-snapshots-to-retain ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --no-snapshot-fetch ]]; then
      args+=("$1")
      shift
    elif [[ $1 == --accounts-db-skip-shrink ]]; then
      args+=("$1")
      shift
    elif [[ $1 == --skip-require-tower ]]; then
      maybeRequireTower=false
      shift
    elif [[ $1 = --log-messages-bytes-limit ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --block-production-method ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --transaction-structure ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --wen-restart ]]; then
      args+=("$1" "$2")
      shift 2
    elif [[ $1 == --wen-restart-coordinator ]]; then
      args+=("$1" "$2")
      shift 2
    else
      echo "Unknown argument: $1"
      $program --help
      exit 1
    fi
  else
    echo "Unknown argument: $1"
    $program --help
    exit 1
  fi
done

# These keypairs are created by ./setup.sh and included in the genesis config
identity=$SOLANA_CONFIG_DIR/bootstrap-validator/identity.json
vote_account="$SOLANA_CONFIG_DIR"/bootstrap-validator/vote-account.json

ledger_dir="$SOLANA_CONFIG_DIR"/bootstrap-validator
[[ -d "$ledger_dir" ]] || {
  echo "$ledger_dir does not exist"
  echo
  echo "Please run: $here/setup.sh"
  exit 1
}

if [[ $maybeRequireTower = true ]]; then
  args+=(--require-tower)
fi

POD_IP=$(hostname -i | awk '{print $1}')

args+=(
  --ledger "$ledger_dir"
  --public-rpc-address $POD_IP:8899
  --bind-address 0.0.0.0
  --rpc-bind-address 0.0.0.0
  --rpc-port 8899
  --gossip-host $POD_IP
  --snapshot-interval-slots 200
  --no-incremental-snapshots
  --identity "$identity"
  --vote-account "$vote_account"
  --rpc-faucet-address 0.0.0.0:9900
  --no-poh-speed-test
  --no-os-network-limits-test
  --no-wait-for-vote-to-start-leader
  --full-rpc-api
  --allow-private-addr
)
default_arg --gossip-port 8001
default_arg --log -

$program "${args[@]}"
