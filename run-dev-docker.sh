#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

./build.sh
RESULT=$?
if [ $RESULT -ne 0 ]; then
  echo "Build failed"
  exit 1;
fi

docker run \
    -it \
    --rm \
    --name "${CONTAINER_NAME}" \
    -p ${SERVER_PORT}:${SERVER_PORT} \
    --network ${NETWORK_NAME} \
    -e NODE_ENV=development \
    -e MYSQL_HOST=kubevious-mysql \
    -e MYSQL_PORT=3306 \
    -e MYSQL_DB=kubevious \
    -e MYSQL_USER=root \
    -e MYSQL_PASS= \
    -v ${MY_DIR}:/app \
    --entrypoint="node" \
    node:12-alpine "/app"

    