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
* The Tls certificates must be stored in the directory "/certs" on the host where swarmui be deployed. With this naming :
 - ca.pem
 - cert.pem
 - key.pem

## Using the container

### Container Quickstart 
1. Run: `docker run -d -p 9000:9000 -v /certs:/certs ptimagos/swarmui http://<consul host ip>:8500`

2. Open your browser to `http://<dockerd host ip>:9000`

## Testing SwarmUI with a cluster on a single docker-machine

Here we will used docker-machine and virtualbox to create the host environment. In this way, the dockers deamons started with TCP and TLS options.

1. Create host : `docker-machine create -d virtualbox master`

If you are behind a proxy, you can create the machine with like this : `docker-machine create -d virtualbox master --engine-env HTTP_PROXY=http://<proxy ip>:<proxy port>/ --engine-env HTTPS_PROXY=http://<proxy ip>:<proxy port>/`

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
