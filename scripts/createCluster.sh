#! /bin/bash 
servers=$@
. ./createCluster.conf

echo "###########################################"
echo "Create VM to docker :"
for serv in $servers
do
  echo "-------------------------------------------"
  echo "Create Docker machine $serv ..."
  docker-machine create -d virtualbox $machine_opt $serv
done

echo "###########################################"
echo ""
echo "###########################################"
echo "Install Consul and start at server mode :"

for serv in $servers
do
  echo "-------------------------------------------"
  echo "Get Consul image on $serv ..."
  eval "$(docker-machine env $serv)"
  docker pull progrium/consul:${consul_tags}
  machine_ip=`docker-machine ls | grep $serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  echo "Ip public for $serv : - $machine_ip -"
  if [ -z $master ]
  then
    echo "Start Consul server Master on $serv ..."
    docker run -d --name consul-server -h $serv -v /mnt:/data \
      -p 8300:8300 \
      -p 8301:8301 \
      -p 8301:8301/udp \
      -p 8302:8302 \
      -p 8302:8302/udp \
      -p 8400:8400 \
      -p 8500:8500 \
      -p 53:53/udp \
      progrium/consul:${consul_tags} -server -advertise $machine_ip -bootstrap-expect 3 -ui-dir /ui
    master=1
    master_ip=$machine_ip
  else
    echo "Start Consul server on $serv and join $master_ip ..."
    docker run -d --name consul-server -h $serv -v /mnt:/data \
      -p 8300:8300 \
      -p 8301:8301 \
      -p 8301:8301/udp \
      -p 8302:8302 \
      -p 8302:8302/udp \
      -p 8400:8400 \
      -p 8500:8500 \
      -p 53:53/udp \
      progrium/consul:${consul_tags} -server -advertise $machine_ip -join $master_ip -ui-dir /ui
  fi
  dns_consul="$dns_consul --dns $machine_ip"
done
echo "###########################################"

dns_consul="$dns_consul --dns 8.8.8.8 --dns-search service.consul"
echo "DNS Used for the containers : - $dns_consul -"

echo "###########################################"
echo "Install Swarm and start server and agent :"

for serv in $servers
do
  echo "-------------------------------------------"
  echo "Get Swarm image on $serv ..."
  eval "$(docker-machine env $serv)"
  docker pull swarm:${swarm_tags}
  machine_ip=`docker-machine ls | grep $serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  echo "Ip public for $serv : - $machine_ip -"
  echo "Start Swarm manager on $serv ..."
  docker run -d --name swarm-manager -p 3376:3376 $dns_consul -v /var/lib/boot2docker:/certs \
    swarm:${swarm_tags} manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/server.pem \
    --tlskey=/certs/server-key.pem -H tcp://0.0.0.0:3376 --replication --addr $machine_ip:3376 \
    consul://consul:8500
  docker run -d --name swarm-agent $dns_consul swarm:${swarm_tags} join --addr $machine_ip:2376 consul://consul:8500
done
echo "###########################################"

