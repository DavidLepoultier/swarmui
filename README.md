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

## Testing SwarmUI with a cluster on a single docker-machine

Here we will used docker-machine and virtualbox to create the host environment. In this way, the dockers deamons started with TCP and TLS options.

1. Create host: 
`docker-machine create -d virtualbox master`

We will suppose than the IP address for this machine is "[b]192.168.99.100[b]"

If you are behind a proxy, you can create the machine like this: `docker-machine create -d virtualbox master --engine-env HTTP_PROXY=http://<proxy ip>:<proxy port>/ --engine-env HTTPS_PROXY=http://<proxy ip>:<proxy port>/`

2. Load the environment of the new machine: 
`eval "$(docker-machine env master)"`

3. Start a consul container that will be used by Swarm: 
`docker run -p 8400:8400 -p 8500:8500 -p 53:53/udp --name consul-server -h master progrium/consul -server -bootstrap`

The [Web UI](https://www.consul.io/intro/getting-started/ui.html) can be enabled by adding the -ui-dir flag:
`docker run -p 8400:8400 -p 8500:8500 -p 53:53/udp --name consul-server -h master progrium/consul -server -bootstrap -ui-dir /ui`

4. Copy the certificats in the directory "/certs":
`docker-machine ssh master
sudo mkdir /certs 
sudo cp /var/lib/boot2docker/ca.pem /certs
sudo cp /var/lib/boot2docker/server.pem /certs/cert.pem
sudo cp /var/lib/boot2docker/server-key.pem /certs/key.pem'

5. Start a Swarm Manager container, with TLS option:
`docker run -d --name swarm-manager -p 3376:3376 -v /var/lib/boot2docker:/certs \
    swarm:${swarm_tags} manage --tls --tlscacert=/certs/ca.pem --tlscert=/certs/server.pem \
    --tlskey=/certs/server-key.pem -H tcp://0.0.0.0:3376 --replication --addr $machine_ip:3376 \
    consul://<ip host master>:8500`


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
