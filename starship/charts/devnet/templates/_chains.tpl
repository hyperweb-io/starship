{{/*
Given a chain name, create a fullchain dict and return
Usage:
{{ include "devnet.getchain" (dict "name" cosmoshub-4 "file" $.File "context" $) }}
*/}}
{{- define "devnet.getchain" -}}
{{- $defaultFile := $.file -}}
{{- required "default file must have setup" $defaultFile.defaultChains -}}
{{- $chain := dict -}}
{{- range $chainIter := $.context.Values.chains -}}
{{- if eq $chainIter.id $.name -}}
{{- $chain = $chainIter | deepCopy -}}
{{- end }}
{{- end }}
{{- required "chain need to exist" $chain.id -}}

{{- $defaultChain := get $defaultFile.defaultChains $chain.name | default dict -}}

{{/* merge defaultChain values into the $chain dict*/}}
{{- $chain = merge $chain $defaultChain -}}

{{ $_ := set $chain "hostname" (include "devnet.chain.name" $chain.id) }}

{{- $faucet := get $chain "faucet" | default dict -}}
{{- $faucet = mergeOverwrite ($.context.Values.faucet | deepCopy) $faucet -}}
{{- $defaultFaucet := get $defaultFile.defaultFaucet $faucet.type | default dict -}}
{{- $faucet = merge $faucet $defaultFaucet -}}
{{ $_ = set $chain "faucet" $faucet -}}

{{- if not (hasKey $chain "upgrade")}}
{{ $_ = set $chain "upgrade" (dict "enabled" false) }}
{{- end }}

{{- $cometmock := get $chain "cometmock" | default (dict "enabled" false) -}}
{{- if $cometmock.enabled }}
{{- $defaultCometmock := get $defaultFile "defaultCometmock" | default dict -}}
{{- $cometmock = merge $cometmock $defaultCometmock -}}
{{- end }}
{{ $_ = set $chain "cometmock" $cometmock }}

{{- if not (hasKey $chain "build")}}
{{ $_ = set $chain "build" (dict "enabled" false) }}
{{- end }}

{{- if not (hasKey $chain "ics")}}
{{ $_ = set $chain "ics" (dict "enabled" false) }}
{{- end }}

{{- $toBuild := or $chain.build.enabled $chain.upgrade.enabled -}}
{{- $_ = set $chain "toBuild" $toBuild -}}
{{- if $toBuild -}}
{{- $_ = set $chain "image" "ghcr.io/hyperweb-io/starship/runner:latest" -}}
{{- end }}

{{- $defaultScripts := $defaultFile.defaultScripts }}
{{- $scripts := get $chain "scripts" | default dict }}
{{- $scripts = merge $scripts $defaultScripts }}
{{- $_ = set $chain "scripts" $scripts }}

{{ println "@return" }}
{{ mustToJson $chain }}
{{- end -}}

{{/*
Given a chain name, create a fullchain dict and return. Wraper
Usage:
{{ include "devnet.fullchain" (dict "name" cosmoshub-4 "file" $defaultFile "context" $) | fromtJson }}
*/}}
{{- define "devnet.fullchain"}}
{{ index (splitList "@return\n" (include "devnet.getchain" .)) 1 }}
{{- end }}
