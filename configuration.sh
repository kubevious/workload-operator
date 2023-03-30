#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd ${MY_DIR}

export SERVER_PORT=4101
export CONTAINER_NAME=deployment-operator
export NETWORK_NAME=kubevious
export IMAGE_NAME=deployment-operator
