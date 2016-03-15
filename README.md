## SwarmUI

SwarmUI is a web interface for the Docker and Swarm Remote API. The goal is to provide a pure client side implementation so it is effortless to connect and manage docker. This project is based on [DockerUI](https://github.com/crosbymichael/dockerui) project, and is not complete. This's still under heavy development.

![Container](/dashboards.png)

### Goals
* Minimal dependencies - I really want to keep this project a pure html/js app.
* Consistency - The web UI should be consistent with the commands found on the docker / swarm CLI.

## Constraints
* You must start, on each node, the docker deamon with option TCP and TLS.
* One or many docker Swarm Manarger can be started in the cluster.
* All Swarm Manager and agent must used consul to discover all the nodes.
* On each node, docker swarm-agent must be started
* The Tls certificats must be stored in the directory "/certs" on the host where swarmui be deployed. With this naming :
 - ca.pem
 - cert.pem
 - key.pem

## Using the container

### Container Quickstart 
1. Run: `docker run -d -p 9000:9000 -v /certs:/certs ptimagos/swarmui http://<consul host ip>:8500`

2. Open your browser to `http://<dockerd host ip>:9000`

## Testing SwarmUI on a single docker-machine

Here we will used docker-machine and virtualbox to create the host environment. In this way, the dockers deamons started with TCP and TLS options.

1. Create host: 
	```
	docker-machine create -d virtualbox master
	```

	We will suppose than the IP address for this machine is "**192.168.99.100**"

	If you are behind a proxy, you can create the machine like this: 
	```
	docker-machine create -d virtualbox master --engine-env HTTP_PROXY=http://<proxy ip>:<proxy port>/ --engine-env HTTPS_PROXY=http://<proxy ip>:<proxy port>/
	```

2. Load the environment of the new machine: 
	```
	eval "$(docker-machine env master)"
	```

3. Start a consul container that will be used by Swarm: 
	```
	docker run -p 8400:8400 -p 8500:8500 --name consul-server -h master progrium/consul -server -bootstrap
	```

	The [Web UI](https://www.consul.io/intro/getting-started/ui.html) can be enabled by adding the -ui-dir flag:
	```
	docker run -p 8400:8400 -p 8500:8500 --name consul-server -h master progrium/consul -server -bootstrap -ui-dir /ui
	```

4. Copy the certificats in the directory "/certs":
	```
	docker-machine ssh master
	sudo mkdir /certs 
	sudo cp /var/lib/boot2docker/ca.pem /certs
	sudo cp /var/lib/boot2docker/server.pem /certs/cert.pem
	sudo cp /var/lib/boot2docker/server-key.pem /certs/key.pem
	exit
	```

5. Start a Swarm Manager container, with TLS option:
	```
	docker run -d --name swarm-manager -p 3376:3376 -v /certs:/certs \
		swarm manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/cert.pem \
		--tlskey=/certs/key.pem -H tcp://0.0.0.0:3376 consul://192.168.99.100:8500
	```

6. Start a Swarm Agent container:
	```
	docker run -d --name=swarm-agent swarm join --addr 192.168.99.100:2376 consul://192.168.99.100:8500
	```

7. Start SwarmUI:
	```
	docker run -d -name=swarmui -v /certs:/certs -p 9000:9000 ptimagos/swarmui http://192.168.99.100:8500
	```

	If you are behind a proxy, you can create the container like this: 
	```
	docker run -d -name=swarmui -v /certs:/certs -p 9000:9000 ptimagos/swarmui http://192.168.99.100:8500 http://<proxy ip>:<proxy port>
	```
	
	Now you can connect to the SwarmUI web interface: `http://192.168.99.100:9000`

	At this point, you must have, in the dashboard, 4 containers, 3 images and 1 host.

8. Add new host in the cluster:
	```
	docker-machine create -d virtualbox app

	eval "$(docker-machine env app)"

	docker run -d --name=swarm-agent swarm join --addr <ip address host app>:2376 consul://192.168.99.100:8500
	```

	Check again the web interface, you must have 5 containers, 3 images and 2 hosts now.


## Testing SwarmUI with a clustering docker-machine

You can create manually the cluster or by the lowest script...

#### Manually

1. Create 3 docker-machine:
	```
	docker-machine create -d virtualbox master1
	docker-machine create -d virtualbox master2
	docker-machine create -d virtualbox master3
	```

	We will suppose than the IPs address for these machines are "**192.168.99.100** - **192.168.99.101** - **192.168.99.102**"

2. Start a consul server container on each node:
	```
	eval "$(docker-machine env master1)"
	docker run -d --name consul-server -h master1 -v /mnt:/data -p 8300:8300 -p 8301:8301 \
      -p 8301:8301/udp -p 8302:8302 -p 8302:8302/udp -p 8400:8400 -p 8500:8500 -p 53:53/udp \
      progrium/consul -server -advertise 192.168.99.100 -bootstrap-expect 3

  eval "$(docker-machine env master2)"
	docker run -d --name consul-server -h master2 -v /mnt:/data -p 8300:8300 -p 8301:8301 \
      -p 8301:8301/udp -p 8302:8302 -p 8302:8302/udp -p 8400:8400 -p 8500:8500 -p 53:53/udp \
      progrium/consul -server -advertise 192.168.99.101 -join 192.168.99.100

  eval "$(docker-machine env master3)"
	docker run -d --name consul-server -h master3 -v /mnt:/data -p 8300:8300 -p 8301:8301 \
      -p 8301:8301/udp -p 8302:8302 -p 8302:8302/udp -p 8400:8400 -p 8500:8500 -p 53:53/udp \
      progrium/consul -server -advertise 192.168.99.102 -join 192.168.99.100
	```

3. Copy the certificats in the directory "/certs"
	```
	docker-machine ssh master1 "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs/cert.pem; sudo cp /var/lib/boot2docker/server-key.pem /certs/key.pem"
	docker-machine ssh master2 "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs/cert.pem; sudo cp /var/lib/boot2docker/server-key.pem /certs/key.pem"
	docker-machine ssh master3 "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs/cert.pem; sudo cp /var/lib/boot2docker/server-key.pem /certs/key.pem"
	```

4. Start a Manager and Agent Swarm:
	```
	eval "$(docker-machine env master1)"
	docker run -d --name swarm-manager --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		-p 3376:3376 -v /certs:/certs swarm manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/cert.pem \
		--tlskey=/certs/key.pem -H tcp://0.0.0.0:3376 --replication --addr 192.168.99.100:3376 \
		consul://consul.service.consul:8500

  docker run -d --name swarm-agent --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		swarm join --addr 192.168.99.100:2376 consul://consul.service.consul:8500


	eval "$(docker-machine env master2)"
   docker run -d --name swarm-manager --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		-p 3376:3376 -v /certs:/certs swarm manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/cert.pem \
		--tlskey=/certs/key.pem -H tcp://0.0.0.0:3376 --replication --addr 192.168.99.101:3376 \
		consul://consul.service.consul:8500
	
	docker run -d --name swarm-agent --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		swarm join --addr 192.168.99.101:2376 consul://consul.service.consul:8500


	eval "$(docker-machine env master3)"
   docker run -d --name swarm-manager --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		-p 3376:3376 -v /certs:/certs swarm manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/cert.pem \
		--tlskey=/certs/key.pem -H tcp://0.0.0.0:3376 --replication --addr 192.168.99.102:3376 \
		consul://consul.service.consul:8500

	docker run -d --name swarm-agent --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		swarm join --addr 192.168.99.100:2376 consul://consul.service.consul:8500
	```

5. Start SwarmUI:
	```
	eval "$(docker-machine env master1)"
	docker run -d -name=swarmui --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 \
		-v /certs:/certs -p 9000:9000 ptimagos/swarmui http://consul.service.consul:8500
	```

	Now you can connect to the SwarmUI web interface: `http://192.168.99.100:9000`

	At this point, you must have, in the dashboard, 10 containers, 3 images and 3 host.

	You can install SwarmUI on each node...

#### By scripting

1. Get and run the script createCluster.sh:

	```
	curl -sL https://raw.githubusercontent.com/Ptimagos/swarmui/0.1.0/scripts/createCluster.sh | bash -s master1 master2 master3
	```
	
	```
	###########################################
	Create VM to docker:
	-------------------------------------------
	Create Docker machine master1...
	Running pre-create checks...
	Creating machine...
	(master1) Copying /Users/david/.docker/machine/cache/boot2docker.iso to /Users/david/.docker/machine/machines/master1/boot2docker.iso...
	(master1) Creating VirtualBox VM...
	(master1) Creating SSH key...
	(master1) Starting VM...
	Waiting for machine to be running, this may take a few minutes...
	Machine is running, waiting for SSH to be available...
	Detecting operating system of created instance...
	Detecting the provisioner...
	Provisioning with boot2docker...
	Copying certs to the local machine directory...
	Copying certs to the remote machine...
	Setting Docker configuration on the remote daemon...
	Checking connection to Docker...
	Docker is up and running!
	To see how to connect Docker to this machine, run: docker-machine env master1
	Copy certFile Docker master1 in /certs...
	-------------------------------------------
	Create Docker machine master2...
	Running pre-create checks...
	Creating machine...
	(master2) Copying /Users/david/.docker/machine/cache/boot2docker.iso to /Users/david/.docker/machine/machines/master2/boot2docker.iso...
	(master2) Creating VirtualBox VM...
	(master2) Creating SSH key...
	(master2) Starting VM...
	Waiting for machine to be running, this may take a few minutes...
	Machine is running, waiting for SSH to be available...
	Detecting operating system of created instance...
	Detecting the provisioner...
	Provisioning with boot2docker...
	Copying certs to the local machine directory...
	Copying certs to the remote machine...
	Setting Docker configuration on the remote daemon...
	Checking connection to Docker...
	Docker is up and running!
	To see how to connect Docker to this machine, run: docker-machine env master2
	Copy certFile Docker master2 in /certs...
	-------------------------------------------
	Create Docker machine master3...
	Running pre-create checks...
	Creating machine...
	(master3) Copying /Users/david/.docker/machine/cache/boot2docker.iso to /Users/david/.docker/machine/machines/master3/boot2docker.iso...
	(master3) Creating VirtualBox VM...
	(master3) Creating SSH key...
	(master3) Starting VM...
	Waiting for machine to be running, this may take a few minutes...
	Machine is running, waiting for SSH to be available...
	Detecting operating system of created instance...
	Detecting the provisioner...
	Provisioning with boot2docker...
	Copying certs to the local machine directory...
	Copying certs to the remote machine...
	Setting Docker configuration on the remote daemon...
	Checking connection to Docker...
	Docker is up and running!
	To see how to connect Docker to this machine, run: docker-machine env master3
	Copy certFile Docker master3 in /certs...
	###########################################
	
	###########################################
	Install Consul and start at server mode:
	-------------------------------------------
	Get Consul image on master1...
	latest: Pulling from progrium/consul
	Digest: sha256:8cc8023462905929df9a79ff67ee435a36848ce7a10f18d6d0faba9306b97274
	Status: Downloaded newer image for progrium/consul:latest
	Ip public for master1 : - 192.168.99.100 -
	Start Consul server Master on master1...
	92cb865bea19012faca66022861c7702de459f76ec09ec2b0d87b414f33e5544
	-------------------------------------------
	Get Consul image on master2...
	latest: Pulling from progrium/consul
	Digest: sha256:8cc8023462905929df9a79ff67ee435a36848ce7a10f18d6d0faba9306b97274
	Status: Downloaded newer image for progrium/consul:latest
	Ip public for master2 : - 192.168.99.101 -
	Start Consul server on master2 and join 192.168.99.100...
	0cd00489ac821e46163fb4a967c881381e15d6e163b2d42d7759300210b7e512
	-------------------------------------------
	Get Consul image on master3...
	latest: Pulling from progrium/consul
	Digest: sha256:8cc8023462905929df9a79ff67ee435a36848ce7a10f18d6d0faba9306b97274
	Status: Downloaded newer image for progrium/consul:latest
	Ip public for master3 : - 192.168.99.102 -
	Start Consul server on master3 and join 192.168.99.100...
	8165e71461ff0c5e3ad86c2d0d1317100c3b40066477e1630ef7338c1e339479
	###########################################
	DNS Used for the containers: -  --dns 192.168.99.100 --dns 192.168.99.101 --dns 192.168.99.102 --dns 8.8.8.8 --dns-search service.consul -
	###########################################
	Install Swarm and start server and agent:
	-------------------------------------------
	Get Swarm image on master1...
	1.1.2: Pulling from library/swarm
	Digest: sha256:85ef76ba6909b13093960b44d81b946c420b88a2b92b0be61c0e6d1d16037407
	Status: Downloaded newer image for swarm:1.1.2
	Ip public for master1 : - 192.168.99.100 -
	Start Swarm manager on master1...
	55b2a3bf6b3c052dcc8013dbacd8672839ca0f93793d0e6d24f58e6e8de29d60
	8c6f62ae77063c1dc609a0eeb865c25994a0c0d19dc51b33e4555d68e3ffdc02
	-------------------------------------------
	Get Swarm image on master2...
	1.1.2: Pulling from library/swarm
	Digest: sha256:85ef76ba6909b13093960b44d81b946c420b88a2b92b0be61c0e6d1d16037407
	Status: Downloaded newer image for swarm:1.1.2
	Ip public for master2 : - 192.168.99.101 -
	Start Swarm manager on master2...
	2e45b7bf17e33176f4a7f5132f7a3b268f5052d1704b2a3346c96ad97047124b
	b6d2b672a67879575b781f4e9eb29233aeaef4315d51dd3d93f6e15397ee841c
	-------------------------------------------
	Get Swarm image on master3...
	1.1.2: Pulling from library/swarm
	Digest: sha256:85ef76ba6909b13093960b44d81b946c420b88a2b92b0be61c0e6d1d16037407
	Status: Downloaded newer image for swarm:1.1.2
	Ip public for master3 : - 192.168.99.102 -
	Start Swarm manager on master3...
	7aabf05e150ca25a3ea503ff1e766a77b571f2adaf6567035f910e51f5f11165
	21ce32071d13824344ae1a8cd9bbae7fc56c2200cc54d264aee8bde2238e1556
	###########################################
	Install SwarmUI on master1:
	Unable to find image 'ptimagos/swarmui:0.1.0' locally
	0.1.0: Pulling from ptimagos/swarmui
	bcb0c438af1e: Pull complete
	Digest: sha256:df39d92b851a913336f176f81ebaa122f49e80e9c9d536fe02bbd7260a0a7c85
	Status: Downloaded newer image for ptimagos/swarmui:0.1.0
	543008c5265fbc1916649dcbca44d65df9389068cd778e4a3650887293fa2d6a
	Script ended
	You can connect to web interface now : http://192.168.99.100:9000
	###########################################
	```

## License - MIT
The SwarmUI code is licensed under the MIT license.


**SwarmUI:**
Copyright (c) 2016 David Lepoultier.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation 
files (the "Software"), to deal in the Software without 
restriction, including without limitation the rights to use, copy, 
modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be 
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, 
DAMAGES OR OTHER LIABILITY, 
WHETHER IN AN ACTION OF CONTRACT, 
TORT OR OTHERWISE, 
ARISING FROM, OUT OF OR IN CONNECTION WITH 
THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
