angular.module('container', [])
.controller('ContainerController', ['ConsulPrimarySwarm', 'Settings', '$scope', 'Messages', '$timeout', 'Container', 
    '$routeParams', 'ViewSpinner', 'humansizeFilter', '$sce', '$location', 'Swarm', 'ContainerLogs',
    function (ConsulPrimarySwarm, Settings, $scope, Messages, $timeout, Container, $routeParams, ViewSpinner, humansizeFilter, $sce, $location, Swarm, ContainerLogs) {
    $scope.primaryUrl = '';
    $scope.changes = [];
    $scope.dashOn = false;
    $scope.hostOn = false;
    $scope.edit = false;
    $scope.stdout = '';
    $scope.stderr = '';
    $scope.showTimestamps = false;
    $scope.tailLines = 200;
    $scope.logIntervalId = '';
    $scope.ps_args = '';


    switch($routeParams.from){
      case 'dashboard':
        $scope.fromTo = '/' + $routeParams.from + '/containers/';
        $scope.returnTo = "to containers list";
        $scope.dashboard = '3';
        $scope.dashOn = true;
        break;
      case 'hosts':
        $scope.fromTo = '/' + $routeParams.from + '/' + $routeParams.node + '/';
        $scope.returnTo = 'to ' + $routeParams.node;
        $scope.dashboard = '1';
        $scope.hostOn = true;
        break;
      default:
        $scope.from = '/';
        $scope.returnTo = '';
        break;
    }

// ****** START CONTAINERS ****** //

    $scope.from = '/' + $routeParams.from + '/containers/';
    
    var update = function () {
        ViewSpinner.spin();
        ConsulPrimarySwarm.get({}, function (d){
          var url = atob(d[0].Value);
          $scope.primarySwarm = url;
          Swarm.info({node: $scope.primarySwarm}, function (d) {
            for (var i = 4; i < d['SystemStatus'].length;i += 8){
              var nodename = d['SystemStatus'][i][0].split(" ");
              if ( nodename[1] === $routeParams.node ) {
                $scope.hostUrl = d['SystemStatus'][i][1];
                break;
              }
            }
          });
          Container.get({id: $routeParams.id, node: $scope.primarySwarm}, function (d) {
            $scope.container = d;
            $scope.container.edit = false;
            $scope.container.Node = $routeParams.node;
            $scope.container.From = $routeParams.from;
            $scope.container.newContainerName = d.Name;
            ViewSpinner.stop();
          }, function (e) {
            if (e.status === 404) {
              $('.detail').hide();
              Messages.error("Not found", "Container not found.");
            } else {
              Messages.error("Failure", e.data);
            }
            ViewSpinner.stop();
          });
        });
      };

      $scope.getTop = function () {
        $scope.destroyInterval();
        Container.top({id: $routeParams.id,
          node: $scope.primarySwarm,
          ps_args: $scope.ps_args
        }, function (d) {
          $scope.containerTop = d;
        });
      };

      var getLog = function () {
        ContainerLogs.get($routeParams.id, $scope.primarySwarm, {
            stdout: 1,
            stderr: 0,
            timestamps: $scope.showTimestamps,
            tail: $scope.tailLines
        }, function (data, status, headers, config) {
            // Replace carriage returns with newlines to clean up output
            data = data.replace(/[\r]/g, '\n');
            // Strip 8 byte header from each line of output
            data = data.substring(8);
            data = data.replace(/\n(.{8})/g, '\n');
            $scope.stdout = data;
        });

        ContainerLogs.get($routeParams.id, $scope.primarySwarm, {
            stdout: 0,
            stderr: 1,
            timestamps: $scope.showTimestamps,
            tail: $scope.tailLines
        }, function (data, status, headers, config) {
            // Replace carriage returns with newlines to clean up output
            data = data.replace(/[\r]/g, '\n');
            // Strip 8 byte header from each line of output
            data = data.substring(8);
            data = data.replace(/\n(.{8})/g, '\n');
            $scope.stderr = data;
        });
      };

      // initial call
      $scope.getLogs = function () {
        getLog();
        $scope.logIntervalId = window.setInterval(getLog, 5000);
      };

      $scope.destroyInterval = function () {
        // clearing interval when view changes
        clearInterval($scope.logIntervalId);
      };

      $scope.$on("$destroy", function () {
        // clearing interval when view changes
        clearInterval($scope.logIntervalId);
      });

      $scope.getChanges = function () {
        ViewSpinner.spin();
        ConsulPrimarySwarm.get({}, function (d){
        var url = atob(d[0].Value); 
          Swarm.info({node: url}, function (d) {
            var nodeUrl = "";
            for (var i = 4; i < d['SystemStatus'].length;i += 8){
              var nodename = d['SystemStatus'][i][0].split(" ");
              if ( nodename[1] === $routeParams.node ) {
                nodeUrl = d['SystemStatus'][i][1];
                break;
              }
            }
            Container.changes({id: $routeParams.id, node: nodeUrl}, function (d) {
              $scope.changes = d;
              ViewSpinner.stop();
            });
          });
        });
      };

      $scope.start = function () {
        ViewSpinner.spin();
        Container.actionCont({
            id: $scope.container.Id,
            node: $scope.primarySwarm,
            HostConfig: $scope.container.HostConfig,
            action: 'start'
        }, function (d) {
            $timeout(updateStats, 1000);
            update();
            Messages.send("Container started", $routeParams.id);
        }, function (e) {
            update();
            Messages.error("Failure", "Container failed to start." + e.data);
        });
      };

      $scope.stop = function () {
          ViewSpinner.spin();
          Container.actionCont({
            id: $routeParams.id, 
            node: $scope.primarySwarm, 
            action: 'stop'
          }, function (d) {
            update();
            Messages.send("Container stopped", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to stop." + e.data);
          });
      };

      $scope.kill = function () {
          ViewSpinner.spin();
          Container.actionCont({
            id: $routeParams.id,
            node: $scope.primarySwarm, 
            action: 'kill'
          }, function (d) {
              update();
              Messages.send("Container killed", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to die." + e.data);
          });
      };

      $scope.commit = function () {
          ViewSpinner.spin();
          ContainerCommit.commit({
            id: $routeParams.id, 
            repo: $scope.container.Config.Image,
            node: $scope.primarySwarm
          }, function (d) {
              update();
              Messages.send("Container commited", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to commit." + e.data);
          });
      };
      $scope.pause = function () {
          ViewSpinner.spin();
          Container.actionCont({
            id: $routeParams.id,
            node: $scope.primarySwarm, 
            action: 'pause'
          }, function (d) {
              update();
              Messages.send("Container paused", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to pause." + e.data);
          });
      };

      $scope.unpause = function () {
          ViewSpinner.spin();
          Container.actionCont({
            id: $routeParams.id,
            node: $scope.primarySwarm, 
            action: 'unpause'
          }, function (d) {
              update();
              Messages.send("Container unpaused", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to unpause." + e.data);
          });
      };

      $scope.remove = function () {
          console.log($scope.from);
          ViewSpinner.spin();
          Container.remove({
            id: $routeParams.id,
            node: $scope.primarySwarm
          }, function (d) {
              update();
              $location.path($scope.from);
              Messages.send("Container removed", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to remove." + e.data);
          });
      };

      $scope.restart = function () {
          ViewSpinner.spin();
          Container.actionCont({
            id: $routeParams.id,
            node: $scope.primarySwarm, 
            action: 'restart'
          }, function (d) {
              update();
              Messages.send("Container restarted", $routeParams.id);
          }, function (e) {
              update();
              Messages.error("Failure", "Container failed to restart." + e.data);
          });
      };

      $scope.hasContent = function (data) {
          return data !== null && data !== undefined;
      };


      $scope.renameContainer = function () {
          // #FIXME fix me later to handle http status to show the correct error message
          Container.rename({
            id: $routeParams.id, 
            name: $scope.container.newContainerName,
            node: $scope.primarySwarm
          }, function (data) {
              if (data.name) {
                  $scope.container.Name = data.name;
                  Messages.send("Container renamed", $routeParams.id);
              } else {
                  $scope.container.newContainerName = $scope.container.Name;
                  Messages.error("Failure", "Container failed to rename.");
              }
          });
          $scope.container.edit = false;
      };

// ****** END CONTAINERS ****** //

// ****** START STATS ****** //

    var cpuLabels = [];
    var cpuData = [];
    var memoryLabels = [];
    var memoryData = [];
    var networkLabels = [];
    var networkTxData = [];
    var networkRxData = [];
    for (var i = 0; i < 60; i++) {
        cpuLabels.push('');
        cpuData.push(0);
        memoryLabels.push('');
        memoryData.push(0);
        networkLabels.push('');
        networkTxData.push(0);
        networkRxData.push(0);
    }
    var cpuDataset = { // CPU Usage
        fillColor: "rgba(151,187,205,0.5)",
        strokeColor: "rgba(151,187,205,1)",
        //pointColor: "rgba(151,187,205,1)",
        pointStrokeColor: "#fff",
        data: cpuData
    };
    var memoryDataset = {
        fillColor: "rgba(151,187,205,0.5)",
        strokeColor: "rgba(151,187,205,1)",
        //pointColor: "rgba(151,187,205,1)",
        pointStrokeColor: "#fff",
        data: memoryData
    };
    var networkRxDataset = {
        label: "Rx Bytes",
        fillColor: "rgba(151,187,205,0.5)",
        strokeColor: "rgba(151,187,205,1)",
        //pointColor: "rgba(151,187,205,1)",
        pointStrokeColor: "#fff",
        data: networkRxData
    };
    var networkTxDataset = {
        label: "Tx Bytes",
        fillColor: "rgba(255,180,174,0.5)",
        strokeColor: "rgba(255,180,174,1)",
        //pointColor: "rgba(255,180,174,1)",
        pointStrokeColor: "#fff",
        data: networkTxData
    };
    var networkLegendData = [
        {
            //value: '',
            color: 'rgba(151,187,205,0.5)',
            title: 'Tx Data'
        },
        {
            //value: '',
            color: 'rgba(255,180,174,0.5)',
            title: 'Rx Data'
        }];
    legend($('#network-legend').get(0), networkLegendData);

    Chart.defaults.global.animationSteps = 60; // Lower from 60 to ease CPU load.
    var cpuChart = new Chart($('#cpu-stats-chart').get(0).getContext("2d")).Line({
        labels: cpuLabels,
        datasets: [cpuDataset]
    }, {
        pointDot : false,
        responsive: true
    });

    var memoryChart = new Chart($('#memory-stats-chart').get(0).getContext('2d')).Line({
            labels: memoryLabels,
            datasets: [memoryDataset]
        },
        {
            scaleLabel: function (valueObj) {
                return humansizeFilter(parseInt(valueObj.value, 10));
            },
            pointDot : false,
            responsive: true
            //scaleOverride: true,
            //scaleSteps: 10,
            //scaleStepWidth: Math.ceil(initialStats.memory_stats.limit / 10),
            //scaleStartValue: 0
        });
    var networkChart = new Chart($('#network-stats-chart').get(0).getContext("2d")).Line({
        labels: networkLabels,
        datasets: [networkRxDataset, networkTxDataset]
    }, {
        scaleLabel: function (valueObj) {
            return humansizeFilter(parseInt(valueObj.value, 10));
        },
        pointDot : false,
        responsive: true
    });
    $scope.networkLegend = $sce.trustAsHtml(networkChart.generateLegend());

    $scope.getPrimary = function (){
        ConsulPrimarySwarm.get({}, function (d){
            var url = atob(d[0].Value);
            $scope.primaryUrl = url;
        });
    };

    $scope.getPrimary();

    function updateStats() {
        Container.stats({id: $routeParams.id, node: $scope.primaryUrl}, function (d) {
            var arr = Object.keys(d).map(function (key) {
                return d[key];
            });
            if (arr.join('').indexOf('no such id') !== -1) {
                Messages.error('Unable to retrieve stats', 'Is this container running?');
                return;
            }

            // Update graph with latest data
            $scope.data = d;
            updateCpuChart(d);
            updateMemoryChart(d);
            updateNetworkChart(d);
            timeout = $timeout(updateStats, 5000);
        }, function () {
            Messages.error('Unable to retrieve stats', 'Is this container running?');
            timeout = $timeout(updateStats, 5000);
        });
    }

    var timeout;
    $scope.$on('$destroy', function () {
        $timeout.cancel(timeout);
    });

    
    $timeout(updateStats, 1000);

    function updateCpuChart(data) {
        cpuChart.addData([calculateCPUPercent(data)], '');
        cpuChart.removeData();
    }

    function updateMemoryChart(data) {
        memoryChart.addData([data.memory_stats.usage], '');
        memoryChart.removeData();
    }

    var lastRxBytes = 0, lastTxBytes = 0;

    function updateNetworkChart(data) {
        // 1.9+ contains an object of networks, for now we'll just show stats for the first network
        // TODO: Show graphs for all networks
        if (data.networks) {
            $scope.networkName = Object.keys(data.networks)[0];
            data.network = data.networks[$scope.networkName];
        }
        var rxBytes = 0, txBytes = 0;
        if (lastRxBytes !== 0 || lastTxBytes !== 0) {
            // These will be zero on first call, ignore to prevent large graph spike
            rxBytes = data.network.rx_bytes - lastRxBytes;
            txBytes = data.network.tx_bytes - lastTxBytes;
        }
        lastRxBytes = data.network.rx_bytes;
        lastTxBytes = data.network.tx_bytes;
        networkChart.addData([rxBytes, txBytes], '');
        networkChart.removeData();
    }

    function calculateCPUPercent(stats) {
        // Same algorithm the official client uses: https://github.com/docker/docker/blob/master/api/client/stats.go#L195-L208
        var prevCpu = stats.precpu_stats;
        var curCpu = stats.cpu_stats;

        var cpuPercent = 0.0;

        // calculate the change for the cpu usage of the container in between readings
        var cpuDelta = curCpu.cpu_usage.total_usage - prevCpu.cpu_usage.total_usage;
        // calculate the change for the entire system between readings
        var systemDelta = curCpu.system_cpu_usage - prevCpu.system_cpu_usage;

        if (systemDelta > 0.0 && cpuDelta > 0.0) {
            cpuPercent = (cpuDelta / systemDelta) * curCpu.cpu_usage.percpu_usage.length * 100.0;
        }
        return cpuPercent;
    }

// ****** END STATS ****** //

    // Call function update Container
    update();
    $scope.getChanges();

}]);