# ============================================
# Terraform Makefile
# ============================================
# Usage:
#   make tf-init STACK=ecs_cluster ENV=develop
#   make tf-validate STACK=ecs_cluster
#   make tf-plan STACK=ecs_cluster ENV=develop
#   make tf-apply STACK=ecs_cluster
#   make tf-destroy STACK=ecs_cluster ENV=develop
#   make tf-all STACK=ecs_cluster ENV=develop
# ============================================

# Variables (override from command line)
STACK ?= ecs_cluster
ENV   ?= develop

# Derived paths
ROOT_DIR       := $(shell pwd)
STACKS_DIR     := $(ROOT_DIR)/terraform/stacks/$(STACK)
ENVS_DIR       := $(ROOT_DIR)/terraform/environments/$(ENV)/$(STACK)
BACKEND_TFVARS := $(ENVS_DIR)/backend.tfvars
TFVARS         := $(ENVS_DIR)/terraform.tfvars
CHDIR          := -chdir=$(STACKS_DIR)

# ---- Targets ----

.PHONY: tf-init tf-validate tf-plan tf-apply tf-destroy tf-all

## Initialize Terraform backend
tf-init:
	terraform $(CHDIR) init -backend-config=$(BACKEND_TFVARS)

## Validate Terraform configuration
tf-validate:
	terraform $(CHDIR) validate

## Plan Terraform changes and save to .tfplan
tf-plan:
	terraform $(CHDIR) plan -var-file=$(TFVARS) -out=.tfplan

## Apply the saved .tfplan
tf-apply:
	terraform $(CHDIR) apply .tfplan

## Destroy infrastructure
tf-destroy:
	terraform $(CHDIR) destroy -auto-approve -var-file=$(TFVARS)

## Run init, validate, plan, and apply in sequence
tf-all: tf-init tf-validate tf-plan tf-apply

