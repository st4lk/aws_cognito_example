.PHONY: run, lint

all: install

install: .install
.install: package.json
	npm install
	touch $@

run: install
	npm run devserver

lint:
	npm run lint

build-dev:
	npm run build-dev

build-prod:
	npm run build-prod
