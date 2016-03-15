#! /bin/bash 
servers=$1
# machine_opt is used to set option for the docker-machine
# exemple: machine_opt="--engine-env HTTP_PROXY=http://proxy:3128/ --engine-env HTTPS_PROXY=http://proxy:3128/"
machine_opt=""
# docker_opt is used to set option for the container
# exemple: docke
master_server="master1 master2 master3"
dns=""
swarm_tags="1.1.2"

for master_serv in $master_server
do
  machine_ip=`docker-machine ls | grep $master_serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  dns="$dns --dns $machine_ip"
  master_ip=$machine_ip
done

echo "###########################################"
echo "Create VM to docker :"
for serv in $servers
do
  echo "-------------------------------------------"
  echo "Create Docker machine $serv..."
  docker-machine create -d virtualbox $machine_opt $serv
  echo "Copy certFile Docker $serv in /certs ..."
  docker-machine ssh $serv "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs/cert.pem; sudo cp /var/lib/boot2docker/server-key.pem /certs/key.pem"
done

echo "###########################################"
echo "Install Swarm and start agent :"

for serv in $servers
do
  echo "-------------------------------------------"
  echo "Get Swarm image on $serv..."
  eval "$(docker-machine env $serv)"
  docker pull swarm:${swarm_tags}
  machine_ip=`docker-machine ls | grep $serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  echo "Ip public for $serv : - $machine_ip -"
  echo "Start Swarm agent on $serv..."
  docker run -d --name=swarm-agent $dns --dns 8.8.8.8 --dns-search service.consul swarm:${swarm_tags} join --addr $machine_ip:2376 consul://consul:8500
done

