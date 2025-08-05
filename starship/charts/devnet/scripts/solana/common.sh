# |source| this file
#
# Common utilities shared by other scripts in this directory
#
# The following directive disable complaints about unused variables in this
# file:
# shellcheck disable=2034
#

prebuild=
if [[ $1 = "--prebuild" ]]; then
  prebuild=true
fi

if [[ $(uname) != Linux ]]; then
  # Protect against unsupported configurations to prevent non-obvious errors
  # later. Arguably these should be fatal errors but for now prefer tolerance.
  if [[ -n $SOLANA_CUDA ]]; then
    echo "Warning: CUDA is not supported on $(uname)"
    SOLANA_CUDA=
  fi
fi

solana_program() {
  declare program="$1"
  if [[ -z $program ]]; then
    printf "solana"
  else
    if [[ $program == "validator" || $program == "ledger-tool" || $program == "watchtower" || $program == "install" ]]; then
      # Check if agave- prefixed binary exists
      if command -v "agave-$program" >/dev/null 2>&1; then
        printf "agave-%s" "$program"
      else
        printf "solana-%s" "$program"
      fi
    else
      printf "solana-%s" "$program"
    fi
  fi
}

solana_bench_tps=$(solana_program bench-tps)
solana_faucet=$(solana_program faucet)
agave_validator=$(solana_program validator)
agave_validator_cuda="$agave_validator --cuda"
solana_genesis=$(solana_program genesis)
solana_gossip=$(solana_program gossip)
solana_keygen=$(solana_program keygen)
solana_ledger_tool=$(solana_program ledger-tool)
solana_cli=$(solana_program)

export RUST_BACKTRACE=1

default_arg() {
  declare name=$1
  declare value=$2

  for arg in "${args[@]}"; do
    if [[ $arg = "$name" ]]; then
      return
    fi
  done

  if [[ -n $value ]]; then
    args+=("$name" "$value")
  else
    args+=("$name")
  fi
}

replace_arg() {
  declare name=$1
  declare value=$2

  default_arg "$name" "$value"

  declare index=0
  for arg in "${args[@]}"; do
    index=$((index + 1))
    if [[ $arg = "$name" ]]; then
      args[$index]="$value"
    fi
  done
}
