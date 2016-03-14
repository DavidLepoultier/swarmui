## SwarmUI

![Containers](/dashboards.png)
SwarmUI is a web interface for the Docker and Swarm Remote API. The goal is to provide a pure client side implementation so it is effortless to connect and manage docker. This project is based on [DockerUI](https://github.com/crosbymichael/dockerui) project, and is not complete. This's still under heavy development.

![Container](/image-container.png)

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

### Container Quickstart 
1. Run: `docker run -d -p 9000:9000 --privileged -v /certs:/certs dockerui/dockerui`

2. Open your browser to `http://<dockerd host ip>:9000`