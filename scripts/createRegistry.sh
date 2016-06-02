#! /bin/bash 
servers=$1
# machine_opt is used to set option for the docker-machine
# exemple: machine_opt="--engine-env HTTP_PROXY=http://proxy:3128/ --engine-env HTTPS_PROXY=http://proxy:3128/"
machine_opt=""
# docker_opt is used to set option for the container
# exemple: docke
master_server="master1 master2 master3"
dns=""
registry="2.4.0"

for master_serv in $master_server
do
  machine_ip=`docker-machine ls | grep $master_serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  dns="$dns --dns $machine_ip"
  master_ip=$machine_ip
done

echo "###########################################"
echo "Install Registry and start:"

for serv in $servers
do
  echo "-------------------------------------------"
  echo "Copy certFile Registry in /certs..."
  docker-machine scp ~/Docker/swarmui/certs/registry/server-key.pem $serv:/certs/server.key.pem
  docker-machine scp ~/Docker/swarmui/certs/registry/server-cert.pem $serv:/certs/server-cert.pem
  echo "Get Registry image on $serv..."
  eval "$(docker-machine env $serv)"
  docker pull registry:${registry}
  machine_ip=`docker-machine ls | grep $serv | awk '{print $5}' | awk -F"/" '{print $3}' | awk -F":" '{print $1}'`
  echo "Ip public for $serv : - $machine_ip -"
  docker-machine ssh $serv "cd /certs; sudo curl https://github.com/Ptimagos/swarmui/tree/0.3.0/certs/server.key; sudo curl https://github.com/Ptimagos/swarmui/tree/0.3.0/certs/server.crt"
  echo "Start Registry on $serv..."
  docker run -d \
    -p 5000:5000 \
    --restart=always \
    --name registry \
    -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/server.cert.pem \
    -e REGISTRY_HTTP_TLS_KEY=/certs/server.key.pem \
    -v /Users/david/Documents/Docker/registry:/var/lib/registry \
    -v /certs:/certs \
    registry:${registry}
done