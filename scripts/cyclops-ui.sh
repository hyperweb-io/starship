#!/bin/bash

set -euo pipefail

# Default values
NAMESPACE=cyclops
CYCLOPS_UI=3000
CYCLOPS_BACKEND=8080

function color() {
  local color=$1
  shift
  local black=30 red=31 green=32 yellow=33 blue=34 magenta=35 cyan=36 white=37
  local color_code=${!color:-$green}
  printf "\033[%sm%s\033[0m\n" "$color_code" "$*"
}

function stop-port-forward() {
  color green "Trying to stop all port-forward, if any...."
  PIDS=$(ps -ef | grep -i -e 'kubectl port-forward svc/cyclops' | grep -v 'grep' | cat | awk '{print $2}') || true
  for p in $PIDS; do
    kill -15 $p
  done
  sleep 2
}

function port-forward() {
  stop-port-forward
  color yellow "cyclops-ui to http://localhost:3000" && kubectl port-forward svc/cyclops-ui 3000:$CYCLOPS_UI -n $NAMESPACE > /dev/null 2>&1 &
  color yellow "cyclops-ctrl to http://localhost:8080" && kubectl port-forward svc/cyclops-ctrl 8080:$CYCLOPS_BACKEND -n $NAMESPACE > /dev/null 2>&1 &
}

function install() {
    color green "Install cyclops ui in namespace: $NAMESPACE"
    kubectl apply -f https://raw.githubusercontent.com/cyclops-ui/cyclops/v0.0.1-alpha.5/install/cyclops-install.yaml --namespace $NAMESPACE
    color yellow "Fetching the pods"
    kubectl get pods -n $NAMESPACE

    color yellow "Wait for 60 secs before running port forward commands"
}

function stop() {
    color green "Delete cyclops ui in namespace: $NAMESPACE"
    kubectl delete -f https://raw.githubusercontent.com/cyclops-ui/cyclops/v0.0.1-alpha.3/install/cyclops-install.yaml --namespace $NAMESPACE
    color yellow "Fetching the pods"
    kubectl get pods -n $NAMESPACE
}

if declare -f "$1" > /dev/null
then
  # call arguments verbatim
  "$@"
else
  # Show a helpful error
  echo "'$1' is not a known function name" >&2
  exit 1
fi
