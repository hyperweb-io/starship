module github.com/hyperweb-io/starship/tests/e2e

go 1.24.0

require (
	github.com/golang/protobuf v1.5.4
	github.com/hyperweb-io/starship/exposer v0.0.0-20230413092908-7da9e8a24b31
	github.com/hyperweb-io/starship/registry v0.0.0-20230411094226-129001b2f52a
	github.com/stretchr/testify v1.8.4
	go.uber.org/zap v1.26.0
	google.golang.org/protobuf v1.36.10
	gopkg.in/yaml.v3 v3.0.1
)

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.18.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	go.uber.org/multierr v1.10.0 // indirect
	golang.org/x/net v0.48.0 // indirect
	golang.org/x/sys v0.39.0 // indirect
	golang.org/x/text v0.32.0 // indirect
	google.golang.org/genproto/googleapis/api v0.0.0-20251202230838-ff82c1b0f217 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20251202230838-ff82c1b0f217 // indirect
	google.golang.org/grpc v1.79.3 // indirect
)

replace (
	github.com/hyperweb-io/starship/exposer => ../../exposer
	github.com/hyperweb-io/starship/registry => ../../registry
)
