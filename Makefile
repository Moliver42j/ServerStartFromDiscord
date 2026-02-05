SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c

.PHONY: help check-tools clean build package deploy

BUILD_DIR := .build
DIST_DIR := dist
ZIP_FILE := $(DIST_DIR)/function.zip

FUNCTION_NAME := discordBot

# Usage:
#   make deploy FUNCTION_NAME=my-lambda-name [AWS_REGION=eu-west-1] [AWS_PROFILE=default]
AWS_REGION ?= eu-west-1
AWS_PROFILE ?=
FUNCTION_NAME ?=

# If PUBLISH=1, deployment will publish a new version.
PUBLISH ?= 0

AWS_ARGS := $(if $(AWS_PROFILE),--profile $(AWS_PROFILE),) $(if $(AWS_REGION),--region $(AWS_REGION),)

help:
	@echo "Targets:"
	@echo "  make package                 Build $(ZIP_FILE)"
	@echo "  make deploy FUNCTION_NAME=..  Package and deploy to AWS Lambda"
	@echo "  make clean                   Remove build artifacts"
	@echo
	@echo "Vars: FUNCTION_NAME (required for deploy), AWS_REGION ($(AWS_REGION)), AWS_PROFILE ($(AWS_PROFILE)), PUBLISH ($(PUBLISH))"

check-tools:
	@command -v npm >/dev/null || (echo "Missing tool: npm" && exit 1)
	@command -v zip >/dev/null || (echo "Missing tool: zip" && exit 1)
	@command -v aws >/dev/null || (echo "Missing tool: aws (AWS CLI)" && exit 1)

clean:
	rm -rf "$(BUILD_DIR)" "$(DIST_DIR)"

build: check-tools
	rm -rf "$(BUILD_DIR)"
	mkdir -p "$(BUILD_DIR)"
	cp -a ./*.js package.json "$(BUILD_DIR)/"
	if [[ -f package-lock.json ]]; then cp -a package-lock.json "$(BUILD_DIR)/"; fi
	cd "$(BUILD_DIR)" && if [[ -f package-lock.json ]]; then npm ci --omit=dev; else npm install --omit=dev; fi

package: build
	mkdir -p "$(DIST_DIR)"
	rm -f "$(ZIP_FILE)"
	cd "$(BUILD_DIR)" && zip -qr "../$(ZIP_FILE)" .
	@echo "Created $(ZIP_FILE)"

deploy: package
	if [[ -z "$(FUNCTION_NAME)" ]]; then echo "Set FUNCTION_NAME, e.g. make deploy FUNCTION_NAME=my-lambda"; exit 2; fi
	aws $(AWS_ARGS) lambda update-function-code \
		--function-name "$(FUNCTION_NAME)" \
		--zip-file "fileb://$(ZIP_FILE)" \
		$(if $(filter 1,$(PUBLISH)),--publish,)
	@echo "Deployed $(ZIP_FILE) to Lambda function: $(FUNCTION_NAME)"
