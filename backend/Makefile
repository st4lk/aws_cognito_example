.PHONY: run, install

all: install, run

install: .install
.install: requirements.txt
	pip install -r requirements.txt
	touch $@

run: install
	python server.py
