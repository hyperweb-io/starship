#!/bin/bash

set -euo pipefail

function color() {
  local color=$1
  shift
  local black=30 red=31 green=32 yellow=33 blue=34 magenta=35 cyan=36 white=37
  local color_code=${!color:-$green}
  printf "\033[%sm%s\033[0m\n" "$color_code" "$*"
}

function stop_port_forward() {
  color green "Trying to stop all port-forward, if any...."
  PIDS=$(ps -ef | grep -i -e 'kubectl port-forward' | grep -v 'grep' | cat | awk '{print $2}') || true
  for p in $PIDS; do
    kill -15 $p
  done
  sleep 2
}

# Default values
CHAIN_RPC_PORT=26657
CHAIN_COMETMOCK_PORT=22331
CHAIN_GRPC_PORT=9090
CHAIN_GRPCWEB_PORT=9091
CHAIN_LCD_PORT=1317
CHAIN_EXPOSER_PORT=8081
CHAIN_FAUCET_PORT=8000
SOLANA_RPC_PORT=8899
SOLANA_WS_PORT=8900
SOLANA_FAUCET_PORT=9900
ETHEREUM_REST_PORT=8545
ETHEREUM_RPC_PORT=8551
RELAYER_REST_PORT=3000
RELAYER_EXPOSER_PORT=8081
EXPLORER_LCD_PORT=8080
REGISTRY_LCD_PORT=8080
REGISTRY_GRPC_PORT=9090
MONITORING_PROMETHEUS_PORT=8080
MONITORING_GRAFANA_PORT=8080

for i in "$@"; do
  case $i in
    -c=*|--config=*)
      CONFIGFILE="${i#*=}"
      shift # past argument=value
      ;;
    -*|--*)
      echo "Unknown option $i"
      exit 1
      ;;
    *)
      ;;
  esac
done

stop_port_forward

echo "Port forwarding for config ${CONFIGFILE}"
echo "Port forwarding all chains"
num_chains=$(yq -r ".chains | length - 1" ${CONFIGFILE})
if [[ $num_chains -gt -1 ]]; then
  for i in $(seq 0 $num_chains); do
    # derive chain pod name from chain id
    # https://github.com/hyperweb-io/starship/blob/main/charts/devnet/templates/_helpers.tpl#L56
    chain=$(yq -r ".chains[$i].id" ${CONFIGFILE} )
    chain=${chain/_/"-"}
    chain_name=$(yq -r ".chains[$i].name" ${CONFIGFILE})

    if [[ "$chain_name" == *"ethereum"* ]]; then
      localrest=$ETHEREUM_REST_PORT
      localrpc=$ETHEREUM_RPC_PORT
      color yellow "Ethereum chain detected: $chain"
      color yellow "    Forwarding REST: http://localhost:$localrest"
      color yellow "    Forwarding RPC: http://localhost:$localrpc"
      kubectl port-forward pods/$chain_name-$chain-0 $localrest:$ETHEREUM_REST_PORT > /dev/null 2>&1 &
      kubectl port-forward pods/$chain_name-$chain-0 $localrpc:$ETHEREUM_RPC_PORT > /dev/null 2>&1 &
    elif [[ "$chain_name" == *"solana"* ]]; then
      localrpc=$SOLANA_RPC_PORT
      localws=$SOLANA_WS_PORT
      localfaucet=$SOLANA_FAUCET_PORT
      color yellow "Solana chain detected: $chain"
      color yellow "    Forwarding RPC: http://localhost:$localrpc"
      color yellow "    Forwarding WS: http://localhost:$localws"
      color yellow "    Forwarding Faucet: http://localhost:$localfaucet"
      kubectl port-forward pods/$chain_name-$chain-0 $localrpc:$SOLANA_RPC_PORT > /dev/null 2>&1 &
      kubectl port-forward pods/$chain_name-$chain-0 $localws:$SOLANA_WS_PORT > /dev/null 2>&1 &
      kubectl port-forward pods/$chain_name-$chain-0 $localfaucet:$SOLANA_FAUCET_PORT > /dev/null 2>&1 &
      sleep 1
    else
      localrpc=$(yq -r ".chains[$i].ports.rpc" ${CONFIGFILE} )
      localgrpc=$(yq -r ".chains[$i].ports.grpc" ${CONFIGFILE} )
      localgrpcweb=$(yq -r ".chains[$i].ports.grpc-web" ${CONFIGFILE} )
      locallcd=$(yq -r ".chains[$i].ports.rest" ${CONFIGFILE} )
      localexp=$(yq -r ".chains[$i].ports.exposer" ${CONFIGFILE})
      localfaucet=$(yq -r ".chains[$i].ports.faucet" ${CONFIGFILE})
      localethereumrest=$(yq -r ".chains[$i].ports.evm-http-jsonrpc" ${CONFIGFILE})
      color yellow "chains: forwarded $chain"
      if [[ $(yq -r ".chains[$i].cometmock.enabled" $CONFIGFILE) == "true" ]];
      then
        [[ "$localrpc" != "null" ]] && color yellow "    cometmock rpc to http://localhost:$localrpc" && kubectl port-forward pods/$chain-cometmock-0 $localrpc:$CHAIN_COMETMOCK_PORT > /dev/null 2>&1 &
      else
        [[ "$localrpc" != "null" ]] && color yellow "    rpc to http://localhost:$localrpc" && kubectl port-forward pods/$chain-genesis-0 $localrpc:$CHAIN_RPC_PORT > /dev/null 2>&1 &
      fi
      [[ "$localgrpc" != "null" ]] && color yellow "    grpc to http://localhost:$localgrpc" && kubectl port-forward pods/$chain-genesis-0 $localgrpc:$CHAIN_GRPC_PORT > /dev/null 2>&1 &
      [[ "$localgrpcweb" != "null" ]] && color yellow "    grpc-web to http://localhost:$localgrpcweb" && kubectl port-forward pods/$chain-genesis-0 $localgrpcweb:$CHAIN_GRPCWEB_PORT > /dev/null 2>&1 &
      [[ "$locallcd" != "null" ]] && color yellow "    lcd to http://localhost:$locallcd" && kubectl port-forward pods/$chain-genesis-0 $locallcd:$CHAIN_LCD_PORT > /dev/null 2>&1 &
      [[ "$localexp" != "null" ]] && color yellow "    exposer to http://localhost:$localexp" && kubectl port-forward pods/$chain-genesis-0 $localexp:$CHAIN_EXPOSER_PORT > /dev/null 2>&1 &
      [[ "$localfaucet" != "null" ]] && color yellow "    faucet to http://localhost:$localfaucet" && kubectl port-forward pods/$chain-genesis-0 $localfaucet:$CHAIN_FAUCET_PORT > /dev/null 2>&1 &
      [[ "$localethereumrest" != "null" ]] && color yellow "    ethereum rest to http://localhost:$localethereumrest" && kubectl port-forward pods/$chain-genesis-0 $localethereumrest:$ETHEREUM_REST_PORT > /dev/null 2>&1 &
      sleep 1
    fi
  done
else
  echo "No chains to port-forward: num: $num_chains"
fi


echo "Port forward relayers"
num_relayers=$(yq -r ".relayers | length - 1" ${CONFIGFILE})
if [[ $num_relayers -gt -1 ]]; then
  for i in $(seq 0 $num_relayers); do
    # derive chain pod name from chain id
    # https://github.com/hyperweb-io/starship/blob/main/charts/devnet/templates/_helpers.tpl#L56
    relayer=$(yq -r ".relayers[$i].name" ${CONFIGFILE} )
    relayer=$(yq -r ".relayers[$i].type" ${CONFIGFILE} )-${relayer/_/"-"}
    localrest=$(yq -r ".relayers[$i].ports.rest" ${CONFIGFILE} )
    localexposer=$(yq -r ".relayers[$i].ports.exposer" ${CONFIGFILE} )
    color yellow "relayers: forwarded $relayer"
    [[ "$localrest" != "null" ]] && color yellow "    rpc to http://localhost:$localrest" && kubectl port-forward pods/$relayer-0 $localrest:$RELAYER_REST_PORT > /dev/null 2>&1 &
    [[ "$localexposer" != "null" ]] && color yellow "    rpc to http://localhost:$localexposer" && kubectl port-forward pods/$relayer-0 $localexposer:$RELAYER_EXPOSER_PORT > /dev/null 2>&1 &
    sleep 1
  done
else
  echo "No relayer to port-forward: num: $num_relayers"
fi


echo "Port forward services"
if [[ $(yq -r ".registry.enabled" $CONFIGFILE) == "true" ]]; then
  registry_lcd_port=$(yq -r ".registry.ports.rest" $CONFIGFILE)
  registry_grpc_port=$(yq -r ".registry.ports.grpc" $CONFIGFILE)
  registry_lcd_port=${registry_lcd_port:-$REGISTRY_LCD_PORT}
  registry_grpc_port=${registry_grpc_port:-$REGISTRY_GRPC_PORT}
  kubectl port-forward service/registry ${registry_lcd_port}:$REGISTRY_LCD_PORT > /dev/null 2>&1 &
  kubectl port-forward service/registry ${registry_grpc_port}:$REGISTRY_GRPC_PORT > /dev/null 2>&1 &
  sleep 1
  color yellow "registry: forwarded registry lcd to http://localhost:${registry_lcd_port}, grpc to http://localhost:${registry_grpc_port}"
fi

# Port forward frontend services
num_frontends=$(yq -r ".frontends | length - 1" ${CONFIGFILE})
if [[ $num_frontends -gt -1 ]]; then
  for i in $(seq 0 $num_frontends); do
    frontend_name=$(yq -r ".frontends[$i].name" ${CONFIGFILE})
    frontend_port=$(yq -r ".frontends[$i].ports.rest" ${CONFIGFILE})
    color yellow "frontend: forwarded $frontend_name"
    [[ "$frontend_port" != "null" ]] && color yellow "    rest to http://localhost:$frontend_port" && kubectl port-forward service/$frontend_name $frontend_port:$frontend_port > /dev/null 2>&1 &
    sleep 1
  done
else
  echo "No frontend services to port-forward: num: $num_frontends"
fi

if [[ $(yq -r ".explorer.enabled" $CONFIGFILE) == "true" ]]; then
  explorer_port=$(yq -r ".explorer.ports.rest" $CONFIGFILE)
  explorer_port=${explorer_port:-$EXPLORER_LCD_PORT}
  kubectl port-forward service/explorer ${explorer_port}:$EXPLORER_LCD_PORT > /dev/null 2>&1 &
  sleep 1
  color green "Open the explorer to get started.... http://localhost:${explorer_port}"
fi

if [[ $(yq -r ".monitoring.enabled" $CONFIGFILE) == "true" ]];
then
  color yellow "monitoring port forward:"
  localgrafana=$(yq -r ".monitoring.ports.grafana" ${CONFIGFILE})
  localprometheus=$(yq -r ".monitoring.ports.prometheus" ${CONFIGFILE})
  [[ "$localgrafana" != "null" ]] && color yellow "    grafana to http://localhost:$localgrafana" && kubectl port-forward service/grafana $localgrafana:$MONITORING_GRAFANA_PORT > /dev/null 2>&1 &
  [[ "$localprometheus" != "null" ]] && color yellow "    prometheus to http://localhost:$localprometheus" && kubectl port-forward service/prometheus-service $localprometheus:$MONITORING_PROMETHEUS_PORT > /dev/null 2>&1 &
  sleep 1
fi
