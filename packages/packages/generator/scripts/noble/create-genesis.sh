#!/bin/bash

set -eux

DENOM="${DENOM:=uusdc}"
COINS="${COINS:=100000000000000uusdc,100000000000000ustake}"
CHAIN_ID="${CHAIN_ID:=noblelocal}"
CHAIN_BIN="${CHAIN_BIN:=nobled}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.nobled}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

FAUCET_ENABLED="${FAUCET_ENABLED:=true}"
NUM_VALIDATORS="${NUM_VALIDATORS:=1}"
NUM_RELAYERS="${NUM_RELAYERS:=0}"

# FiatTokenFactory roles
FIATTF_OWNER_KEY="fiattf_owner"
FIATTF_OWNER_MNEMONIC="gesture inject test cycle original hollow east ridge hen combine junk child bacon zero hope comfort vacuum milk pitch cage oppose unhappy lunar seat"

FIATTF_MASTER_MINTER_KEY="fiattf_master_minter"
FIATTF_MASTER_MINTER_MNEMONIC="maximum display century economy unlock van census kite error heart snow filter midnight usage egg venture cash kick motor survey drastic edge muffin visual"

FIATTF_MINTER_CONTROLLER_KEY="fiattf_minter_controller"
FIATTF_MINTER_CONTROLLER_MNEMONIC="keep liar demand upon shed essence tip undo eagle run people strong sense another salute double peasant egg royal hair report winner student diamond"

FIATTF_MINTER_CONTROLLER2_KEY="fiattf_minter_controller2"
FIATTF_MINTER_CONTROLLER2_MNEMONIC="morning person bachelor illegal inner note learn problem cement river half sentence junk evidence mercy intact step nasty cotton elite real unveil business drum"

FIATTF_MINTER_KEY="fiattf_minter"
FIATTF_MINTER_MNEMONIC="shed spike wish soda inside awake satoshi fish length whisper garlic sketch diary trumpet tree nose stove tobacco vague target announce brave alley priority"

FIATTF_BLACKLISTER_KEY="fiattf_blacklister"
FIATTF_BLACKLISTER_MNEMONIC="planet reunion diet obscure curious swim suit kitchen fiscal creek jeans doll disorder color gown sweet have search repair exhaust clap assault dwarf design"

FIATTF_PAUSER_KEY="fiattf_pauser"
FIATTF_PAUSER_MNEMONIC="guilt juice tone exhibit vault stairs mesh often expect face search quality paddle broccoli hundred another elder range horror beef session found loop mobile"

# TokenFactory roles
TF_OWNER_KEY="tf_owner"
TF_OWNER_MNEMONIC="poverty pride inject trumpet candy quiz mixed junk cricket food include involve uphold gasp wish gas save occur genius shoe slight occur sudden cute"

TF_MASTER_MINTER_KEY="tf_master_minter"
TF_MASTER_MINTER_MNEMONIC="belt cream catalog absurd hen toast ethics summer addict kick hood february spatial inmate cycle business double keep gravity private nose obvious phrase birth"

TF_MINTER_CONTROLLER_KEY="tf_minter_controller"
TF_MINTER_CONTROLLER_MNEMONIC="spider silk peasant tobacco cactus range draft merry fashion trick modify scale width omit admit face off property enact upper drink obvious off used"

TF_MINTER_CONTROLLER2_KEY="tf_minter_controller2"
TF_MINTER_CONTROLLER2_MNEMONIC="swear blossom hybrid write crash seven then ship brush market moral renew plug oval focus stairs brisk inner blue main barely broken burden fancy"

TF_MINTER_KEY="tf_minter"
TF_MINTER_MNEMONIC="muffin clog joy echo hello size reform mention patient pumpkin enough inside danger talk wire home doctor bone ensure bind arrest dizzy magnet arrest"

TF_BLACKLISTER_KEY="tf_blacklister"
TF_BLACKLISTER_MNEMONIC="gravity domain nothing stomach cousin print rally door bone ghost tuition opera witness paper color oak mistake toward current coach industry thought acid breeze"

TF_PAUSER_KEY="tf_pauser"
TF_PAUSER_MNEMONIC="sniff tail rotate pelican snap spawn champion thought recycle body caution grain brass armed hawk goat champion sunset soul answer panel present open room"

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

# Add test keys to the keyring and self delegate initial coins
echo "Adding key...." $(jq -r ".keys[0].name" $KEYS_CONFIG)
jq -r ".keys[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $(jq -r ".keys[0].name" $KEYS_CONFIG) --recover --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $(jq -r .keys[0].name $KEYS_CONFIG) --keyring-backend="test") $COINS --keyring-backend="test"

# Add FiatTokenFactory role keys
echo "Adding FiatTokenFactory role keys..."
echo "$FIATTF_OWNER_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_OWNER_KEY --recover --keyring-backend="test"
echo "$FIATTF_MASTER_MINTER_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_MASTER_MINTER_KEY --recover --keyring-backend="test"
echo "$FIATTF_MINTER_CONTROLLER_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_MINTER_CONTROLLER_KEY --recover --keyring-backend="test"
echo "$FIATTF_MINTER_CONTROLLER2_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_MINTER_CONTROLLER2_KEY --recover --keyring-backend="test"
echo "$FIATTF_MINTER_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_MINTER_KEY --recover --keyring-backend="test"
echo "$FIATTF_BLACKLISTER_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_BLACKLISTER_KEY --recover --keyring-backend="test"
echo "$FIATTF_PAUSER_MNEMONIC" | $CHAIN_BIN keys add $FIATTF_PAUSER_KEY --recover --keyring-backend="test"

# Add TokenFactory role keys
echo "Adding TokenFactory role keys..."
echo "$TF_OWNER_MNEMONIC" | $CHAIN_BIN keys add $TF_OWNER_KEY --recover --keyring-backend="test"
echo "$TF_MASTER_MINTER_MNEMONIC" | $CHAIN_BIN keys add $TF_MASTER_MINTER_KEY --recover --keyring-backend="test"
echo "$TF_MINTER_CONTROLLER_MNEMONIC" | $CHAIN_BIN keys add $TF_MINTER_CONTROLLER_KEY --recover --keyring-backend="test"
echo "$TF_MINTER_CONTROLLER2_MNEMONIC" | $CHAIN_BIN keys add $TF_MINTER_CONTROLLER2_KEY --recover --keyring-backend="test"
echo "$TF_MINTER_MNEMONIC" | $CHAIN_BIN keys add $TF_MINTER_KEY --recover --keyring-backend="test"
echo "$TF_BLACKLISTER_MNEMONIC" | $CHAIN_BIN keys add $TF_BLACKLISTER_KEY --recover --keyring-backend="test"
echo "$TF_PAUSER_MNEMONIC" | $CHAIN_BIN keys add $TF_PAUSER_KEY --recover --keyring-backend="test"

# Add genesis accounts for FiatTokenFactory roles
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_OWNER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_MASTER_MINTER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_MINTER_CONTROLLER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_MINTER_CONTROLLER2_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_MINTER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_BLACKLISTER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $FIATTF_PAUSER_KEY --keyring-backend="test") $COINS --keyring-backend="test"

# Add genesis accounts for TokenFactory roles
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_OWNER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_MASTER_MINTER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_MINTER_CONTROLLER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_MINTER_CONTROLLER2_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_MINTER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_BLACKLISTER_KEY --keyring-backend="test") $COINS --keyring-backend="test"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $TF_PAUSER_KEY --keyring-backend="test") $COINS --keyring-backend="test"

if [[ $FAUCET_ENABLED == "false" && $NUM_RELAYERS -gt "-1" ]];
then
  ## Add relayers keys and delegate tokens
  for i in $(seq 0 $NUM_RELAYERS);
  do
    # Add relayer key and delegate tokens
    RELAYER_KEY_NAME="$(jq -r ".relayers[$i].name" $KEYS_CONFIG)"
    echo "Adding relayer key.... $RELAYER_KEY_NAME"
    jq -r ".relayers[$i].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $RELAYER_KEY_NAME --recover --keyring-backend="test"
    $CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $RELAYER_KEY_NAME --keyring-backend="test") $COINS --keyring-backend="test"
    # Add relayer-cli key and delegate tokens
    RELAYER_CLI_KEY_NAME="$(jq -r ".relayers_cli[$i].name" $KEYS_CONFIG)"
    echo "Adding relayer-cli key.... $RELAYER_CLI_KEY_NAME"
    jq -r ".relayers_cli[$i].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $RELAYER_CLI_KEY_NAME --recover --keyring-backend="test"
    $CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $RELAYER_CLI_KEY_NAME --keyring-backend="test") $COINS --keyring-backend="test"
  done
fi

## if faucet not enabled then add validator and relayer with index as keys and into gentx
if [[ $FAUCET_ENABLED == "false" && $NUM_VALIDATORS -gt "1" ]];
then
  ## Add validators key and delegate tokens
  for i in $(seq 0 $NUM_VALIDATORS);
  do
    VAL_KEY_NAME="$(jq -r '.validators[0].name' $KEYS_CONFIG)-$i"
    echo "Adding validator key.... $VAL_KEY_NAME"
    jq -r ".validators[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $VAL_KEY_NAME --index $i --recover --keyring-backend="test"
    $CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account $($CHAIN_BIN keys show -a $VAL_KEY_NAME --keyring-backend="test") $COINS --keyring-backend="test"
  done
fi

echo "Creating gentx..."
COIN=$(echo $COINS | cut -d ',' -f1)
AMT=$(echo ${COIN//[!0-9]/} | sed -e "s/0000$//")
$CHAIN_BIN $CHAIN_GENESIS_CMD gentx $(jq -r ".genesis[0].name" $KEYS_CONFIG) $AMT$DENOM --keyring-backend="test" --chain-id $CHAIN_ID

echo "Output of gentx"
cat $CHAIN_DIR/config/gentx/*.json | jq

echo "Running collect-gentxs"
$CHAIN_BIN $CHAIN_GENESIS_CMD collect-gentxs

ls $CHAIN_DIR/config
