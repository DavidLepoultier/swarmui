## SwarmUI

SwarmUI is a web interface for the Docker and Swarm Remote API. The goal is to provide a pure client side implementation so it is effortless to connect and manage docker. This project is based on [DockerUI](https://github.com/crosbymichael/dockerui) project, and is not complete. This's still under heavy development.

![Container](/dashboards.png)

### Goals
* Minimal dependencies - I really want to keep this project a pure html/js app.
* Consistency - The web UI should be consistent with the commands found on the docker / swarm CLI.

## Constraints
* You must start, on each node, the docker deamon with option TCP.
* One or many docker Swarm Manarger can be started in the cluster.
* All Swarm Manager and agent must used consul to discover all the nodes.
* On each node, docker swarm-agent must be started

## Using the container

### Container Quickstart 
1. Run: `docker run -d -p 9000:9000 ptimagos/swarmui -consul http://<consul host ip>:8500`

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
	sudo cp /var/lib/boot2docker/server.pem /certs/
	sudo cp /var/lib/boot2docker/server-key.pem /certs/
	exit
	```

5. Start a Swarm Manager container, with TLS option:
	```
	docker run -d --name swarm-manager -p 3376:3376 -v /certs:/certs \
		swarm manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/server.pem \
		--tlskey=/certs/server-key.pem -H tcp://0.0.0.0:3376 consul://192.168.99.100:8500
	```

6. Start a Swarm Agent container:
	```
	docker run -d --name=swarm-agent swarm join --addr 192.168.99.100:2376 consul://192.168.99.100:8500
	```

7. Start SwarmUI:
	```
	docker run -d -name=swarmui -v /certs:/certs -p 9000:9000 ptimagos/swarmui -consul http://192.168.99.100:8500 \
		-tls -CA /certs/ca.pem -cert /certs/server.pem -key /certs/server-key.pem
	```

	If you are behind a proxy, you can create the container like this: 
	```
	docker run -d -name=swarmui -v /certs:/certs -p 9000:9000 ptimagos/swarmui -consul http://192.168.99.100:8500 \
		-tls -CA /certs/ca.pem -cert /certs/server.pem -key /certs/server-key.pem -proxy http://<proxy ip>:<proxy port>
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
	docker-machine ssh master1 "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs; sudo cp /var/lib/boot2docker/server-key.pem /certs/"
	docker-machine ssh master2 "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs; sudo cp /var/lib/boot2docker/server-key.pem /certs/"
	docker-machine ssh master3 "sudo mkdir /certs; sudo cp /var/lib/boot2docker/ca.pem /certs; sudo cp /var/lib/boot2docker/server.pem /certs; sudo cp /var/lib/boot2docker/server-key.pem /certs/"
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
		-v /certs:/certs -p 9000:9000 ptimagos/swarmui -consul http://consul.service.consul:8500 \
		-tls -CA /certs/ca.pem -cert /certs/server.pem -key /certs/server-key.pem
	```

	Now you can connect to the SwarmUI web interface: `http://192.168.99.100:9000`

	At this point, you must have, in the dashboard, 10 containers, 3 images and 3 host.

	You can install SwarmUI on each node...

#### By scripting

1. Get and run the script createCluster.sh:

	```
	curl -sL https://raw.githubusercontent.com/Ptimagos/swarmui/master/scripts/createCluster.sh | bash -s master1 master2 master3
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
