.PHONY: install build deploy

STAGE ?= dev
AWS_PROFILE ?= my_own_admin
REGION ?= us-west-2

SLS_DEPLOY := sls deploy -v --stage $(STAGE) --aws-profile $(AWS_PROFILE) --region $(REGION)
SLS_UNDEPLOY := sls remove -v --stage $(STAGE) --aws-profile $(AWS_PROFILE) --region $(REGION)

# Install
install: ;  # nothing to do for install

# Build
build: ;  # nothing to do for build

# Deploy
deploy: install build
	$(SLS_DEPLOY)


# Deploy
undeploy: install build
	$(SLS_UNDEPLOY)
