#!/bin/bash

set -eux

solana-keygen new --no-bip39-passphrase -o $HOME/.solana/validator-keypair.json
solana-keygen new --no-bip39-passphrase -o $HOME/.solana/vote-account-keypair.json
solana-keygen new --no-bip39-passphrase -o $HOME/.solana/stake-account-keypair.json

solana-genesis \
  --max-genesis-archive-unpacked-size 1073741824 \
  --enable-warmup-epochs \
  --bootstrap-validator \
    $HOME/.solana/validator-keypair.json \
    $HOME/.solana/vote-account-keypair.json \
    $HOME/.solana/stake-account-keypair.json \
  --ledger $HOME/.solana/ledger
