#!/bin/bash

DENOM="${DENOM:=uosmo}"
COINS="${COINS:=100000000000000000inj}"
CHAIN_ID="${CHAIN_ID:=injective}"
CHAIN_BIN="${CHAIN_BIN:=injectived}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.injectived}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

FEEDADMIN="inj1k2z3chspuk9wsufle69svmtmnlc07rvw9djya7"

set -eu

# check if the binary has genesis subcommand or not, if not, set CHAIN_GENESIS_CMD to empty
CHAIN_GENESIS_CMD=$($CHAIN_BIN 2>&1 | grep -q "genesis-related subcommands" && echo "genesis" || echo "")

jq -r ".genesis[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN init $CHAIN_ID --chain-id $CHAIN_ID --recover

WASM_KEY="wasm"
WASM_MNEMONIC="juice dog over thing anger search film document sight fork enrich jungle vacuum grab more sunset winner diesel flock smooth route impulse cheap toward"

VAL_KEY="localkey"
VAL_MNEMONIC="gesture inject test cycle original hollow east ridge hen combine junk child bacon zero hope comfort vacuum milk pitch cage oppose unhappy lunar seat"

USER1_KEY="user1"
USER1_MNEMONIC="copper push brief egg scan entry inform record adjust fossil boss egg comic alien upon aspect dry avoid interest fury window hint race symptom"

USER2_KEY="user2"
USER2_MNEMONIC="maximum display century economy unlock van census kite error heart snow filter midnight usage egg venture cash kick motor survey drastic edge muffin visual"

USER3_KEY="user3"
USER3_MNEMONIC="keep liar demand upon shed essence tip undo eagle run people strong sense another salute double peasant egg royal hair report winner student diamond"

USER4_KEY="user4"
USER4_MNEMONIC="pony glide frown crisp unfold lawn cup loan trial govern usual matrix theory wash fresh address pioneer between meadow visa buffalo keep gallery swear"

USER5_KEY="ocrfeedadmin"
USER5_MNEMONIC="earn front swamp dune level clip shell aware apple spare faith upset flip local regret loud suspect view heavy raccoon satisfy cupboard harbor basic"

USER6_KEY="signer1"
USER6_MNEMONIC="output arrange offer advance egg point office silent diamond fame heart hotel rocket sheriff resemble couple race crouch kit laptop document grape drastic lumber"

USER7_KEY="signer2"
USER7_MNEMONIC="velvet gesture rule caution injury stick property decorate raccoon physical narrow tuition address drum shoot pyramid record sport include rich actress sadness crater seek"

USER8_KEY="signer3"
USER8_MNEMONIC="guitar parrot nuclear sun blue marble amazing extend solar device address better chalk shock street absent follow notice female picnic into trade brass couch"

USER9_KEY="signer4"
USER9_MNEMONIC="rotate fame stamp size inform hurdle match stick brain shrimp fancy clinic soccer fortune photo gloom wear punch shed diet celery blossom tide bulk"

USER10_KEY="signer5"
USER10_MNEMONIC="apart acid night more advance december weather expect pause taxi reunion eternal crater crew lady chaos visual dynamic friend match glow flash couple tumble"

NEWLINE=$'\n'

# Import keys from mnemonics
echo "$WASM_MNEMONIC" | $CHAIN_BIN keys add $WASM_KEY --recover --keyring-backend="test"
yes "$VAL_MNEMONIC" | $CHAIN_BIN keys add $VAL_KEY --recover --keyring-backend="test"
yes "$USER1_MNEMONIC" | $CHAIN_BIN keys add $USER1_KEY --recover --keyring-backend="test"
yes "$USER2_MNEMONIC" | $CHAIN_BIN keys add $USER2_KEY --recover --keyring-backend="test"
yes "$USER3_MNEMONIC" | $CHAIN_BIN keys add $USER3_KEY --recover --keyring-backend="test"
yes "$USER4_MNEMONIC" | $CHAIN_BIN keys add $USER4_KEY --recover --keyring-backend="test"
yes "$USER5_MNEMONIC" | $CHAIN_BIN keys add $USER5_KEY --recover --keyring-backend="test"
yes "$USER6_MNEMONIC" | $CHAIN_BIN keys add $USER6_KEY --recover --keyring-backend="test"
yes "$USER7_MNEMONIC" | $CHAIN_BIN keys add $USER7_KEY --recover --keyring-backend="test"
yes "$USER8_MNEMONIC" | $CHAIN_BIN keys add $USER8_KEY --recover --keyring-backend="test"
yes "$USER9_MNEMONIC" | $CHAIN_BIN keys add $USER9_KEY --recover --keyring-backend="test"
yes "$USER10_MNEMONIC" | $CHAIN_BIN keys add $USER10_KEY --recover --keyring-backend="test"

# Add genesis keys to the keyring and self delegate initial coins
echo "Adding key...." $(jq -r ".genesis[0].name" $KEYS_CONFIG)
jq -r ".genesis[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".genesis[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show -a $(jq -r .genesis[0].name $KEYS_CONFIG) --keyring-backend="test") 1000000000000000000000000inj,1000000000000000000000000atom,100000000000000000000000000peggy0xdAC17F958D2ee523a2206206994597C13D831ec7,100000000000000000000000000peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 --keyring-backend="test"

# Add relayer keys to the keyring and self delegate initial coins
echo "Adding key...." $(jq -r ".relayers[0].name" $KEYS_CONFIG)
jq -r ".relayers[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".relayers[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show -a $(jq -r .relayers[0].name $KEYS_CONFIG) --keyring-backend="test") 1000000000000000000000000inj --keyring-backend="test"

# Add faucet keys to the keyring and self delegate initial coins
echo "Adding key...." $(jq -r ".faucet[0].name" $KEYS_CONFIG)
jq -r ".faucet[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".faucet[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show -a $(jq -r .faucet[0].name $KEYS_CONFIG) --keyring-backend="test") 1000000000000000000000000inj --keyring-backend="test"


# zero address account
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID inj1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqe2hm49 1inj

# Allocate genesis accounts (cosmos formatted addresses)
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $WASM_KEY -a --keyring-backend="test") 1000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $VAL_KEY -a --keyring-backend="test") 1000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER1_KEY -a --keyring-backend="test") 1000000000000000000000inj,1000000000000000000000atom,100000000000000000000000000peggy0xdAC17F958D2ee523a2206206994597C13D831ec7,100000000000000000000000000peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER2_KEY -a --keyring-backend="test") 1000000000000000000000inj,100000000000000000000000000peggy0xdAC17F958D2ee523a2206206994597C13D831ec7,100000000000000000000000000peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER3_KEY -a --keyring-backend="test") 1000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER4_KEY -a --keyring-backend="test") 1000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER5_KEY -a --keyring-backend="test") 100000000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER6_KEY -a --keyring-backend="test") 100000000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER7_KEY -a --keyring-backend="test") 100000000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER8_KEY -a --keyring-backend="test") 100000000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER9_KEY -a --keyring-backend="test") 100000000000000000000000000inj --keyring-backend="test"
$CHAIN_BIN add-genesis-account --chain-id $CHAIN_ID $($CHAIN_BIN keys show $USER10_KEY -a --keyring-backend="test") 100000000000000000000000000inj --keyring-backend="test"

echo "Creating gentx..."
$CHAIN_BIN $CHAIN_GENESIS_CMD gentx $(jq -r ".genesis[0].name" $KEYS_CONFIG) 1000000000000000000000inj --keyring-backend="test" --chain-id $CHAIN_ID

echo "Output of gentx"
cat $CHAIN_DIR/config/gentx/*.json | jq

echo "Running collect-gentxs"
$CHAIN_BIN $CHAIN_GENESIS_CMD collect-gentxs

echo "Validate genesis"
$CHAIN_BIN validate-genesis

ls $CHAIN_DIR/config
