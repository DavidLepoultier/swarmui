#! /bin/bash

SERVER_NAME=$1
SERVER_IP=$2
SERVICE_NAME=$3
SERVICE_PORT=$4

FIC_TMP=service_agent.tmp
FIC_JSON=service_agent.json

echo "Create Agent Service in Consul"
cp $FIC_TMP $FIC_JSON
sed -i "s#%SERVER_NAME%#$SERVICE_NAME#" $FIC_JSON
sed -i "s#%SERVICE_NAME%#$SERVICE_NAME#" $FIC_JSON
sed -i "s#%SERVICE_PORT%#$SERVICE_PORT#" $FIC_JSON
sed -i "s#%SERVER_IP%#$SERVER_IP#" $FIC_JSON
curl -d @$FIC_JSON -PUT http://$SERVER_IP:8500/v1/agent/service/register

FIC_TMP=check_agent.tmp
FIC_JSON=check_agent.json

echo "Create Agent Check in Consul"
cp $FIC_TMP $FIC_JSON
sed -i "s#%SERVER_NAME%#$SERVICE_NAME#" $FIC_JSON
sed -i "s#%SERVICE_NAME%#$SERVICE_NAME#" $FIC_JSON
sed -i "s#%SERVICE_PORT%#$SERVICE_PORT#" $FIC_JSON
sed -i "s#%SERVER_IP%#$SERVER_IP#" $FIC_JSON
curl -d @$FIC_JSON -PUT http://$SERVER_IP:8500/v1/agent/check/register
