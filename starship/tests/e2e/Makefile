HELM_NAME ?= starship-e2e-tests
HELM_FILE ?= configs/two-chain.yaml

HELM_REPO ?= starship
HELM_CHART ?= devnet

###############################################################################
###                              Helm Charts                                ###
###############################################################################

.PHONY: start
start: install
	@echo "Waiting for all pods to be ready..."
	@kubectl wait --for=condition=ready pod --all --timeout=300s
	@make port-forward

.PHONY: stop
stop: stop-forward delete

###############################################################################
###                              Helm Charts                                ###
###############################################################################

install:
	bash $(CURDIR)/../../scripts/install.sh --config $(HELM_FILE) --name $(HELM_NAME) --chart ../../charts/$(HELM_CHART)

upgrade:
	helm upgrade --debug $(HELM_NAME) ../../charts/$(HELM_CHART) -f $(HELM_FILE)

debug:
	bash $(CURDIR)/../../scripts/install.sh --config $(HELM_FILE) --name $(HELM_NAME) --dry-run --chart ../../charts/$(HELM_CHART)

delete:
	-helm delete $(HELM_NAME)

###############################################################################
###                              Tests cases                                ###
###############################################################################

.PHONY: test
test:
	TEST_CONFIG_FILE=$(HELM_FILE) CGO_ENABLED=0 go test -v ./... -count=1

###############################################################################
###                              Port forward                              ###
###############################################################################

.PHONY: port-forward
port-forward:
	$(CURDIR)/../../scripts/port-forward.sh --config=$(HELM_FILE)

.PHONY: stop-forward
stop-forward:
	-pkill -f "port-forward"
