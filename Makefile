.PHONY: test lint lint-contract setup-genvmroot frontend-install frontend-build validate-all

setup-genvmroot:
	python scripts/setup_genvmroot.py

test: setup-genvmroot
	pytest -q

lint-contract: setup-genvmroot
	GENVMROOT=$$(pwd)/.genvmroot genvm-lint check contracts/proofworks_escrow.py

lint: lint-contract

frontend-install:
	npm --prefix frontend install

frontend-build: frontend-install
	npm --prefix frontend run build

validate-all: test lint-contract frontend-build
