#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

docker run \
    -it \
    --rm \
    --name "${CONTAINER_NAME}" \
    -h ${CONTAINER_NAME} \
    -p ${SERVER_PORT}:${SERVER_PORT} \
    --network ${NETWORK_NAME} \
    -e NODE_ENV=development \
    -e SERVER_PORT=${SERVER_PORT} \
    -e MYSQL_HOST=kubevious-mysql \
    -e MYSQL_DB=${MYSQL_DB} \
    -e MYSQL_USER=${MYSQL_USER} \
    -e MYSQL_PASS=${MYSQL_PASS} \
    -e REDIS_HOST=kubevious-redisearch \
    -e COLLECTOR_BASE_URL=http://kubevious-collector:4003 \
    -e PARSER_BASE_URL=http://kubevious-parser:4004 \
    ${IMAGE_NAME}

    