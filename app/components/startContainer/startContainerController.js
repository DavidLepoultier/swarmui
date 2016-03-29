angular.module('startContainer', ['ui.bootstrap'])
.controller('StartContainerController', ['$scope', '$rootScope', '$routeParams', '$location', 'Container', 'Messages', 
 'errorMsgFilter', 'Swarm', 'ConsulPrimarySwarm',
function ($scope, $rootScope, $routeParams, $location, Container, Messages, errorMsgFilter, Swarm, ConsulPrimarySwarm) {
    $scope.template = 'app/components/startContainer/startcontainer.html';
    $scope.selected = [];
    $scope.fromNode = false;

    if ($routeParams.node){
        $scope.fromNode = true;
    }

/*
    ConsulPrimarySwarm.get({}, function (d){
      $scope.swarmUrl = atob(d[0].Value); 
      Container.query({all: 1, node: $scope.swarmUrl}, function (d) {
        $scope.containerNames = d.map(function (container) {
            return containernameFilter(container);
        });
      });
      Swarm.info({node: $scope.swarmUrl}, function (d) {
        var n = 0;
        for (var i = 4; i < d['SystemStatus'].length;i += 8) {
          $scope.Nodes[n] = d['SystemStatus'][i];
          n++;
        }
      });
    });
*/
    $scope.config = {
        Env: [],
        Labels: [],
        Volumes: [],
        SecurityOpts: [],
        HostConfig: {
            PortBindings: [],
            Binds: [],
            Links: [],
            Dns: [],
            DnsSearch: [],
            VolumesFrom: [],
            CapAdd: [],
            CapDrop: [],
            Devices: [],
            LxcConf: [],
            ExtraHosts: []
        }
    };

    $scope.menuStatus = {
        containerOpen: true,
        hostConfigOpen: false
    };

    function failedRequestHandler(e, Messages) {
        Messages.error('Error', errorMsgFilter(e));
    }

    function rmEmptyKeys(col) {
        for (var key in col) {
            if (col[key] === null || col[key] === undefined || col[key] === '' || $.isEmptyObject(col[key]) || col[key].length === 0) {
                delete col[key];
            }
        }
    }

    function getNames(arr) {
        return arr.map(function (item) {
            return item.name;
        });
    }

    $scope.create = function () {
        // Copy the config before transforming fields to the remote API format
        var config = angular.copy($scope.config);

        //config.Image = $routeParams.id;
        if (!config.Image) {
            Messages.send('Warning', 'Select a Tag version !');
            return;
        }

        if (!$scope.selected.Host) {
            Messages.send('Warning', 'Select a server host !');
            return;
        }

        if (config.Cmd && config.Cmd[0] === "[") {
            config.Cmd = angular.fromJson(config.Cmd);
        } else if (config.Cmd) {
            config.Cmd = config.Cmd.split(' ');
        }
        config.Env = config.Env.map(function (envar) {
            return envar.name + '=' + envar.value;
        });
        var labels = {};
        config.Labels = config.Labels.forEach(function(label) {
            labels[label.key] = label.value;
        });
        config.Labels = labels;

        config.Volumes = getNames(config.Volumes);
        config.SecurityOpts = getNames(config.SecurityOpts);

        config.HostConfig.VolumesFrom = getNames(config.HostConfig.VolumesFrom);
        config.HostConfig.Binds = getNames(config.HostConfig.Binds);
        config.HostConfig.Links = getNames(config.HostConfig.Links);
        config.HostConfig.Dns = getNames(config.HostConfig.Dns);
        config.HostConfig.DnsSearch = getNames(config.HostConfig.DnsSearch);
        config.HostConfig.CapAdd = getNames(config.HostConfig.CapAdd);
        config.HostConfig.CapDrop = getNames(config.HostConfig.CapDrop);
        config.HostConfig.LxcConf = config.HostConfig.LxcConf.reduce(function (prev, cur, idx) {
            prev[cur.name] = cur.value;
            return prev;
        }, {});
        config.HostConfig.ExtraHosts = config.HostConfig.ExtraHosts.map(function (entry) {
            return entry.host + ':' + entry.ip;
        });

        var ExposedPorts = {};
        var PortBindings = {};
        config.HostConfig.PortBindings.forEach(function (portBinding) {
            var intPort = portBinding.intPort + "/tcp";
            if (portBinding.protocol === "udp") {
                intPort = portBinding.intPort + "/udp";
            }
            var binding = {
                HostIp: portBinding.ip,
                HostPort: portBinding.extPort
            };
            if (portBinding.intPort) {
                ExposedPorts[intPort] = {};
                if (intPort in PortBindings) {
                    PortBindings[intPort].push(binding);
                } else {
                    PortBindings[intPort] = [binding];
                }
            } else {
                Messages.send('Warning', 'Internal port must be specified for PortBindings');
            }
        });
        config.ExposedPorts = ExposedPorts;
        config.HostConfig.PortBindings = PortBindings;

        // Set Swarm Manager Host
        config.SwarmHost = $scope.swarmUrl;

        // Remove empty fields from the request to avoid overriding defaults
        rmEmptyKeys(config.HostConfig);
        rmEmptyKeys(config);

        var ctor = Container;
        var loc = $location;
        var s = $scope;
        $('#create-modal').modal('hide');
        Container.create(config, function (d) {
            Messages.send('Container Created', d.Id);
            if ($routeParams.node){
                $rootScope.$emit("CallUpdateContainer", {});
            }
            if ($scope.dashContainer){
                $rootScope.$emit("CallUpdateContainer", {});
            }
            delete $scope.config;
            delete $scope.selected;
            $scope.selected = [];
            $scope.config = {
              Env: [],
              Labels: [],
              Volumes: [],
              SecurityOpts: [],
              HostConfig: {
                  PortBindings: [],
                  Binds: [],
                  Links: [],
                  Dns: [],
                  DnsSearch: [],
                  VolumesFrom: [],
                  CapAdd: [],
                  CapDrop: [],
                  Devices: [],
                  LxcConf: [],
                  ExtraHosts: []
              }
            };
        }, function (e) {
          failedRequestHandler(e, Messages);
        });
    };

    $scope.addEntry = function (array, entry) {
        array.push(entry);
    };
    $scope.addNodeEntry = function (array) {
        var entry = {name: 'constraint:node=', value: $scope.selected.Host};
        array.push(entry);
    };
    $scope.rmEntry = function (array, entry) {
        var idx = array.indexOf(entry);
        array.splice(idx, 1);
    };
}]);