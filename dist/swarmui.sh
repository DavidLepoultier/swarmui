#!/bin/bash
###########################################################
# Starting script for SwarmUI
###########################################################
#
# Copyright (c) 2017 David Lepoultier
# Licensed MIT
# 

# Start Docker Tls
/swarmui dockerTls &

# Start Docker Repo
/swarmui dockerRepo &

# Start SwarmUI 
/swarmui swarmui http://192.168.99.100:8500 
