module github.com/hyperweb-io/starship/tests/e2e

go 1.23.0

require (
	github.com/golang/protobuf v1.5.4
	github.com/hyperweb-io/starship/exposer v0.0.0-20230413092908-7da9e8a24b31
	github.com/hyperweb-io/starship/registry v0.0.0-20230411094226-129001b2f52a
	github.com/stretchr/testify v1.8.4
	go.uber.org/zap v1.26.0
	google.golang.org/protobuf v1.34.2
	gopkg.in/yaml.v3 v3.0.1
)

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.18.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	go.uber.org/multierr v1.10.0 // indirect
	golang.org/x/net v0.38.0 // indirect
	golang.org/x/sys v0.31.0 // indirect
	golang.org/x/text v0.23.0 // indirect
	google.golang.org/genproto/googleapis/api v0.0.0-20240318140521-94a12d6c2237 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240617180043-68d350f18fd4 // indirect
	google.golang.org/grpc v1.64.1 // indirect
)

replace (
	github.com/hyperweb-io/starship/exposer => ../../exposer
	github.com/hyperweb-io/starship/registry => ../../registry
)
