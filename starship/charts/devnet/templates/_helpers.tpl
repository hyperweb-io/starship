{{/*
Expand the name of the chart.
*/}}
{{- define "devnet.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "devnet.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "devnet.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "devnet.labels" -}}
helm.sh/chart: {{ include "devnet.chart" . }}
{{ include "devnet.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "devnet.selectorLabels" -}}
app.kubernetes.io/name: {{ include "devnet.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Convert $chain.id to name usable by templates
*/}}
{{- define "devnet.chain.name" -}}
{{- printf "%s" . | replace "_" "-" | trunc 63 }}
{{- end }}

{{/*
Environment variables for chain from configmaps
*/}}
{{- define "devnet.defaultEnvVars" }}
- name: DENOM
  value: {{ .denom }}
- name: COINS
  value: {{ .coins }}
- name: CHAIN_BIN
  value: {{ .binary }}
- name: CHAIN_DIR
  value: {{ .home }}
- name: CODE_REPO
  value: {{ .repo }}
- name: DAEMON_HOME
  value: {{ .home }}
- name: DAEMON_NAME
  value: {{ .binary }}
{{- end }}

{{/*
Environment variables for chain from configmaps
*/}}
{{- define "devnet.envVars" }}
- name: CHAIN_ID
  value: {{ .id }}
{{- range $env := .env }}
- name: {{ $env.name }}
  value: {{ $env.value | quote }}
{{- end }}
{{- end }}

{{/*
Environment variables for timeouts
*/}}
{{- define "devnet.timeoutVars" }}
{{- range $key, $value := .timeouts }}
- name: {{ $key | upper }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}

{{/*
Environment variables for genesis chain
*/}}
{{- define "devnet.genesisVars" }}
- name: GENESIS_HOST
  value: {{ include "devnet.chain.name" .chain }}-genesis
- name: GENESIS_PORT
  value: {{ .port | toString }}
- name: NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
{{- end }}

{{/*
Init container for waiting on a url to respond\
Usage:
{{ include "devnet.init.wait" ( dict "port" .Values.path.to.port "chains" .Values.path.to.chain "context" $ ) }}
*/}}
{{- define "devnet.init.wait" }}
- name: "wait-for-chains"
  image: "curlimages/curl"
  imagePullPolicy: {{ .context.Values.images.imagePullPolicy }}
  env:
    - name: GENESIS_PORT
      value: "{{ .port }}"
    - name: NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
  command:
    - /bin/sh
    - "-c"
    - |
      {{- range $chain := .chains }}
      while [ $(curl -sw '%{http_code}' http://{{ include "devnet.chain.name" $chain }}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id -o /dev/null) -ne 200 ]; do
        echo "Genesis validator does not seem to be ready for: {{ $chain }}. Waiting for it to start..."
        echo "Checking: http://{{ include "devnet.chain.name" $chain }}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id"
        sleep 10;
      done
      {{- end }}
      echo "Ready to start"
      exit 0
  resources:
{{- include "getResourceObject" .context.Values.resources.wait | indent 4 }}
{{- end }}

{{/*
Returns resources for a validator
*/}}
{{- define "devnet.node.resources" }}
{{- if hasKey .node "resources" }}
{{- include "getResourceObject" .node.resources }}
{{- else }}
{{- include "getResourceObject" .context.Values.resources.node }}
{{- end }}
{{- end }}

{{/*
Returns a comma seperated list of chain id
*/}}
{{- define "devnet.chains.ids" -}}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- $values = $chain.id | append $values -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a comma seperated list of chain name
If chain name is custom, then use chain id instead.
*/}}
{{- define "devnet.chains.names" -}}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- if eq $chain.name "custom" -}}
    {{- $values = $chain.id | append $values -}}
  {{- else -}}
    {{- $values = $chain.name | append $values -}}
  {{- end -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a comma seperated list of urls for the RPC address based on internal DNS
*/}}
{{- define "devnet.chains.internal.rpc.addrs" -}}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- $host := include "devnet.chain.name" $chain.id }}
  {{- $values = printf "http://%s-genesis.$(NAMESPACE).svc.cluster.local:26657" $host | append $values -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a comma seperated list of urls for the RPC address
*/}}
{{- define "devnet.chains.rpc.addrs" -}}
{{- $localhost := .Values.registry.localhost -}}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- if and ($localhost) (($chain.ports).rpc) -}}
  {{- $values = printf "http://localhost:%v" $chain.ports.rpc | append $values -}}
  {{- else if $.Values.ingress.enabled }}
  {{- $values = printf "https://rpc.%s-genesis.%s" $chain.id ($.Values.ingress.host | replace "*." "") | append $values -}}
  {{- else -}}
  {{- $host := include "devnet.chain.name" $chain.id }}
  {{- $values = printf "http://%s-genesis.$(NAMESPACE).svc.cluster.local:26657" $host | append $values -}}
  {{- end -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a comma seperated list of urls for the GRPC address.
If registry.localhost is set to true, then use $chain ports
*/}}
{{- define "devnet.chains.grpc.addrs" -}}
{{- $localhost := .Values.registry.localhost -}}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- if and ($localhost) (($chain.ports).grpc) -}}
  {{- $values = printf "http://localhost:%v" $chain.ports.grpc | append $values -}}
  {{- else if $.Values.ingress.enabled }}
  {{- $values = printf "https://grpc.%s-genesis.%s" $chain.id ($.Values.ingress.host | replace "*." "") | append $values -}}
  {{- else -}}
  {{- $host := include "devnet.chain.name" $chain.id }}
  {{- $values = printf "http://%s-genesis.$(NAMESPACE).svc.cluster.local:9091" $host | append $values -}}
  {{- end -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a comma seperated list of urls for the Rest address.
If registry.localhost is set to true, then use $chain ports
*/}}
{{- define "devnet.chains.rest.addrs" -}}
{{- $localhost := .Values.registry.localhost -}}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- if and ($localhost) (($chain.ports).rest) -}}
  {{- $values = printf "http://localhost:%v" $chain.ports.rest | append $values -}}
  {{- else if $.Values.ingress.enabled }}
  {{- $values = printf "https://rest.%s-genesis.%s" $chain.id ($.Values.ingress.host | replace "*." "") | append $values -}}
  {{- else -}}
  {{- $host := include "devnet.chain.name" $chain.id }}
  {{- $values = printf "http://%s-genesis.$(NAMESPACE).svc.cluster.local:1317" $host | append $values -}}
  {{- end -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a comma seperated list of urls for the Exposer address
*/}}
{{- define "devnet.chains.exposer.addrs" -}}
{{- $port := ($.Values.exposer.ports.rest | toString | default "8081") }}
{{- $values := list -}}
{{- range $chain := .Values.chains -}}
  {{- $host := include "devnet.chain.name" $chain.id }}
  {{- $values = printf "http://%s-genesis.$(NAMESPACE).svc.cluster.local:%s" $host $port | append $values -}}
{{- end -}}
{{ join "," $values }}
{{- end -}}

{{/*
Returns a resource object based on the input resource
Usage:
{{ include "getResourceObject" .Values.resources }}
*/}}
{{- define "getResourceObject" -}}
{{- if hasKey . "cpu" }}
limits:
  cpu: {{ .cpu }}
  memory: {{ .memory }}
requests:
  cpu: {{ .cpu }}
  memory: {{ .memory }}
{{- else }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{- define "imagePullSecrets" }}
{{- $imagePullSecrets := .imagePullSecrets | default list }}
{{- if $imagePullSecrets }}
imagePullSecrets:
{{- range $secret := $imagePullSecrets }}
- name: {{ $secret.name }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Given the docker image, returns the tag
Usage:
{{ include "image.tag" "username/repo:1.1.0" }}
*/}}
{{- define "image.tag" -}}
{{- $tag := regexFind "[^:]+$" . -}}
{{ $tag }}
{{- end -}}
