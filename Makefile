SHELL = /bin/bash

.ONESHELL:

-include .secrets.mk
include .env

APP_ID ?= connectetesneurones
IMAGE_REGISTRY ?= registry.gitlab.com/terra-numerica
IMAGE_NAME ?= connectetesneurones
IMAGE_VERSION ?= latest
IMAGE_REF = $(IMAGE_REGISTRY)/$(IMAGE_NAME):$(IMAGE_VERSION)
BASE_PATH = /$(APP_ID)/
BRANCH_SUFFIX?=$$(echo "-"$$(git branch --show-current) | sed 's/-develop//' | sed 's!/!_!g')
LATEST=latest$(BRANCH_SUFFIX)
VERSION?=$$(git describe --long 2>/dev/null | tr -d 'v' | cut -d- -f 1-2 | sed 's/-0$$//' || echo "0.0.0")$(BRANCH_SUFFIX)

# Chemins sur le serveur
SERVER_BACKEND_PATH  = /srv/$(APP_ID)/

# Docker Compose : base = prod, surcharge dev en local
COMPOSE_PROD = -f docker-compose.yaml
COMPOSE_DEV = -f docker-compose.yaml -f docker-compose.dev.yaml

# Variables SSH (doivent être fournies par l'utilisateur)
SSH_USER ?=
SSH_HOST ?=


CSI_HIGH = \033[1;37m
CSI_RESET = \033[0m
CSI_PROMPT = \033[36m

# --- Commandes ---

# Commande par défaut : Aide
.PHONY: help
help:
	@echo -e "\n$(CSI_HIGH)--- Connecte tes neurones (v$(VERSION)) ---$(CSI_RESET)\n"
	echo -e "Targets disponibles:\n"
	egrep -h '\s##\s' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CSI_PROMPT) %-20s$(CSI_RESET) %s\n", $$1, $$2}' \
		| sort
	echo ""

# Validation des variables d'environnement obligatoires
define env_usage
	$(error Erreur : $(1) n'est pas défini. Utilisez 'make [commande] SSH_USER=votre_user SSH_HOST=votre_serveur', ou bien créez un fichier .secrets.mk avec ces variables.)
endef

.PHONY: check-env
check-env:						## Vérifie la présence des variables d'environnement obligatoires
ifndef SSH_USER
	@$(call env_usage,SSH_USER)
endif
ifndef SSH_HOST
	@$(call env_usage,SSH_HOST)
endif
	@echo "Variables d'environnement OK."


.PHONY: install
install:						## Installation des dépendances de dev
	@echo "--- Installation des dépendances ---"
	npm install

.PHONY: build
build:							## Construit l'image Docker (tag: $(IMAGE_REF))
	@echo "--- Construction de l'image Docker $(IMAGE_REF) ---"
	docker build -t $(IMAGE_REF) -t $(IMAGE_REGISTRY)/$(IMAGE_NAME):latest \
		--build-arg BASE_PATH=$(BASE_PATH) \
		--target production \
		-f Dockerfile .

.PHONY: image
image: build

.PHONY: publish
publish: build					## Publication de l'image Docker sur le repo GitLab
	@echo "--- Publication sur GitLab ($(IMAGE_REF)) ---"
	docker push $(IMAGE_REF)
	docker push $(IMAGE_REGISTRY)/$(IMAGE_NAME):latest

.PHONY: push
push: publish

.PHONY: deploy
deploy: check-env publish			## Déploiement sur le serveur (compose + .env, image publiée)
	@echo "# Copie des fichiers de configuration du stack"
	rsync -avz ./docker-compose.yaml ./.env $(SSH_USER)@$(SSH_HOST):$(SERVER_BACKEND_PATH)


.PHONY: update-service
update-service: check-env		## Mise à jour du service sur le serveur
	@echo "--- Mise à jour du service ---"
	ssh $(SSH_USER)@$(SSH_HOST) "cd $(SERVER_BACKEND_PATH) && docker compose -p $(APP_ID) pull app && docker compose -p $(APP_ID) up -d"

.PHONY: release
release: deploy update-service	## Publie, déploie et met à jour le service (commande globale)
	@echo "--- Mise en production terminée avec succès ! ---"

.PHONY: app-up
app-up:					## Démarre l'application en local (docker-compose prod)
	@echo "--- Démarrage du docker-compose (prod) ---"
	docker compose $(COMPOSE_PROD) -p $(APP_ID) up -d --build

.PHONY: app-up-dev
app-up-dev:				## Démarre l'application en local (docker-compose dev)
	@echo "--- Démarrage du docker-compose (dev) ---"
	docker compose $(COMPOSE_DEV) -p $(APP_ID) up -d --build

.PHONY: app-down
app-down:				## Arrête l'application en local (docker-compose prod)
	@echo "--- Arrêt du docker-compose (prod) ---"
	docker compose $(COMPOSE_PROD) -p $(APP_ID) down

.PHONY: app-down-dev
app-down-dev:				## Arrête l'application en local (docker-compose dev)
	@echo "--- Arrêt du docker-compose (dev) ---"
	docker compose $(COMPOSE_DEV) -p $(APP_ID) down

.PHONY: app-logs
app-logs:				## Affiche les logs de l'application en local (docker-compose prod)
	@echo "--- Affichage des logs (prod) ---"
	docker compose $(COMPOSE_PROD) -p $(APP_ID) logs -f app

.PHONY: app-logs-dev
app-logs-dev:				## Affiche les logs de l'application en local (docker-compose dev)
	@echo "--- Affichage des logs (dev) ---"
	docker compose $(COMPOSE_DEV) -p $(APP_ID) logs -f app

.PHONY: app-ps
app-ps:					## Affiche les conteneurs de l'application en local (docker-compose prod)
	@echo "--- Conteneurs (prod) ---"
	docker compose $(COMPOSE_PROD) -p $(APP_ID) ps

.PHONY: app-ps-dev
app-ps-dev:				## Affiche les conteneurs de l'application en local (docker-compose dev)
	@echo "--- Conteneurs (dev) ---"
	docker compose $(COMPOSE_DEV) -p $(APP_ID) ps
