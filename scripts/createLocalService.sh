#! /bin/bash 
# machine_opt is used to set option for the docker-machine
# exemple: machine_opt="--engine-env HTTP_PROXY=http://proxy:3128/ --engine-env HTTPS_PROXY=http://proxy:3128/"
# docker_opt is used to set option for the container
# exemple: docker_opt="-e HTTP_PROXY=http://proxy:3128/ -e HTTPS_PROXY=http://proxy:3128/" 
docker_opt="" 
master=""
HTTP_PROXY=""
consul_tags="latest"
DC=cesson
DOMAIN=solerni
swarm_tags="1.1.2"
swarmui_tags="0.2.0"
eth=eth0
ipaddress=`sudo ifconfig ${eth} | grep "inet adr" | awk '{print $2}' | awk -F":" '{print $2}'`
serv=`hostname`

echo "###########################################"
echo "Install Consul and start at server mode:"

echo "-------------------------------------------"
echo "Get Consul image on ${serv}..."
docker pull progrium/consul:${consul_tags}
echo "Ip public for $serv : - $ipaddress -"
echo "Start Consul server Master on $serv..."
docker run -d --name consul-server -h $serv -v /mnt:/data \
    -p 8300:8300 \
    -p 8301:8301 \
    -p 8301:8301/udp \
    -p 8302:8302 \
    -p 8302:8302/udp \
    -p 8400:8400 \
    -p 8500:8500 \
    -p 53:53/udp \
    progrium/consul:${consul_tags} -dc $DC -domain $DOMAIN -server -advertise $ipaddress -bootstrap -ui-dir /ui
echo "###########################################"

echo "###########################################"
echo "Install Swarm and start server and agent:"
echo "-------------------------------------------"
echo "Get Swarm image on $serv..."
docker pull swarm:${swarm_tags}
echo "Ip public for $serv : - $ipaddress -"
echo "Start Swarm manager on $serv..."
docker run -d --name swarm-manager -p 3376:3376 \
  swarm:${swarm_tags} manage -H tcp://0.0.0.0:3376 \
  --replication --addr $ipaddress:3376 \
  consul://$ipaddress:8500
docker run -d --name swarm-agent swarm:${swarm_tags} join --addr $ipaddress:2376 consul://$ipaddress:8500
echo "###########################################"
echo "Install SwarmUI on ${serv}:"
docker run -d --name swarmui -p 9000:9000 ptimagos/swarmui:${swarmui_tags} \
    -consul http://$ipaddress:8500

echo "Script ended"
echo "You can connect to web interface now : http://${ipaddress}:9000"
echo "###########################################"


