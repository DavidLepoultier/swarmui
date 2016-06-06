#! /bin/bash 
servers=$@
# machine_opt is used to set option for the docker-machine
# exemple: machine_opt="--engine-env HTTP_PROXY=http://proxy:3128/ --engine-env HTTPS_PROXY=http://proxy:3128/"
machine_opt="--engine-env HTTP_PROXY=http://10.193.21.110:3128 --engine-env HTTPS_PROXY=http://10.193.21.110:3128"
# docker_opt is used to set option for the container
# exemple: docker_opt="-e HTTP_PROXY=http://proxy:3128/ -e HTTPS_PROXY=http://proxy:3128/" 
docker_opt="" 
master=""
HTTP_PROXY=""
consul_tags="latest"
DC=raspberry
DOMAIN=solerni
swarm_tags="1.1.2"
swarmui_tags="0.2.0"

echo "###########################################"
echo "Create VM to docker:"
for serv in $servers
do
  echo "-------------------------------------------"
  echo "Create Docker machine $serv..."
  docker-machine create -d virtualbox $machine_opt $serv
  echo "Copy certFile Docker $serv in /certs..."
  docker-machine ssh $serv "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs; sudo cp /var/lib/boot2docker/server-key.pem /certs"
done

echo "###########################################"
echo ""
echo "###########################################"
echo "Install Consul and start at server mode:"

for serv in $servers
do
  echo "-------------------------------------------"
  echo "Get Consul image on $serv..."
  eval "$(docker-machine env $serv)"
  docker pull progrium/consul:${consul_tags}
  machine_ip=`docker-machine ls | grep $serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  echo "Ip public for $serv : - $machine_ip -"
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
      progrium/consul:${consul_tags} -dc $DC -domain $DOMAIN -server -advertise $machine_ip -bootstrap -ui-dir /ui
  master_ip=$machine_ip
  dns_consul="$dns_consul --dns $machine_ip"
done
echo "###########################################"

dns_consul="$dns_consul --dns-search ${DC}.${DOMAIN}"
echo "DNS Used for the containers: - $dns_consul -"

echo "###########################################"
echo "Install Swarm and start server and agent:"

for serv in $servers
do
  echo "-------------------------------------------"
  echo "Get Swarm image on $serv..."
  eval "$(docker-machine env $serv)"
  docker pull swarm:${swarm_tags}
  machine_ip=`docker-machine ls | grep $serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  echo "Ip public for $serv : - $machine_ip -"
  echo "Start Swarm manager on $serv..."
  docker run -d --name swarm-manager -p 3376:3376 $dns_consul -v /certs:/certs \
    swarm:${swarm_tags} manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/server.pem \
    --tlskey=/certs/server-key.pem -H tcp://0.0.0.0:3376 --replication --addr $machine_ip:3376 \
    consul://$machine_ip:8500
  docker run -d --name swarm-agent $dns_consul swarm:${swarm_tags} join --addr $machine_ip:2376 consul://$machine_ip:8500
done
echo "###########################################"
firstServer=`echo $servers | awk '{print $1}'`
echo "Install SwarmUI on ${firstServer}:"
eval "$(docker-machine env $firstServer)"
docker run -d --name swarmui $dns_consul -v /certs:/certs -p 9000:9000 ptimagos/swarmui:${swarmui_tags} -consul http://$machine_ip:8500 \
    -tls -CA /certs/ca.pem -cert /certs/server.pem -key /certs/server-key.pem

echo "Script ended"
echo "You can connect to web interface now : http://${master_ip}:9000"
echo "###########################################"


