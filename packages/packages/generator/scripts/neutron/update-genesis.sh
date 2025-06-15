#!/bin/bash

DENOM="${DENOM:=uosmo}"
CHAIN_BIN="${CHAIN_BIN:=osmosisd}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.osmosisd}"

set -eux

ls $CHAIN_DIR/config

$CHAIN_BIN tendermint show-node-id
