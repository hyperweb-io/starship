#!/usr/bin/env bash

here=$(dirname "$0")
# shellcheck source=multinode-demo/common.sh
source "$here"/common.sh

# shellcheck source=net/common.sh
source "$(cd "$here"/..; pwd)"/net/common.sh

args=()
default_arg --entrypoint 127.0.0.1:8001
default_arg --faucet 127.0.0.1:9900
default_arg --tx_count 50000
default_arg --duration 90

exec "$solana_bench_tps" "${args[@]}" "$@" 