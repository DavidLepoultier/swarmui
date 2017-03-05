#!/bin/bash
###########################################################
# Starting script for SwarmUI
###########################################################
#
# Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>
# Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>
# 

# Start Docker Tls
/swarmui dockerTls &

# Start Docker Repo
/swarmui dockerRepo &

# Start SwarmUI 
/swarmui swarmui http://192.168.99.100:8500 
