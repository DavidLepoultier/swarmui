/*! SwarmUI - v0.2.0 - 2017-03-03
 * https://github.com/Ptimagos/swarmui
 * Copyright (c) 2017 David Lepoultier;
 * Licensed MIT
 */
angular.module('swarmui', [
    'swarmui.templates',
    'ngRoute',
    'ui.bootstrap',
    'swarmui.services',
    'swarmui.filters',
    'masthead',
    'dashboard',
    'dashboardContainers',
    'dashboardImages',
    'container',
    'image',
    'imagesActions',
    'startContainer',
    'containersActions',
    'pullImage',
    'loader',
    'hosts',
    'hostsInforamtion',
    'wrapperHosts',
    'wrapperDashboard'])
    .config(['$routeProvider', function ($routeProvider) {
        'use strict';
        $routeProvider.when('/', {
            templateUrl: 'app/components/dashboard/dashboard.html',
            controller: 'DashboardController'
        });
        $routeProvider.when('/:from/images/', {
            templateUrl: 'app/components/dashboardImages/dashboardImages.html',
            controller: 'DashboardImagesController'
        });
        $routeProvider.when('/:from/images/:id/', {
            templateUrl: 'app/components/image/image.html',
            controller: 'ImageController'
        });
            $routeProvider.when('/:from/:node/images/:id/', {
            templateUrl: 'app/components/image/image.html',
            controller: 'ImageController'
        });
        $routeProvider.when('/dashboard/containers/', {
            templateUrl: 'app/components/dashboardContainers/dashboardContainers.html',
            controller: 'DashboardContainersController'
        });
        $routeProvider.when('/:from/containers/:id/', {
            templateUrl: 'app/components/container/container.html',
            controller: 'ContainerController'
        });
        $routeProvider.when('/:from/containers/:id/stats', {
            templateUrl: 'app/components/stats/stats.html',
            controller: 'StatsController'
        });
        $routeProvider.when('/:from/containers/:id/logs/', {
            templateUrl: 'app/components/containerLogs/containerlogs.html',
            controller: 'ContainerLogsController'
        });
        $routeProvider.when('/:from/containers/:id/top', {
            templateUrl: 'app/components/containerTop/containerTop.html',
            controller: 'ContainerTopController'
        });
        $routeProvider.when('/:from/containers/:id/stats', {
            templateUrl: 'app/components/stats/stats.html',
            controller: 'StatsController'
        });
        $routeProvider.when('/:from/containers/:containerId/image/:id/', {
            templateUrl: 'app/components/image/image.html',
            controller: 'ImageController'
        });
        $routeProvider.when('/hosts/', {
            templateUrl: 'app/components/hosts/hosts.html',
            controller: 'HostsController'
        });
        $routeProvider.when('/hosts/:node/', {
            templateUrl: 'app/components/hostInformations/hostInformation.html',
            controller: 'HostsInformationController'
        });
        $routeProvider.otherwise({redirectTo: '/'});
    }])
    // This is swarmui url path (without first "/") that will use to make requests
    .constant('CONSUL_ENDPOINT', 'consulapi')
    .constant('DOCKER_ENDPOINT', 'swarmuiapi')
    .constant('DOCKERREPO_ENDPOINT', 'swarmuiapirepo')
    .constant('DOCKER_PORT', '') // Docker port, leave as an empty string if no port is requred.  If you have a port, prefix it with a ':' i.e. :4243
    .constant('UI_VERSION', '0.2.0');
    

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
          Container.get({id: $routeParams.id, node: $scope.primarySwarm}, function (d) {
            console.log(d);
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
}]);
angular.module('containersActions', [])
.controller('ContainersActionsController', ['$scope', '$rootScope', '$routeParams', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {

    $scope.actionContainer = function (id,container,status){
      var actionCont = '';
      if (status === 'Ghost') {
          return;
      } else if (status.indexOf('Exit') !== -1 && status !== 'Exit 0' || status === 'created' || status === 'Created' ) {
        actionCont = 'start';
      } else {
        actionCont = 'stop';
      }
      containerBatch(id, $scope.swarmUrl, actionCont, container);
    };

    var containerBatch = function (id, url, actionCont, container) {
      ViewSpinner.spin();
      var actionTask = actionCont[0].toUpperCase() + actionCont.slice(1) + " container";
      var idShort = id.substring(0, 12);
      var logs = "";
      Container.actionCont({id: id, node: url, action: actionCont}, function (d) {
        $rootScope.$emit("CallUpdateContainer", {});
        Messages.send(actionTask + ' : ' + container.Names, id);
      }, function (e) {
        Messages.error("Failure", "Container failed to " + actionCont + "." + $routeParams.id);
      });
       ViewSpinner.stop();
    };    
    
    var batch = function (items, order, action, msg) {
      ViewSpinner.spin();
      var counter = 0;
      var complete = function () {
        counter = counter - 1;
        if (counter === 0) {
          ViewSpinner.stop();
          $rootScope.$emit("CallUpdateContainer", {});
        }
      };
      angular.forEach(items, function (c) {
        if (c.Checked) {
          if (action === 'start') {
            Container.get({id: c.Id, node: $scope.swarmUrl}, function (d) {
              c = d;
              counter = counter + 1;
              order({id: c.Id, node: $scope.swarmUrl, action: action,  HostConfig: c.HostConfig || {}}, function (d) {
                Messages.send("Container " + msg, c.Id);
                var index = $scope.containers.indexOf(c);
                complete();
              }, function (e) {
                Messages.error("Failure", e.data);
                complete();
              });
            }, function (e) {
              if (e.status === 404) {
                $('.detail').hide();
                Messages.error("Not found", "Container not found.");
              } else {
                Messages.error("Failure", e.data);
              }
              complete();
            });
          } else if (order === Container.remove) {
            counter = counter + 1;
            order({id: c.Id, node: $scope.swarmUrl}, function (d) {
              if (d[0] === '4'){ 
                var array = $.map(d, function(value, index) {
                  return [value];
                });
                var error = "";
                for (var i = 0; i < array.length - 15; i++) {
                  error += array[i];
                }
                Messages.error("Failure Container " + msg, error);
              } else {
                Messages.send("Container " + msg, c.Id);
              }
              var index = $scope.containers.indexOf(c);
              complete();
            }, function (e) {
              Messages.error("Failure Container " + msg, e.data);
              complete();
            });
          } else {
            counter = counter + 1;
            order({id: c.Id, action: action, node: $scope.swarmUrl}, function (d) {
              Messages.send("Container " + msg, c.Id);
              var index = $scope.containers.indexOf(c);
              complete();
            }, function (e) {
              Messages.error("Failure", e.data);
              complete();
            });
          }
        }
      });
      if (counter === 0) {
        ViewSpinner.stop();
      }
    };

    $scope.startAction = function () {
      batch($scope.containers, Container.actionCont, 'start' , "Started");
    };
  
    $scope.stopAction = function () {
      batch($scope.containers, Container.actionCont, 'stop', "Stopped");
    };
  
    $scope.restartAction = function () {
      batch($scope.containers, Container.actionCont, 'restart', "Restarted");
    };
  
    $scope.killAction = function () {
      batch($scope.containers, Container.actionCont, 'kill', "Killed");
    };
  
    $scope.pauseAction = function () {
      batch($scope.containers, Container.actionCont, 'pause', "Paused");
    };
  
    $scope.unpauseAction = function () {
      batch($scope.containers, Container.actionCont, 'unpause', "Unpaused");
    };
  
    $scope.removeAction = function () {
      batch($scope.containers, Container.remove, '', "Removed");
    };
}]);
angular.module('dashboard', [])
.controller('DashboardController', ['$scope', 'Container', 'Image', 'Settings', 'LineChart', 'ConsulPrimarySwarm', 'ConsulSolerni', 'Swarm',
  function ($scope, Container, Image, Settings, LineChart, ConsulPrimarySwarm, ConsulSolerni, Swarm) {
  $scope.predicate = '-Created';
  $scope.dashboard = '1';

  $scope.wrapperDash = function() {
      $('#wrapper').toggleClass('active');
  };

  var getStarted = function (data) {
      $scope.totalContainers = data.length;
      LineChart.build('#containers-started-chart', data, function (c) {
          return new Date(c.Created * 1000).toLocaleDateString();
      });
      var s = $scope;
      Image.query({}, function (d) {
          s.totalImages = d.length;
          LineChart.build('#images-created-chart', d, function (c) {
              return new Date(c.Created * 1000).toLocaleDateString();
          });
      });
  };

  function addText(d, total) {
    var canvas = document.getElementById(d);
    var ctx = document.getElementById(d).getContext("2d");
    var cx = '';
    var cy = '';

    switch(screen.availWidth){
        case 1280:
          cx = canvas.width / 4;
          cy = canvas.height / 4;
          break;
        default:
          cx = canvas.width / 2;
          cy = canvas.height / 2;
          break;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 2em Helvetica Neue';
    ctx.fillStyle = '#000';
    ctx.fillText(total, cx, cy);
  }

  var opts = {
    animation: false,
    responsive: true
  };

  var getActiveMooc =  ConsulSolerni.getActiveMooc({}, function (d){});

  ConsulPrimarySwarm.get({}, function (d){
    var url = atob(d[0].Value);
    var activeMooc = atob(getActiveMooc[0].Value);
    Container.get({node: url, id: activeMooc}, function (d) {
        var running = 0;
        var created = 0;
        var stopped = 0;
        
        if (d.State.Status === '') {
            created += 1;
        } else if (d.State.Status.indexOf('exit') !== -1) {
            stopped += 1;
        } else {
            running += 1;
        }

        var c = new Chart($('#containers-chart').get(0).getContext("2d"));
        var data = [
            {
                value: running,
                color: '#5bb75b',
                title: 'Running'
            }, // running
            {
                value: stopped,
                color: '#C7604C',
                title: 'Stopped'
            } // stopped
        ];

        c.Doughnut(data, opts);
        var lgd = $('#containers-chart-legend').get(0);
        legend(lgd, data);
        addText('containers-chart', d.Name.split('/')[1]);
    });
    Image.query({node: url}, function (d) {
      var tags = 0;
      var untags = 0;
      
      for (var i = 0; i < d.length; i++) {
          var item = d[i];
          if (item.RepoTags[0].indexOf('mooc') !== -1) {
              tags += 1;
          } 
      }

      var c = new Chart($('#images-chart').get(0).getContext("2d"));
      var data = [
          {
              value: tags,
              color: '#5bb75b',
              title: 'Mooc Tagged'
          }
      ];

      c.Doughnut(data, opts);
      addText('images-chart', tags);
    });
  });
}]);

angular.module('dashboardContainers', [])
.controller('DashboardContainersController', ['$scope', '$rootScope', '$routeParams', 'Container', 'Swarm', 'Image',
  'ConsulPrimarySwarm', 'ConsulSolerni', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Container, Swarm, Image, ConsulPrimarySwarm, ConsulSolerni, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.toggle = false;
    $scope.dashContainer = true;
    $scope.displayAll = Settings.displayAll;
    $scope.dashboard = '3';
    $scope.swarmUrl = '';
    $scope.Nodes = [];


    $rootScope.$on("CallUpdateContainer", function(){
      update();
    });

    $scope.predicate = 'NodeName';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    $scope.toggleSelectAll = function () {
      angular.forEach($scope.containers, function (i) {
        i.Checked = $scope.toggle;
      });
    };
  
    $scope.toggleGetAll = function () {
      Settings.displayAll = $scope.displayAll;
      update({all: Settings.displayAll ? 1 : 0});
    };

    $scope.setAlarm = function (container,entry,warning) {
      var setAlarmTo = "";
      if ( warning === "1" ){
        entry.warning = "0";
        setAlarmTo = "to activate";
      } else {
        entry.warning = "1";
        setAlarmTo = "to desactivate";
      }
      ConsulContainers.setalarm(entry, function (d) {
        Messages.send("Udpdate alarm for " + container, setAlarmTo);
      }, function (e) {
        Messages.error("Update alarm failed for " + container, setAlarmTo);
      });
    };

    $rootScope.$on("CallUpdateContainer", function(){
      update();
    });

    var getActiveMooc =  ConsulSolerni.getActiveMooc({}, function (d){});

    var update = function (data) {
      $scope.RepoTags = [];
      ViewSpinner.spin();
      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value); 
        Image.query({node: $scope.swarmUrl}, function (d) {
          d.map(function (item) {
            $scope.RepoTags.push(item.RepoTags[0]);
          });
        });
        var activeMooc = atob(getActiveMooc[0].Value);
        Container.get({node: $scope.swarmUrl, id: activeMooc}, function (d) {
          $scope.activeContainer = d;
        });
        Container.query({all: 1, node: $scope.swarmUrl}, function (d) {
          $scope.containers = d.map(function (item) {
              return new ContainerViewModel(item);
          });
          for (var i = 0; i < $scope.containers.length; i++){
            var cname = $scope.containers[i].Names[0].split("/")[1];
            var idContainer = $scope.containers[i].Id;
            if ( idContainer !== $scope.activeContainer.Id ) {
              $scope.containers.splice(i, 1);
              i--;
            } else {
              if ($scope.containers[i].Status === ''){
                $scope.containers[i].Status = 'created';
              }
              $scope.containers[i].ContainerName = cname;
            }
          }
          ViewSpinner.stop();
        });
      });
    };

    update();
}]);

angular.module('dashboardImages', [])
.controller('DashboardImagesController', ['$scope', '$rootScope', '$routeParams', '$timeout', 'Image', 'Container', 'Swarm', 
  'ConsulPrimarySwarm', 'ConsulSolerni', 'ConsulService', 'SettingsConsul', 'Settings', 'Messages', 
  function ($scope, $rootScope, $routeParams, $timeout, Image, Container, Swarm, ConsulPrimarySwarm, ConsulSolerni, ConsulService, SettingsConsul, Settings, Messages) {
    $scope.images = [];
    $scope.toggle = false;
    $scope.swarmUrl = '';
    $scope.dashboard = '2';
    $scope.Nodes = [];
    $scope.containers = [];

    $scope.predicate = 'RepoTag';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    $rootScope.$on("CallUpdateImage", function(){
      update();
    });

    $scope.containerBatch = function () {
      var actionTask = $scope.actionCont[0].toUpperCase() + $scope.actionCont.slice(1) + " container";
      Container.actionCont({id: $scope.containerId, node: $scope.swarmUrl, action: $scope.actionCont}, function (d) {
        Messages.send(actionTask + ' : ', $scope.containerId);
        ConsulSolerni.getMoocId({info: $scope.container.Name, key: 'containerId'}, function (d){
          $scope.containerId = atob(d[0].Value);
          $scope.actionCont = 'start';
          actionTask = $scope.actionCont[0].toUpperCase() + $scope.actionCont.slice(1) + " container";
          Container.actionCont({id: $scope.containerId, node: $scope.swarmUrl, action: $scope.actionCont}, function (d) {
            Messages.send(actionTask + ' : ', $scope.containerId);
            ConsulSolerni.updateActiveMooc({}, $scope.containerId, function (d){ 
              update();
              $('#loader-modal').modal('hide');
              ConsulService.removeService({Node: $scope.containers.Name.slice(1)});
              ConsulService.addService({Datacenter: 'dc1', Node: $scope.container.Name, Address: '172.17.0.2', Service: {Service: $scope.container.Name.split('-')[1], Port: 80}});
            });
          }, function (e) {
            Messages.error("Failure", "Container failed to " + $scope.actionCont + ".");
            update();
            $('#loader-modal').modal('hide');
          });
        });
      }, function (e) {
        Messages.error("Failure", "Container failed to " + $scope.actionCont + ".");
        update();
        $('#loader-modal').modal('hide');
      });  
    };

    $scope.actionImage = function (image) {
      if (image.Status !== 'running'){
        $('#loader-modal').modal({backdrop: 'static', keyboard: true, show: true});
        $scope.actionCont = 'stop';
        $scope.container = image;
        $scope.containerId = $scope.activeMooc;
        $scope.containerBatch();
      }
    };

    var update = function (data) {
      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value);
        ConsulSolerni.getActiveMooc({}, function (d){
          $scope.activeMooc = atob(d[0].Value);
          Container.get({node: $scope.swarmUrl, id: $scope.activeMooc}, function (d) {
            $scope.containers = d;
          });
          Image.query({node: $scope.swarmUrl}, function (d) {
            $scope.images = d.map(function (item) {
                return new ImageViewModel(item);
            });
            for (var i = 0; i < $scope.images.length; i++){
              var tmp = $scope.images[i].RepoTags[0].split('/')[2];
              if (tmp.indexOf('mooc') === -1) {
                $scope.images.splice(i, 1);
                i--;
              } else {
                $scope.images[i].From = $routeParams.from;
                $scope.images[i].RepoTag = tmp;
                $scope.images[i].Name = tmp.split(':')[0];
                var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                var language = navigator.browserLanguage;
                var date = new Date($scope.images[i].Created*1000);
                $scope.images[i].Create = date.toLocaleDateString(language, options);
                var countContainer = 0;
                if ( $scope.images[i].Id === $scope.containers.Image) {
                  countContainer++;
                }
                if (countContainer !== 0) {
                  $scope.images[i].ContainerCreate = 'Set';
                  $scope.images[i].Status = $scope.containers.State.Status;
                  $scope.images[i].Select = 'off';
                } else {
                  $scope.images[i].ContainerCreate = 'Unset';
                  $scope.images[i].Status = 'created';
                }
              }
            }
          });
        });
      });
    };

    $scope.toggleSelectAll = function () {
      angular.forEach($scope.images, function (i) {
        i.Checked = $scope.toggle;
      });
    };
    
  //update({all: Settings.displayAll ? 1 : 0});
  update();
}]);

angular.module('hostsInforamtion', [])
.controller('HostsInformationController', ['$scope', '$rootScope', '$routeParams', 'Swarm', 'Container', 'containernameFilter',
  'errorMsgFilter', 'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner', 'Image',
  function ($scope, $rootScope, $routeParams, Swarm, Container, containernameFilter, errorMsgFilter, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner, Image) {
    $scope.dashboard = '1';
    $scope.actContainer = true;
    $scope.actImage = false;
    $scope.toggle = false;
    $scope.toggleImg = false;
    $scope.newToggle = true;
    $scope.swarmUrl = '';
    $scope.hostUrl = '';
    $scope.containers = [];
    $scope.images = [];
    $scope.Nodes = [];

    $rootScope.$on("CallUpdateContainer", function(){
      containerQuery();
    });

    $rootScope.$on("CallUpdateImage", function(){
      imageQuery();
    });

    $scope.predicate = 'Names';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    $scope.predicateImage = 'RepoTags';
    $scope.reverse = false;
    $scope.orderImage = function(predicateImage) {
      $scope.reverse = ($scope.predicateImage === predicateImage) ? !$scope.reverse : false;
      $scope.predicateImage = predicateImage;
    };

    $scope.activeContainer = function (){
      update();
      $scope.actContainer = true;
      $scope.actImage = false;
    };

    $scope.activeImage = function (){
      update();
      $scope.actContainer = false;
      $scope.actImage = true;
    };

	$scope.toggleSelectAll = function () {
		if ( $scope.toggle === $scope.newToggle ){
			$scope.toggle = false;
		} else {
			$scope.toggle = true;
		}
		angular.forEach($scope.containers, function (i) {
			i.Checked = $scope.toggle;
		});
	};

	$scope.toggleSelectAllImage = function () {
		if ( $scope.toggleImg === $scope.newToggle ){
			$scope.toggleImg = false;
		} else {
			$scope.toggleImg = true;
		}
		angular.forEach($scope.images, function (i) {
			i.Checked = $scope.toggleImg;
		});
	};

	var containerQuery = function (){
		Container.query({all: 1, node: $scope.hostUrl}, function (d) {
			$scope.containers = d.map(function (item) {
				return new ContainerViewModel(item);
			});
		});
	};

	var imageQuery = function (){
		Image.query({node: $scope.hostUrl}, function (d) {
			$scope.images = d.map(function (item) {
				return new ImageViewModel(item);
			});
		
		for (var n = 0; n < $scope.images.length; n++){
			var countContainer = 0;
      for (var c = 0; c < $scope.containers.length; c++) {
        if ( $scope.images[n].RepoTags[0] === $scope.containers[c].Image ) {
          countContainer++;
        }
      }
      if (countContainer !== 0) {
        $scope.images[n].ContainerCreate = countContainer;
      } else {
        $scope.images[n].ContainerCreate = '';
      }
    }
    });
	};

	var update = function (data) {
		ViewSpinner.spin();
		ConsulPrimarySwarm.get({}, function (d){
			$scope.swarmUrl = atob(d[0].Value); 
			Swarm.info({node: $scope.swarmUrl}, function (d) {
				for (var i = 4; i < d['SystemStatus'].length;i += 8){
					var nodename = d['SystemStatus'][i][0].split(" ");
					if ( nodename[1] === $routeParams.node ) {
						$scope.hostUrl = d['SystemStatus'][i][1];
						$scope.Nodes[0] = d['SystemStatus'][i];
						break;
					}
				}
				Swarm.info({node: $scope.hostUrl}, function (d){
					$scope.hostInfo = d;
				});
				Container.query({all: 1, node: $scope.hostUrl}, function (d) {
					$scope.containers = d.map(function (item) {
						return new ContainerViewModel(item);
					});
					$scope.containerNames = d.map(function (item) {
						return containernameFilter(item);
					});
				});
				Image.query({node: $scope.hostUrl}, function (d) {
					$scope.images = d.map(function (item) {
						return new ImageViewModel(item);
					});
				
				for (var n = 0; n < $scope.images.length; n++){
					var countContainer = 0;
          for (var c = 0; c < $scope.containers.length; c++) {
            if ( $scope.images[n].RepoTags[0] === $scope.containers[c].Image ) {
              countContainer++;
            }
          }
          if (countContainer !== 0) {
            $scope.images[n].ContainerCreate = countContainer;
          } else {
            $scope.images[n].ContainerCreate = '';
          }
        }
        });
			});
		});
		ViewSpinner.stop();
    };
    update();
}]);
angular.module('hosts', [])
.controller('HostsController', ['$scope', '$routeParams', 'Swarm', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, Swarm, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.swarms = [];
    $scope.toggle = false;
    $scope.dashboard = '1';
    $scope.containers = [];

    $scope.predicate = 'nodename';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    $scope.setAlarm = function (node,entry,warning) {
      var setAlarmTo = "";
      if ( warning === "1" ){
        entry.warning = "0";
        setAlarmTo = "to activate";
      } else {
        entry.warning = "1";
        setAlarmTo = "to desactivate";
      }
      ConsulNodes.setalarm(entry, function (d) {
        Messages.send("Udpdate alarm for " + node, setAlarmTo);
      }, function (e) {
        Messages.error("Update alarm failed for " + node, setAlarmTo);
      });
    };

    var containersStatus = function (url,node) {
      Container.query({all: 1, node: url}, function (d) {
        for (var n = 0; n < node.length; n++) {
          var running = 0;
          var stopped = 0;
          var created = 0;
          for (var i = 0; i < d.length; i++) {
            var item = d[i];
            var splitedNames = item.Names[0].split("/");
            if (node[n].nodename === splitedNames[1]) {
              if (item.Status === '') {
                created++;
              } else if (item.Status.indexOf('Exit') !== -1 && item.Status !== 'Exit 0') {
                stopped++;
              } else {
                running++;
              }
            }
          }
          if (stopped === 0 ){
            stopped = "";
          }
          if (created === 0 ){
            created = "";
          }
          $scope.swarms[n].running = running;
          $scope.swarms[n].stopped = stopped;
          $scope.swarms[n].created = created;
        }
      });
    };

    var update = function (data) {
      ViewSpinner.spin();
      ConsulPrimarySwarm.get({}, function (d){
        var url = atob(d[0].Value); 
        Swarm.info({node: url}, function (d) {
          var k = 5;
          var l = 9;
          var j = 0;
          var values = [];
          for (var i = 4; i < d['SystemStatus'].length;i += 8){
            var version = d['SystemStatus'][l][1].split(" ");
            var nodename = d['SystemStatus'][i][0].split(" ");
            var value = '{"nodename":"' + nodename[1] + '","url":"' + d['SystemStatus'][i][1] + '","health":"' + d['SystemStatus'][k][1] + '","version":"' + version[3] + '"}';
            k += 8;
            l += 8;   
            values[j] = JSON.parse(value);
            j++; 
          }
          $scope.swarms = values.map(function (item) {
              return new SwarmViewModel(item);
          }); 
          containersStatus(url, $scope.swarms);   
          ViewSpinner.stop();
        });
      });
    };

    $scope.toggleSelectAll = function () {
      angular.forEach($scope.swarms, function (i) {
        i.Checked = $scope.toggle;
      });
    };
    
    update();
}]);

angular.module('image', [])
.controller('ImageController', ['$scope', '$q', '$routeParams', '$location', 'Image', 'Container',
  'Messages', 'LineChart', 'Swarm', 'ConsulPrimarySwarm', 'Repositories',
    function ($scope, $q, $routeParams, $location, Image, Container, Messages, LineChart, Swarm, ConsulPrimarySwarm, Repositories) {
      $scope.history = [];
      $scope.containerchart = true;
      $scope.addTags = false;
      $scope.tagInfo = {repo: '', version: '', force: false};
      $scope.id = '';
      $scope.repoTags = [];
      $scope.Nodes = [];
      $scope.swarmUrl = '';

      switch($routeParams.from){
        case 'dashboard':
          if ($routeParams.containerId){
            $scope.from = '/' + $routeParams.from + '/' + $routeParams.node + '/containers/' + $routeParams.containerId;
            $scope.toParent = $scope.from + '/image/';
            $scope.returnTo = "to container";
            $scope.dashboard = '3';
          } else {
            $scope.from = '/' + $routeParams.from + '/images/';
            $scope.toParent = $scope.from;
            $scope.returnTo = "to moocs list";
            $scope.dashboard = '2';
          }
          $scope.dashOn = true;
          break;
        case 'hosts':
          if ($routeParams.containerId){
            $scope.from = '/' + $routeParams.from + '/' + $routeParams.node + '/containers/' + $routeParams.containerId;
            $scope.toParent = $scope.from + '/image/';
            $scope.returnTo = "to container";
          } else {
            $scope.from = '/' + $routeParams.from + '/' + $routeParams.node;
            $scope.toParent = '/' + $routeParams.from + '/' + $routeParams.node + '/images/';
            $scope.returnTo = 'to ' + $routeParams.node;
          }
          $scope.dashboard = '1';
          $scope.hostOn = true;
          $scope.node = $routeParams.node;
          break;
        default:
          $scope.from = '/';
          $scope.returnTo = '';
          break;
      }

      $scope.removeImage = function (id) {
        Image.remove({id: id, node: $scope.swarmUrl}, function (d) {
          d.forEach(function(msg){
            var key = Object.keys(msg)[0];
            Messages.send(key, msg[key]);
          });
          // If last message key is 'Deleted' then assume the image is gone and send to images page
          if (d[d.length-1].Deleted) {
            $location.path($scope.from);
          } else {
            $location.path($scope.toParent + $scope.id); // Refresh the current page.
          } 
        }, function (e) {
            $scope.error = e.data;
            Messages.error("Warning", $scope.error);
        });
      };

      $scope.getHistory = function (url) {
        Image.history({id: $routeParams.id, node: url}, function (d) {
          $scope.history = d;
        });
      };

      /**
       * Get RepoTags from the /images/query endpoint instead of /image/json,
       * for backwards compatibility with Docker API versions older than 1.21
       * @param {string} imageId
       */
      function getRepoTags(imageId) {
        Image.query({}, function (d) {
            d.forEach(function(image) {
                if (image.Id === imageId && image.RepoTags[0] !== '<none>:<none>') {
                    $scope.RepoTags = image.RepoTags;
                }
            });
        });
      }

      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value); 
        Image.get({id: $routeParams.id, node: $scope.swarmUrl}, function (d) {
          $scope.image = d;
          $scope.id = d.Id;
          $scope.RepoTag = d.RepoTags[0].split('/')[2];
          if (d.RepoTags) {
              $scope.RepoTags = d.RepoTags;
          } else {
              getRepoTags($scope.id);
          }
          //$scope.getRepositoriesTags($scope.RepoTags);
          $scope.getHistory($scope.swarmUrl);
        }, function (e) {
            if (e.status === 404) {
                $('.detail').hide();
                $scope.error = "Image not found.<br />" + $routeParams.id;
            } else {
                $scope.error = e.data;
            }
            $('#error-message').show();
        });
      });
           
  }]);

angular.module('imagesActions', [])
.controller('ImagesActionsController', ['$scope', '$rootScope', '$routeParams', 'Image', 'Container',
  'ConsulPrimarySwarm', 'ConsulSolerni', 'SettingsConsul', 'Settings', 'Messages', 
  function ($scope, $rootScope, $routeParams, Image, Container, ConsulPrimarySwarm, ConsulSolerni, SettingsConsul, Settings, Messages) {

    var batchImage = function (items, order, action, msg) {
      $('#loader-modal').modal({backdrop: 'static', keyboard: true, show: true});
      var counter = 0;
      var complete = function () {
        counter = counter - 1;
        if (counter === 0) {
          $('#loader-modal').modal('hide');
          $rootScope.$emit("CallUpdateImage", {});
        }
      };
      angular.forEach(items, function (c) {
        if (c.Checked) {
          if (order === Image.remove) {
            counter = counter + 1;
            ConsulSolerni.getMoocId({info: c.Name, key: 'containerId'}, function (d) {
              $scope.containerId = atob(d[0].Value);
              console.log($scope.containerId);
              Container.remove({id: $scope.containerId, node: $scope.swarmUrl }, function (d) {
                order({id: c.Id, node: $scope.swarmUrl}, function (d) {
                  if (d[0] === '4'){ 
                    var array = $.map(d, function(value, index) {
                      return [value];
                    });
                    var error = "";
                    for (var i = 0; i < array.length - 15; i++) {
                      error += array[i];
                    }
                    Messages.error("Failure image " + msg, error);
                  } else {
                    Messages.send("Image " + msg, c.Id);
                  }
                  var index = $scope.images.indexOf(c);
                  complete();
                }, function (e) {
                  Messages.error("Failure image " + msg, e.data);
                  complete();
                });
              }, function (e) {
                Messages.error("Failure image " + msg, e.data);
                complete();
              });
            }, function (e) {
              Messages.error("Failure image " + msg, e.data);
              complete();
            });
          }
        }
      });
      if (counter === 0) {
        $('#loader-modal').modal('hide');
      }
    };

    $scope.removeImage = function () {
      console.log($scope.images);
      batchImage($scope.images, Image.remove, '', "Removed");
    };
}]);
angular.module('loader', [])
.controller('LoaderController', ['$scope',
function ($scope) {
  $scope.template = 'app/components/loader/loader.html';
}]);

angular.module('masthead', [])
.controller('MastheadController', ['$scope', 'Settings', 'Version', 'ConsulPrimarySwarm', '$uibModal',
  function ($scope, Settings, Version, ConsulPrimarySwarm, $uibModal) {
    $scope.template = 'app/components/masthead/masthead.html';
    $scope.showNetworksVolumes = false;
    $scope.dashOn = false;
    $scope.hostOn = false;
    $scope.animationsEnabled = true;
    $scope.endpoint = Settings.endpoint;
    $scope.uiVersion = Settings.uiVersion;
    $scope.docker = {};

    if ( window.location.hash.indexOf('/hosts/') !== -1 ) {
      $scope.hostOn = true;
    } else {
      $scope.dashOn = true;
    }
    
    $scope.updateMasthead = function(page) {
      var containerWrapperName="#navbar_000";
      var totalDashElem=5+1;
      var currentContainer=page;
      for (var i = 1; i < totalDashElem; i++ ) {
          if( i !== currentContainer ){
              $(containerWrapperName+i).removeClass('active');
          }
      }
      $(containerWrapperName+currentContainer).addClass('active');
    };

    ConsulPrimarySwarm.get({}, function (d){
      var url = atob(d[0].Value); 
      Version.get({node: url}, function (d) {
        $scope.docker = d;
      });
    });

    $scope.open = function () {
      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
        templateUrl: 'app/components/about/about.html',
        controller: 'MastheadController'
      });
    };

    $scope.cancel = function () {
      modalInstance.dismiss('cancel');
    };

    $scope.refresh = function() {
      location.reload();
    };
  }
]);

angular.module('pullImage', [])
.controller('PullImageController', ['$scope', '$rootScope', '$routeParams', '$log', 'Messages', 'Image', 'Swarm', 'Container',
'ConsulPrimarySwarm', 'ConsulSolerni', 'errorMsgFilter', 'Repositories',
function ($scope, $rootScope, $routeParams, $log, Messages, Image, Swarm, Container, ConsulPrimarySwarm, ConsulSolerni, errorMsgFilter, Repositories) {
  $scope.template = 'app/components/pullImage/pullImage.html';
  $scope.searchMoocsResult = false;
  $scope.moocSelected = false;
  $scope.moocsResult = [];

  if ($routeParams.from){
    $scope.fromNode = false;
    $scope.nodeSelected = true;
  }

  $scope.init = function () {
    $scope.searchResult = false;
    $scope.searchTagResult = false;
    $scope.searchTagSelected = false;
    $scope.moocSelected = false;
    $scope.config = {
      selectedImage: '',
      searchImage: '',
      image: '',
      tag: '',
      node: ''
    };
  };

  $scope.create = function (configContainer) {
    var config = angular.copy(configContainer);
    Container.create(config, function (d) {
        Messages.send('Container Created', d.Id);
        ConsulSolerni.addImage({info: config.name, key: 'containerId'}, d.Id);
        $('#loader-modal').modal('hide');
    }, function (e) {
      failedRequestHandler(e, Messages);
      $('#loader-modal').modal('hide');
    });
  };

  $scope.init();

  function failedRequestHandler(e, Messages) {
      Messages.error('Error', errorMsgFilter(e));
  }

  $scope.getRepositoriesMoocs = function() {
    Repositories.query({action: '_catalog'}, function (d) {
      for (var i = 0; i < d.repositories.length; i++) {
        if (d.repositories[i].indexOf('mooc') !== -1) {
            $scope.moocsResult[i] = d.repositories[i];    
        } else {
          d.repositories.splice(i, 1);
          i--;
        }
      }
      console.log($scope.moocsResult);
      $scope.searchMoocsResult = true;
    }, function (e) {
    });
  };

  $scope.getRepositoriesMoocs();

  $scope.selectedMooc = function () {
    $scope.moocSelected = true;
  };

  $scope.updateConsulImage = function (config, imageShort) {
    ConsulSolerni.addImage({info: imageShort, key: 'fullname'}, config.image);
    Container.get({node: $scope.swarmUrl, id: imageShort}, function (d) {
      if (!d.Id) {
        var configContainer = {
          swarmHost: $scope.swarmUrl,
          Hostename: 'docker-raspbian',
          Image: config.image,
          name: imageShort,
          HostConfig: {
            PortBindings: [],
            ExtraHosts: ['raspberry.solerni:127.0.0.1']
          }
        };
        $scope.addEntry(configContainer.HostConfig.PortBindings, {ip: '', extPort: '80', intPort: '80'});
        $scope.addEntry(configContainer.HostConfig.PortBindings, {ip: '', extPort: '2222', intPort: '22'});
        var ExposedPorts = {};
        var PortBindings = {};
        configContainer.HostConfig.PortBindings.forEach(function (portBinding) {
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
        }
        });
        configContainer.HostConfig.PortBindings = PortBindings;
        $scope.create(configContainer);
      } else {
        ConsulSolerni.addImage({info: imageShort, key: 'containerId'}, d.Id);
        $('#loader-modal').modal('hide');
      }
    });
  };

  $scope.addEntry = function (array, entry) {
    array.push(entry);
  };

  $scope.pull = function () {
      $('#error-message').hide();
      var config = angular.copy($scope.config);

      config.node = $scope.swarmUrl;
      config.image = 'repository.inrelosv2.com/' + config.image.replace(/[\s]/g, '');
      imageShort = config.image.split('/')[2];

      var imageName = (config.registry ? config.registry + '/' : '' ) +
        (config.repo ? config.repo + '/' : '') +
        (config.image) +
        (config.tag ? ':' + config.tag : '');

      $('#pull-modal').modal('hide');
      $('#loader-modal').modal({backdrop: 'static', keyboard: true, show: true});
      Messages.send("Pull image started", imageShort);
      Image.create(config, function (data) {
        if (data.constructor === Array) {
          var f = data.length > 0 && data[data.length - 1].hasOwnProperty('error');
          //check for error
          if (f) {
            var d = data[data.length - 1];
            $scope.error = "Cannot pull image " + imageName + " Reason: " + d.error;
            $('#loader-modal').modal('hide');
            $('#pull-modal').modal('show');
            $('#error-message').show();
          } else {
            setTimeout(function(){
              $rootScope.$emit("CallUpdateImage", {});
              Messages.send("Image Added", imageShort);
              $scope.updateConsulImage(config, imageShort);
              $scope.init();
            }, 1000);  
          }
        } else {
          Messages.send("Image Added", imageShort);
          $scope.updateConsulImage(config, imageShort);
          $scope.init();
        }
      }, function (e) {
        $scope.error = "Cannot pull image " + imageName + " Reason: " + e.data;
        $('#loader-modal').modal('hide');
        $('#pull-modal').modal('show');
        $('#error-message').show();
      });
  };
}]);

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
angular.module('wrapperDashboard', [])
.controller('WrapperDashboardController', ['$scope',
  function ($scope) {    
    $scope.template = 'app/components/wrapperDashboard/wrapperDashboard.html';

    $scope.wrapperDash = function() {
        $('#wrapper').toggleClass('active');
    };

    $scope.updateDash = function(page) {
      var containerWrapperName="#wrapper-dash_000";
      var totalDashElem=5+1;
      var currentContainer=page;
      for (var i = 1; i < totalDashElem; i++ ) {
          if( i !== currentContainer ){
              $(containerWrapperName+i).removeClass('active');
          }
      }
      $(containerWrapperName+currentContainer).addClass('active');
    };
    
    $scope.$on('$includeContentLoaded', function(event) {
      $scope.updateDash($scope.dashboard);
    });

}]);
angular.module('wrapperHosts', [])
.controller('WrapperHostsController', ['$scope',
  function ($scope) {    
    $scope.template = 'app/components/wrapperHosts/wrapperHosts.html';

    $scope.wrapperDash = function() {
        $('#wrapper').toggleClass('active');
    };

    $scope.updateHosts = function(page) {
      var containerWrapperName="#wrapper-hosts_000";
      var totalDashElem=5+1;
      var currentContainer=page;
      for (var i = 1; i < totalDashElem; i++ ) {
          if( i !== currentContainer ){
              $(containerWrapperName+i).removeClass('active');
          }
      }
      $(containerWrapperName+currentContainer).addClass('active');
    };
    
    $scope.$on('$includeContentLoaded', function(event) {
      $scope.updateHosts($scope.dashboard);
    });

}]);
angular.module('swarmui.filters', [])
.filter('truncate', function () {
  'use strict';
  return function (text, length, end) {
    if (isNaN(length)) {
      length = 10;
    }

    if (end === undefined) {
      end = '...';
    }

    if (text.length <= length || text.length - end.length <= length) {
      return text;
    }
    else {
      return String(text).substring(0, length - end.length) + end;
    }
  };
})
.filter('truncateFirstsCaracts', function () {
  'use strict';
  return function (text, length) {
    if (isNaN(length)) {
      length = 1;
    }
    return String(text).substring(length);
  };
})
.filter('splitmoocname', function() {
  return function(input) {
    return input.split('/')[2];
  };
})
.filter('containername', function () {
  'use strict';
  return function (container) {
    var name = container.Names[0];
    return name.substring(1, name.length);
  };
})
.filter('nodename', function () {
  'use strict';
  return function (Node) {
    var name = Node;
    return name.substring(1, name.length);
  };
})
.filter('nodeurl', function () {
  'use strict';
  return function (Node) {
    return Node[1];
  };
})
.filter('statusbarTask', function () {
  'use strict';
  return function (text) {
    switch(text){
      case 'success':
          return 'success';
      case 'starting':
          return 'striped active';
      case 'failed':
          return 'danger';
      case 'canceled':
          return 'warning';
      case 'waiting':
          return 'warning';
    }
  };
})
.filter('statusRunning', function () {
  'use strict';
  return function (text) {
    if (text === 'created' || text === 'Created') {
      return '';
    } 
    if ( text.indexOf('Paused') !== -1 || text === 'paused' ) {
      return '(Paused)';
    }
    if ( text.indexOf('Exit') !== -1 && text !== 'Exit 0' || text.indexOf('exited') !== -1 ) {
      return '(Stopped)';
    }
    return '(Running)';
  };
})
.filter('statusBadge', function () {
  'use strict';
  return function (text) {
    if (text === 'created' || text === 'Created') {
      return 'default';
    } 
    if (text === 'Ghost') {
      return 'important';
    } 
    if ( text.indexOf('Paused') !== -1 || text === 'paused' ) {
      return 'primary';
    }
    if ( text.indexOf('Exit') !== -1 && text !== 'Exit 0' || text.indexOf('exited') !== -1 ) {
      return 'warning';
    }
    return 'success';
  };
})
.filter('statusControle', function () {
  'use strict';
  return function (text) {
    if (text === 'created') {
      return 'Created';
    } 
    return text;
  };
})
.filter('statusInverseBadge', function () {
  'use strict';
  return function (text) {
    if (text === 'created' || text === 'Created') {
      return 'success';
    }
    if (text === 'Ghost') {
      return 'important';
    } 
    if (text.indexOf('Exit') !== -1 && text !== 'Exit 0') {
      return 'success';
    }
    return 'danger';
  };
})
.filter('statusIconsStartStop', function () {
  'use strict';
  return function (text) {
    if (text === 'created' || text === 'Created') {
      return 'glyphicon glyphicon-play';
    }
    if (text === 'Ghost') {
      return 'glyphicon glyphicon-off';
    } 
    if (text.indexOf('Exit') !== -1 && text !== 'Exit 0') {
      return 'glyphicon glyphicon-play';
    }
    return 'glyphicon glyphicon-off';
  };
})
.filter('statusButtonActive', function () {
  'use strict';
  return function (text) {
    if (text === 'unknown') {
      return 'disabled';
    } 
    return '';
  };
})
.filter('statusbadgeNode', function () {
  'use strict';
  return function (text) {
    if (text === 'Unknown') {
      return 'important';
    } 
    return 'success';
  };
})
.filter('statusbadgeOnAlarm', function () {
  'use strict';
  return function (text) {
    if (text === '1') {
      return 'btn-default';
    } 
    return 'btn-success active';
  };
})
.filter('statusbadgeOffAlarm', function () {
  'use strict';
  return function (text) {
    if (text === '1') {
      return 'btn-danger active';
    } 
    return 'btn-default';
  };
})
.filter('getstatetext', function () {
  'use strict';
  return function (state) {
    if (state === undefined) {
      return '';
    }
    if (state.Ghost && state.Running) {
      return 'Ghost';
    }
    if (state.Running && state.Paused) {
      return 'Running (Paused)';
    }
    if (state.Running) {
      return 'Running';
    }
    return 'Stopped';
  };
})
.filter('getstatelabel', function () {
  'use strict';
  return function (state) {
    if (state === undefined) {
      return 'label-default';
    }
    if (state.Ghost && state.Running) {
      return 'label-important';
    }
    if (state.Paused) {
      return 'label-info';
    }
    if (state.Running) {
      return 'label-success';
    }
    return 'label-warning';
  };
})
.filter('humansize', function () {
  'use strict';
  return function (bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
      return 'n/a';
    }
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    var value = bytes / Math.pow(1024, i);
    var decimalPlaces = (i < 1) ? 0 : (i - 1);
    return value.toFixed(decimalPlaces) + ' ' + sizes[[i]];
  };
})
.filter('repotag', function () {
  'use strict';
  return function (image) {
    if (image.RepoTags && image.RepoTags.length > 0) {
      var tag = image.RepoTags[0];
      if (tag === '<none>:<none>') {
        tag = '';
      }
      return tag;
    }
    return '';
  };
})
.filter('getdate', function () {
  'use strict';
  return function (data) {
    if (data) {
      var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      var language = navigator.browserLanguage;
      //Multiply by 1000 for the unix format
      var date = new Date(data);
      return date.toLocaleDateString(language, options);
    } else {
      return;
    }
  };
})
.filter('getdate1000', function () {
  'use strict';
  return function (data) {
    var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    var language = navigator.browserLanguage;
    //Multiply by 1000 for the unix format
    var date = new Date(data*1000);
    return date.toLocaleDateString(language, options);
  };
})
.filter('errorMsg', function () {
  return function (object) {
    var idx = 0;
    var msg = '';
    while (object[idx] && typeof(object[idx]) === 'string') {
      msg += object[idx];
      idx++;
    }
    return msg;
  };
});

angular.module('swarmui.services', ['ngResource'])
  .factory('ConsulPrimarySwarm', ['$resource', 'SettingsConsul', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-1-containers
    return $resource(Settings.url + '/v1/kv/docker/swarm/leader', {
        node: '@name'
    }, {
        get: {method: 'GET', isArray: true}
    });
  }])
  .factory('ConsulSolerni', ['$resource', 'SettingsConsul', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-1-containers
    return $resource(Settings.url + '/v1/kv/docker/swarm/solerni/:dir/:info/:key', {
        node: '@name'
    }, {
        getActiveMooc: {method: 'GET', params: {dir: 'active', info: 'mooc'}, isArray: true},
        updateActiveMooc: {method: 'PUT', params: {dir: 'active', info: 'mooc'}},
        getMoocId: {method: 'GET', params: {dir: 'moocs'}, isArray: true},
        addImage: {method: 'PUT', params: {dir: 'moocs'}}
    });
  }])
  .factory('ConsulService', ['$resource', 'SettingsConsul', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-1-containers
    return $resource(Settings.url + '/v1/catalog/:path', {
        node: '@name'
    }, {
        getService: {method: 'GET', params: {path: 'service'}, isArray: true},
        addService: {method: 'PUT', params: {path: 'register'}},
        removeService: {method: 'PUT', params: {path: 'deregister'}}
    });
  }])
  .factory('Swarm', ['$resource', 'Settings', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-1-containers
    return $resource(Settings.url + '/:node/:action', {
      name: '@name'
    }, {
      info: {method: 'GET', params: {action: 'info'}}
    });
  }])
  .factory('Container', ['$resource', 'Settings', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-1-containers
    return $resource(Settings.url + '/:node/containers/:id/:action', {
      name: '@name'
    }, {
      query: {method: 'GET', params: {node: '@node', all: 0, action: 'json'}, isArray: true},
      get: {method: 'GET', params: {node: '@node', action: 'json'}},
      actionCont: {method: 'POST', params: {id: '@id', node: '@node', t: 5, action: '@action'}},
      changes: {method: 'GET', params: {node: '@node', action: 'changes'}, isArray: true},
      create: {method: 'POST', params: {node: '@swarmHost', action: 'create'}},
      remove: {method: 'DELETE', params: {id: '@id', node: '@node', v: 0}},
      rename: {method: 'POST', params: {id: '@id', node: '@node', action: 'rename'}, isArray: false},
      top: {method: 'GET', params: {id: '@id', node: '@node', ps_args: '@ps_args', action: 'top'}},
      stats: {method: 'GET', params: {id: '@id', node: '@node', stream: false, action: 'stats'}, timeout: 5000}
    });
  }])
  .factory('ContainerCommit', ['$resource', '$http', 'Settings', function ContainerCommitFactory($resource, $http, Settings) {
    'use strict';
    // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#create-a-new-image-from-a-container-s-changes
    return {
      commit: function (params, callback) {
        $http({
          method: 'POST',
          url: Settings.url + '/:node/commit',
          params: {
            'container': params.id,
            'repo': params.repo
          }
        }).success(callback).error(function (data, status, headers, config) {
          console.log(error, data);
        });
      }
    };
  }])
  .factory('ContainerLogs', ['$resource', '$http', 'Settings', function ContainerLogsFactory($resource, $http, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#get-container-logs
      return {
          get: function (id, node, params, callback) {
              $http({
                  method: 'GET',
                  url: Settings.url + '/' + node + '/containers/' + id + '/logs',
                  params: {
                      'stdout': params.stdout || 0,
                      'stderr': params.stderr || 0,
                      'timestamps': params.timestamps || 0,
                      'tail': params.tail || 'all'
                  }
              }).success(callback).error(function (data, status, headers, config) {
                  console.log(error, data);
              });
          }
      };
  }])
  .factory('Image', ['$resource', 'Settings', function ImageFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-2-images
      return $resource(Settings.url + '/:node/images/:id/:action', {}, {
          query: {method: 'GET', params: {all: 0, action: 'json'}, isArray: true},
          get: {method: 'GET', params: {action: 'json'}},
          search: {method: 'GET', params: {node: '@node', action: 'search', term: '@term'}, isArray: true},
          history: {method: 'GET', params: {action: 'history'}, isArray: true},
          create: {
              method: 'POST', isArray: true, transformResponse: [function f(data) {
                  var str = data.replace(/\n/g, " ").replace(/\}\W*\{/g, "}, {");
                  return angular.fromJson("[" + str + "]");
              }],
              params: {node: '@node', action: 'create', fromImage: '@image', repo: '@repo', tag: '@tag', registry: '@registry'}
          },
          insert: {method: 'POST', params: {id: '@id', action: 'insert'}},
          push: {method: 'POST', params: {id: '@id', action: 'push'}},
          tag: {method: 'POST', params: {id: '@id', node: '@node', action: 'tag', force: 0, repo: '@repo', tag: '@tag'}},
          remove: {method: 'DELETE', params: {id: '@id', node: '@node'}, isArray: true}
      });
  }])
  .factory('Repositories', ['$resource', 'SettingsRepo', function ImageFactory($resource, SettingsRepo) {
      'use strict';
      return $resource(SettingsRepo.url + '/repository.inrelosv2.com/v2/:action', {}, {
        get: {method: 'GET', params: {image: '@image'}},
        query: {method: 'GET', params: {action: '@action'}}
      });
  }])
  .factory('Version', ['$resource', 'Settings', function VersionFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#show-the-docker-version-information
      return $resource(Settings.url + '/:node/version', {}, {
          get: {method: 'GET', params: {node: '@node'}}
      });
  }])
  .factory('Auth', ['$resource', 'Settings', function AuthFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#check-auth-configuration
      return $resource(Settings.url + '/auth', {}, {
          get: {method: 'GET'},
          update: {method: 'POST'}
      });
  }])
  .factory('Info', ['$resource', 'Settings', function InfoFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#display-system-wide-information
      return $resource(Settings.url + '/info', {}, {
          get: {method: 'GET'}
      });
  }])
  .factory('Network', ['$resource', 'Settings', function NetworkFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-5-networks
      return $resource(Settings.url + '/networks/:id/:action', {id: '@id'}, {
          query: {method: 'GET', isArray: true},
          get: {method: 'GET'},
          create: {method: 'POST', params: {action: 'create'}},
          remove: {method: 'DELETE'},
          connect: {method: 'POST', params: {action: 'connect'}},
          disconnect: {method: 'POST', params: {action: 'disconnect'}}
      });
  }])
  .factory('Volume', ['$resource', 'Settings', function VolumeFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_v1.20/#2-5-networks
      return $resource(Settings.url + '/volumes/:name/:action', {name: '@name'}, {
          query: {method: 'GET'},
          get: {method: 'GET'},
          create: {method: 'POST', params: {action: 'create'}},
          remove: {method: 'DELETE'}
      });
  }])
  .factory('SettingsConsul', ['CONSUL_ENDPOINT', function SettingsFactory(CONSUL_ENDPOINT) {
      'use strict';
      var url = CONSUL_ENDPOINT;
      var firstLoad = (localStorage.getItem('firstLoad') || 'true') === 'true';
      return {
          displayAll: false,
          endpoint: CONSUL_ENDPOINT,
          url: url,
          firstLoad: firstLoad
      };
  }])
  .factory('SettingsRepo', ['DOCKERREPO_ENDPOINT', function SettingsFactory(DOCKERREPO_ENDPOINT) {
    'use strict';
    var url = DOCKERREPO_ENDPOINT;
    var firstLoad = (localStorage.getItem('firstLoad') || 'true') === 'true';
    return {
        displayAll: false,
        endpoint: DOCKERREPO_ENDPOINT,
        url: url,
        firstLoad: firstLoad
    };
  }])
  .factory('Settings', ['DOCKER_ENDPOINT', 'DOCKER_PORT', 'UI_VERSION', function SettingsFactory(DOCKER_ENDPOINT, DOCKER_PORT, UI_VERSION) {
      'use strict';
      var url = DOCKER_ENDPOINT;
      if (DOCKER_PORT) {
          url = url + DOCKER_PORT + '\\' + DOCKER_PORT;
      }
      var firstLoad = (localStorage.getItem('firstLoad') || 'true') === 'true';
      return {
          displayAll: false,
          endpoint: DOCKER_ENDPOINT,
          uiVersion: UI_VERSION,
          url: url,
          firstLoad: firstLoad
      };
  }])
  .factory('ViewSpinner', function ViewSpinnerFactory() {
      'use strict';
      var spinner = new Spinner();
      var target = document.getElementById('view');

      return {
          spin: function () {
              spinner.spin(target);
          },
          stop: function () {
              spinner.stop();
          }
      };
  })
  .factory('Messages', ['$rootScope', function MessagesFactory($rootScope) {
      'use strict';
      return {
          send: function (title, text) {
              $.gritter.add({
                  title: title,
                  text: text,
                  time: 5000,
                  before_open: function () {
                      if ($('.gritter-item-wrapper').length === 3) {
                          return false;
                      }
                  }
              });
          },
          error: function (title, text) {
              $.gritter.add({
                  title: title,
                  text: text,
                  time: 10000,
                  before_open: function () {
                      if ($('.gritter-item-wrapper').length === 4) {
                          return false;
                      }
                  }
              });
          }
      };
  }])
  .factory('LineChart', ['Settings', function LineChartFactory(Settings) {
      'use strict';
      return {
          build: function (id, data, getkey) {
              var chart = new Chart($(id).get(0).getContext("2d"));
              var map = {};

              for (var i = 0; i < data.length; i++) {
                  var c = data[i];
                  var key = getkey(c);

                  var count = map[key];
                  if (count === undefined) {
                      count = 0;
                  }
                  count += 1;
                  map[key] = count;
              }

              var labels = [];
              data = [];
              var keys = Object.keys(map);
              var max = 1;

              for (i = keys.length - 1; i > -1; i--) {
                  var k = keys[i];
                  labels.push(k);
                  data.push(map[k]);
                  if (map[k] > max) {
                      max = map[k];
                  }
              }
              var steps = Math.min(max, 10);
              var dataset = {
                  fillColor: "rgba(151,187,205,0.5)",
                  strokeColor: "rgba(151,187,205,1)",
                  pointColor: "rgba(151,187,205,1)",
                  pointStrokeColor: "#fff",
                  data: data
              };
              chart.Line({
                      labels: labels,
                      datasets: [dataset]
                  },
                  {
                      scaleStepWidth: Math.ceil(max / steps),
                      pointDotRadius: 1,
                      scaleIntegersOnly: true,
                      scaleOverride: true,
                      scaleSteps: steps
                  });
          }
      };
  }]);

function ImageViewModel(data) {
    this.Id = data.Id;
    this.Tag = data.Tag;
    this.Repository = data.Repository;
    this.Created = data.Created;
    this.Checked = false;
    this.RepoTags = data.RepoTags;
    this.VirtualSize = data.VirtualSize;
}

function ContainerViewModel(data) {
    this.Id = data.Id;
    this.Image = data.Image;
    this.Command = data.Command;
    this.Created = data.Created;
    this.SizeRw = data.SizeRw;
    this.Status = data.Status;
    this.Checked = false;
    this.Names = data.Names;
    this.VolumesFrom = data.VolumesFrom;
}

function SwarmViewModel(data) {
    this.nodename = data.nodename;
    this.version = data.version;
    this.health = data.health;
    this.url = data.url;
    this.Checked = false;
}
function SwarmHostViewModel(data) {
    this.nodename = data.nodename;
    this.version = data.version;
    this.health = data.health;
    this.url = data.url;
    this.contRunning = data.containersRunning;
    this.contStopped = data.containersStopped;
    this.contGhost = data.containersGhost;
}

function ContainersUpdateModel(data) {
    this.id = data.Id;
    this.image = data.Image;
    this.status = data.Status;
}

function ConsulTasksModel(data) {
    this.nodeName = data.nodeName;
    this.containerID = data.containerID;
    this.action = data.action;
    this.stat = data.stat;
    this.describe = data.describe;
    this.progress = data.progress;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.logs = data.logs;
}

angular.module('swarmui.templates', ['app/components/about/about.html', 'app/components/container/container.html', 'app/components/dashboard/dashboard.html', 'app/components/dashboardContainers/dashboardContainers.html', 'app/components/dashboardImages/dashboardImages.html', 'app/components/hostInformations/hostInformation.html', 'app/components/hosts/hosts.html', 'app/components/image/image.html', 'app/components/loader/loader.html', 'app/components/masthead/masthead.html', 'app/components/pullImage/pullImage.html', 'app/components/startContainer/startcontainer.html', 'app/components/wrapperDashboard/wrapperDashboard.html', 'app/components/wrapperHosts/wrapperHosts.html']);

angular.module("app/components/about/about.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/about/about.html",
    "\n" +
    "<div class=\"modal-content\">\n" +
    "  <div class=\"modal-header\">\n" +
    "    <h3> SwarmUI Information</h3>\n" +
    "  </div>\n" +
    "  <div class=\"modal-body\">\n" +
    "      <strong>API Endpoint: </strong>{{ endpoint }}<br/>\n" +
    "      <strong>API Version: </strong>{{ docker.ApiVersion }}<br/>\n" +
    "      <strong>Swarm version: </strong>{{ docker.Version }}<br/>\n" +
    "      <strong>UI version: </strong>{{ uiVersion }}<br/>\n" +
    "      <strong>Docker Git Commit: </strong>{{ docker.GitCommit }}<br/>\n" +
    "      <strong>Docker Go Version: </strong>{{ docker.GoVersion }}<br/>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "");
}]);

angular.module("app/components/container/container.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/container/container.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-if=\"dashOn\" ng-include=\"template\" ng-controller=\"WrapperDashboardController\"></div>\n" +
    "  <div ng-if=\"hostOn\" ng-include=\"template\" ng-controller=\"WrapperHostsController\"></div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"row\">\n" +
    "      <!-- Middle Container -->\n" +
    "      <div class=\"col-xs-12\">\n" +
    "        <h1 class=\"page-header\">Container information on server {{ container.Node }}</h1>\n" +
    "        <div class=\"panel panel-default\">\n" +
    "          <div class=\"panel-heading\">\n" +
    "            <div ng-if=\"!container.edit\">\n" +
    "              <h3 class=\"panel-title\">\n" +
    "                <span class=\"col-xs-11\" style=\"margin-top: 5px; font-size: 18px;\">{{ container.Name|truncateFirstsCaracts }}</span>\n" +
    "                <div class=\"btn-group\">\n" +
    "                  <button type=\"button\" class=\"btn btn-default dropdown-toggle\" style=\"margin: 0;\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\">\n" +
    "                    Action <span class=\"caret\"></span>\n" +
    "                  </button>\n" +
    "                  <ul class=\"dropdown-menu\">\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"container.edit = true;\">Rename container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li role=\"separator\" class=\"divider\"></li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"start()\"\n" +
    "                        ng-show=\"!container.State.Running\">Start\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"stop()\"\n" +
    "                        ng-show=\"container.State.Running && !container.State.Paused\">Stop\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"kill()\"\n" +
    "                        ng-show=\"container.State.Running && !container.State.Paused\">Kill\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"pause()\"\n" +
    "                        ng-show=\"container.State.Running && !container.State.Paused\">Pause\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"unpause()\"\n" +
    "                        ng-show=\"container.State.Running && container.State.Paused\">Unpause\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"restart()\"\n" +
    "                        ng-show=\"container.State.Running && !container.State.Stopped\">Restart\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"commit()\"\n" +
    "                        ng-show=\"container.State.Running && !container.State.Paused\">Commit\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li role=\"separator\" ng-show=\"!container.State.Running\" class=\"divider\"></li>\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"remove()\"\n" +
    "                        ng-show=\"!container.State.Running\">Remove Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                  </ul>\n" +
    "                </div>\n" +
    "              </h3>\n" +
    "            </div>\n" +
    "            <div ng-if=\"container.edit\">\n" +
    "              <h3 class=\"panel-title\">\n" +
    "                <input type=\"text\" class=\"input-container\" ng-model=\"container.newContainerName\">\n" +
    "                <button class=\"btn btn-success\"\n" +
    "                  ng-click=\"renameContainer()\">Save\n" +
    "                </button>\n" +
    "                <button class=\"btn btn-danger\"\n" +
    "                  ng-click=\"container.edit = false;\">&times;\n" +
    "                </button>\n" +
    "              </h3>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div class=\"panel-body\">\n" +
    "            <a href=\"/#{{ fromTo }}\"><- Return {{ returnTo }}</a><br/><br/>\n" +
    "            <div class='col-xs-9 well'>\n" +
    "              <h4>Global</h4>\n" +
    "              <b>Id : </b>{{ container.Id }}\n" +
    "              <br/>\n" +
    "              <b>Created : </b>{{ container.Created | date: 'medium' }}\n" +
    "              <h4>Network</h4>\n" +
    "              <b>IP : </b>{{ container.NetworkSettings.IPAddress }}\n" +
    "              <br/>\n" +
    "              <b>Gateway : </b>{{ container.NetworkSettings.Gateway }}\n" +
    "              <br/>\n" +
    "              <b>DNS : </b><span ng-repeat=\"dns in container.HostConfig.Dns\"> {{ dns }} </span>\n" +
    "              <br/>\n" +
    "              <br/>\n" +
    "            </div>\n" +
    "            <div class='col-xs-1'>\n" +
    "              <br/>\n" +
    "            </div>\n" +
    "            <div class='col-xs-2'>\n" +
    "              <center>\n" +
    "                <span class=\"label {{ container.State | getstatelabel }} status-container\">\n" +
    "                  {{ container.State | getstatetext }}\n" +
    "                </span>\n" +
    "              </center>\n" +
    "            </div>\n" +
    "            <div class=\"row\">\n" +
    "              <div class=\"col-xs-12 well\">\n" +
    "                <div class=\"col-xs-4\">\n" +
    "                  <div class=\"panel panel-default\">\n" +
    "                    <div class=\"panel-heading\">\n" +
    "                      <h3 class=\"panel-title\">\n" +
    "                        <b>CPU</b>\n" +
    "                      </h3>\n" +
    "                    </div>\n" +
    "                    <div class=\"panel-body\">\n" +
    "                      <div style=\"width: 98%;\">\n" +
    "                        <canvas id=\"cpu-stats-chart\" style=\"width: 95%;\"></canvas>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                  </div>\n" +
    "                </div>\n" +
    "                <div class=\"col-xs-4\">\n" +
    "                  <div class=\"panel panel-default\">\n" +
    "                    <div class=\"panel-heading\">\n" +
    "                      <h3 class=\"panel-title\">\n" +
    "                        <b>Memory</b>\n" +
    "                      </h3>\n" +
    "                    </div>\n" +
    "                    <div class=\"panel-body\">\n" +
    "                      <div style=\"width: 98%;\">\n" +
    "                        <canvas id=\"memory-stats-chart\"></canvas>\n" +
    "                      </div>\n" +
    "                      <div>\n" +
    "                        <table class=\"table\">\n" +
    "                            <tr>\n" +
    "                                <td>Max usage</td>\n" +
    "                                <td>{{ data.memory_stats.max_usage | humansize }}</td>\n" +
    "                            </tr>\n" +
    "                            <tr>\n" +
    "                                <td>Limit</td>\n" +
    "                                <td>{{ data.memory_stats.limit | humansize }}</td>\n" +
    "                            </tr>\n" +
    "                            <tr>\n" +
    "                                <td>Fail count</td>\n" +
    "                                <td>{{ data.memory_stats.failcnt }}</td>\n" +
    "                            </tr>\n" +
    "                        </table>\n" +
    "                        <uib-accordion>\n" +
    "                            <uib-accordion-group heading=\"Other stats\">\n" +
    "                                <table class=\"table\">\n" +
    "                                    <tr ng-repeat=\"(key, value) in data.memory_stats.stats\">\n" +
    "                                        <td>{{ key }}</td>\n" +
    "                                        <td>{{ value }}</td>\n" +
    "                                    </tr>\n" +
    "                                </table>\n" +
    "                            </uib-accordion-group>\n" +
    "                        </uib-accordion>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                  </div>\n" +
    "                </div>\n" +
    "                <div class=\"col-xs-4\">\n" +
    "                  <div class=\"panel panel-default\">\n" +
    "                    <div class=\"panel-heading\">\n" +
    "                      <h3 class=\"panel-title\">\n" +
    "                        <b>Network {{ networkName}}</b>\n" +
    "                      </h3>\n" +
    "                    </div>\n" +
    "                    <div class=\"panel-body\">\n" +
    "                      <div style=\"width: 98%;\">\n" +
    "                        <canvas id=\"network-stats-chart\"></canvas>\n" +
    "                      </div>\n" +
    "                      <div>\n" +
    "                          <div id=\"network-legend\" style=\"margin-bottom: 20px;\"></div>\n" +
    "                          <uib-accordion>\n" +
    "                              <uib-accordion-group heading=\"Other stats\">\n" +
    "                                  <table class=\"table\">\n" +
    "                                      <tr ng-repeat=\"(key, value) in data.network\">\n" +
    "                                          <td>{{ key }}</td>\n" +
    "                                          <td>{{ value }}</td>\n" +
    "                                      </tr>\n" +
    "                                  </table>\n" +
    "                              </uib-accordion-group>\n" +
    "                          </uib-accordion>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                  </div>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <uib-tabset active=\"active\">\n" +
    "            <uib-tab index=\"0\" heading=\"Info\" ng-click=\"destroyInterval()\">\n" +
    "            <!-- Tabs 1 container info -->\n" +
    "              <table class=\"table table-striped no-margin-bottom\">\n" +
    "                <tbody>\n" +
    "                  <tr>\n" +
    "                    <td class=\"col-xs-2\">Path:</td>\n" +
    "                    <td class=\"col-xs-10\">{{ container.Path }}</td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Args:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <ul class=\"deco-none\">\n" +
    "                          <li>{{ container.Args.join(' ') || 'None' }}</li>\n" +
    "                        </ul>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Exposed Ports:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <ul class=\"deco-none\">\n" +
    "                          <li ng-repeat=\"(k, v) in container.Config.ExposedPorts\">{{ k }}</li>\n" +
    "                        </ul>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Environment:</td>\n" +
    "                    <td>\n" +
    "                      <ul class=\"deco-none\">\n" +
    "                        <li ng-repeat=\"k in container.Config.Env\"><b>{{ k }}</b></li>\n" +
    "                      </ul>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Labels:</td>\n" +
    "                    <td>\n" +
    "                      <table role=\"table\" class=\"table\">\n" +
    "                        <tr>\n" +
    "                          <th>Key</th>\n" +
    "                          <th>Value</th>\n" +
    "                        </tr>\n" +
    "                        <tr ng-repeat=\"(k, v) in container.Config.Labels\">\n" +
    "                          <td>{{ k }}</td>\n" +
    "                          <td>{{ v }}</td>\n" +
    "                        </tr>\n" +
    "                      </table>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "\n" +
    "                  <tr>\n" +
    "                    <td>Publish All:</td>\n" +
    "                      <td>{{ container.HostConfig.PublishAllPorts }}</td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Ports:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <ul class=\"deco-none\">\n" +
    "                          <li ng-repeat=\"(containerport, hostports) in container.NetworkSettings.Ports\">\n" +
    "                            {{ containerport }} => <span class=\"label label-default\" ng-repeat=\"(k,v) in hostports\">{{ v.HostIp }}:{{ v.HostPort }}</span>\n" +
    "                          </li>\n" +
    "                        </ul>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Cmd:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <ul class=\"deco-none\">\n" +
    "                          <li>{{ container.Config.Cmd }}</li>\n" +
    "                        </ul>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Entrypoint:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <ul class=\"deco-none\">\n" +
    "                          <li>{{ container.Config.Entrypoint.join(' ') || 'None' }}</li>\n" +
    "                        </ul>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Volumes:</td>\n" +
    "                    <td>{{ container.Volumes }}</td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>SysInitpath:</td>\n" +
    "                    <td>{{ container.SysInitPath }}</td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Image:</td>\n" +
    "                    <td><a href=\"#/{{ container.From }}/{{ container.Node }}/containers/{{ container.Id }}/image/{{ container.Image }}/\">{{ container.Config.Image }}</a></td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>State:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <accordion close-others=\"true\">\n" +
    "                          <accordion-group heading=\"{{ container.State|getstatetext }}\">\n" +
    "                            <ul class=\"deco-none\">\n" +
    "                              <li ng-repeat=\"(key, val) in container.State\">{{key}} : {{ val }}</li>\n" +
    "                            </ul>\n" +
    "                          </accordion-group>\n" +
    "                        </accordion>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                  <tr>\n" +
    "                    <td>Changes:</td>\n" +
    "                    <td>\n" +
    "                      <div class=\"well well-large no-margin-bottom\">\n" +
    "                        <ul class=\"deco-none\">\n" +
    "                          <li ng-repeat=\"change in changes | filter:hasContent\">\n" +
    "                            <strong>{{ change.Path }}</strong> {{ change.Kind }}\n" +
    "                          </li>\n" +
    "                        </ul>\n" +
    "                      </div>\n" +
    "                    </td>\n" +
    "                  </tr>\n" +
    "                </tbody>\n" +
    "              </table>\n" +
    "            <!-- End Tabs 1 container info -->\n" +
    "            </uib-tab>\n" +
    "            <uib-tab index=\"1\" heading=\"Logs\" ng-click=\"getLogs()\">\n" +
    "              <div class=\"row logs\">\n" +
    "                  <div class=\"col-xs-12\">\n" +
    "                    <div class=\"pull-right col-xs-6\">\n" +
    "                      <div class=\"col-xs-6\">\n" +
    "                        <a class=\"btn btn-primary\" ng-click=\"toggleTail()\" role=\"button\">Reload logs</a>\n" +
    "                        <input id=\"tailLines\" type=\"number\" ng-style=\"{width: '45px'}\"\n" +
    "                          ng-model=\"tailLines\" ng-keypress=\"($event.which === 13)? toggleTail() : 0\"/>\n" +
    "                        <label for=\"tailLines\">lines</label>\n" +
    "                      </div>\n" +
    "                      <div class=\"col-xs-4\">\n" +
    "                        <input id=\"timestampToggle\" type=\"checkbox\" ng-model=\"showTimestamps\"\n" +
    "                          ng-change=\"toggleTimestamps()\"/> <label for=\"timestampToggle\">Timestamps</label>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                  </div>\n" +
    "                  <div class=\"col-xs-12\">\n" +
    "                    <div class=\"panel panel-default\">\n" +
    "                      <div class=\"panel-heading\">\n" +
    "                        <h3 id=\"stdout\" class=\"panel-title\">STDOUT</h3>\n" +
    "                      </div>\n" +
    "                      <div class=\"panel-body\">\n" +
    "                        <pre id=\"stdoutLog\" class=\"pre-scrollable pre-x-scrollable\">{{stdout}}</pre>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                  </div>\n" +
    "                  <div class=\"col-xs-12\">\n" +
    "                    <div class=\"panel panel-default\">\n" +
    "                      <div class=\"panel-heading\">\n" +
    "                        <h3 id=\"stderr\" class=\"panel-title\">STDERR</h3>\n" +
    "                      </div>\n" +
    "                      <div class=\"panel-body\">\n" +
    "                        <pre id=\"stderrLog\" class=\"pre-scrollable pre-x-scrollable\">{{stderr}}</pre>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                  </div>\n" +
    "              </div>\n" +
    "            </uib-tab>\n" +
    "            <uib-tab index=\"2\" heading=\"Top\" ng-click=\"getTop()\">\n" +
    "              <div class=\"containerTop\">\n" +
    "                <div class=\"form-group col-xs-2\">\n" +
    "                    <input type=\"text\" class=\"form-control\" placeholder=\"[options] (aux)\" ng-model=\"ps_args\">\n" +
    "                </div>\n" +
    "                <button type=\"button\" class=\"btn btn-default\" ng-click=\"getTop()\">Submit</button>\n" +
    "\n" +
    "                <table class=\"table table-striped\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th ng-repeat=\"title in containerTop.Titles\">{{title}}</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"processInfos in containerTop.Processes\">\n" +
    "                        <td ng-repeat=\"processInfo in processInfos track by $index\">{{processInfo}}</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                </table>\n" +
    "              </div>\n" +
    "            </uib-tab>\n" +
    "          </uib-tabset>\n" +
    "        </div>\n" +
    "       <!-- Middle Container -->   \n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "</div>");
}]);

angular.module("app/components/dashboard/dashboard.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/dashboard/dashboard.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-include=\"template\" ng-controller=\"WrapperDashboardController\"></div>\n" +
    "  \n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"row\">\n" +
    "      <!-- Middle Container -->\n" +
    "      <div class=\"col-xs-12\" id=\"body-middle-container\">\n" +
    "\n" +
    "        <h1 class=\"page-header\">Dashboard</h1>\n" +
    "        <div class=\"row \">\n" +
    "\n" +
    "          <div class=\"panel panel-default\">\n" +
    "            <div class=\"panel-heading\">\n" +
    "              <h3 class=\"panel-title\">Solerni Informations</h3>\n" +
    "            </div>\n" +
    "            <div class=\"panel-body placeholder-dash\">\n" +
    "              <div class=\"col-xs-6 col-md-4\">\n" +
    "                <h3>Solerni Status </h3>\n" +
    "                <canvas id=\"containers-chart\">\n" +
    "                  <p class=\"browserupgrade\">\n" +
    "                    You are using an <strong>outdated</strong> browser. Please \n" +
    "                    <a href=\"http://browsehappy.com/\">upgrade your browser</a> \n" +
    "                    to improve your experience.\n" +
    "                  </p>\n" +
    "                </canvas>\n" +
    "                <div id=\"containers-chart-legend\"></div>\n" +
    "              </div>\n" +
    "              <div class=\"col-xs-6 col-md-4\">\n" +
    "                <h3>Moocs</h3>\n" +
    "                <canvas id=\"images-chart\">\n" +
    "                  <p class=\"browserupgrade\">You are using an <strong>outdated</strong> browser. Please \n" +
    "                    <a href=\"http://browsehappy.com/\">upgrade your browser</a> to improve your experience.</p>\n" +
    "                </canvas>\n" +
    "                <div id=\"images-chart-legend\"></div>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "\n" +
    "      </div>\n" +
    "      <!-- Middle Container -->\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "</div>");
}]);

angular.module("app/components/dashboardContainers/dashboardContainers.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/dashboardContainers/dashboardContainers.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-include=\"template\" ng-controller=\"WrapperDashboardController\"></div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"row\">\n" +
    "      <!-- Middle Container -->\n" +
    "      <div class=\"col-xs-12\" id=\"body-middle-container\">\n" +
    "        <h1 class=\"page-header\">Solerni</h1>\n" +
    "        <div class=\"panel panel-default\">\n" +
    "          <div class=\"panel-heading\">\n" +
    "            <h3 class=\"panel-title\">\n" +
    "              <span class=\"col-xs-11\" style=\"margin-top: 5px; font-size: 18px;\">Solerni informations</span>\n" +
    "              <div class=\"btn-group\">\n" +
    "                <button type=\"button\" class=\"btn btn-default dropdown-toggle\" style=\"margin: 0;\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\">\n" +
    "                  Action <span class=\"caret\"></span>\n" +
    "                </button>\n" +
    "                <ul class=\"dropdown-menu\">\n" +
    "                  <li>\n" +
    "                    <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-click=\"startAction()\">Start\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-click=\"stopAction()\">Stop\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-click=\"killAction()\">Kill\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-click=\"pauseAction()\">Pause\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-click=\"unpauseAction()\">Unpause\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-click=\"restartAction()\">Restart\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                </ul>\n" +
    "              </div>\n" +
    "            </h3>\n" +
    "          </div>\n" +
    "          <div ng-include=\"template\" ng-controller=\"StartContainerController\"></div>\n" +
    "          <!-- Table -->\n" +
    "          <table class=\"table table-striped\">\n" +
    "            <tr>\n" +
    "              <th><input type=\"checkbox\" ng-model=\"toggle\" ng-change=\"toggleSelectAll()\"/></th>\n" +
    "              <th>\n" +
    "                  Name\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                  Container ID\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                  Image\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                  Container Status\n" +
    "              </th>\n" +
    "              <th>Actions</th>\n" +
    "            </tr>\n" +
    "            <tr ng-repeat=\"container in containers | filter:search:strict | orderBy:predicate:reverse\">\n" +
    "              <td><input type=\"checkbox\" ng-model=\"container.Checked\" /></td>\n" +
    "              <td>\n" +
    "                {{ container.ContainerName }}\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <a href=\"#/dashboard/containers/{{ container.Id }}\">\n" +
    "                  {{ container.Id|truncate:15 }}\n" +
    "                </a>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                {{ container.Image | splitmoocname }}\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <span class=\"label label-{{ container.Status|statusBadge }}\" style=\"font-size: 95%\">\n" +
    "                  {{ container.Status|statusControle }}\n" +
    "                </span>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <a ng-controller=\"ContainersActionsController\" href=\"#/dashboard/containers/\" type=\"button\" id=\"button_agent_action\" ng-click=\"actionContainer(container.Id, container, container.Status)\" class=\"btn btn-sm btn-default {{ container.Status|statusButtonActive }}\" style=\"padding: 4px;\" autocomplete=\"off\">\n" +
    "                  <span class=\"label label-{{ container.Status|statusInverseBadge }} {{ container.Status|statusIconsStartStop }}\" style=\"font-size: 100%;top: 1px;\"> </span>\n" +
    "                </a>\n" +
    "              </td>\n" +
    "            </tr>\n" +
    "          </table>\n" +
    "        </div>\n" +
    "        <!-- Middle Container -->   \n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "</div>");
}]);

angular.module("app/components/dashboardImages/dashboardImages.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/dashboardImages/dashboardImages.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-include=\"template\" ng-controller=\"WrapperDashboardController\"></div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"row\">\n" +
    "      <!-- Middle Container -->\n" +
    "      <div class=\"col-xs-12\" id=\"body-middle-container\">\n" +
    "        <h1 class=\"page-header\">Moocs</h1>\n" +
    "        <div class=\"panel panel-default\">\n" +
    "          <div class=\"panel-heading\">\n" +
    "            <h3 class=\"panel-title\">\n" +
    "              <span class=\"col-xs-11\" style=\"margin-top: 5px; font-size: 18px;\">Mooc's List</span>\n" +
    "              <div class=\"btn-group\">\n" +
    "                <button type=\"button\" class=\"btn btn-default dropdown-toggle\" style=\"margin: 0;\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\">\n" +
    "                  Action <span class=\"caret\"></span>\n" +
    "                </button>\n" +
    "                <ul class=\"dropdown-menu\">\n" +
    "                  <li>\n" +
    "                    <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      data-toggle=\"modal\" data-target=\"#pull-modal\">Download mooc\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-controller=\"ImagesActionsController\"\n" +
    "                      ng-click=\"removeImage()\">Backup mooc\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                  <li>\n" +
    "                    <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                      ng-controller=\"ImagesActionsController\"\n" +
    "                      ng-click=\"removeImage()\">Remove mooc\n" +
    "                    </button>\n" +
    "                  </li>\n" +
    "                </ul>\n" +
    "              </div>\n" +
    "            </h3>\n" +
    "          </div>\n" +
    "          <div ng-include=\"template\" ng-controller=\"PullImageController\"></div>\n" +
    "          <div ng-include=\"template\" ng-controller=\"LoaderController\"></div>\n" +
    "          <!-- Table -->\n" +
    "          <table class=\"table table-striped\">\n" +
    "            <tr>\n" +
    "              <th></th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('RepoTag')\">\n" +
    "                  Tags\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'RepoTag'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.RepoTag\" placeholder=\"Filter...\" value=\"mooc\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('Id')\">\n" +
    "                  Id\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'Id'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.Id\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('Created')\">\n" +
    "                  Created\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'Created'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.Create\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('VirtualSize')\">\n" +
    "                  VirtualSize\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'VirtualSize'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.VirtualSize\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                Status\n" +
    "              </th>\n" +
    "            </tr>\n" +
    "            <tr ng-repeat=\"image in images | filter:search:strict | orderBy:predicate:reverse\">\n" +
    "              <td>\n" +
    "                <div ng-if=\"!image.Select\">\n" +
    "                  <input type=\"checkbox\" ng-model=\"image.Checked\" />\n" +
    "                </div>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                <a href=\"#/{{ image.From }}/images/{{ image.Id }}\">{{ image.RepoTag }}</a>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                {{ image.Id | truncate:15  }}\n" +
    "              </td>\n" +
    "              <td>&nbsp;&nbsp;&nbsp;\n" +
    "                {{ image.Created | getdate1000 }}\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                {{ image.VirtualSize | humansize }}\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <a href=\"#/dashboard/images/\" type=\"button\" id=\"button_agent_action\" ng-click=\"actionImage(image)\" \n" +
    "                class=\"btn\" style=\"padding: 4px; display: inline;\" autocomplete=\"off\">\n" +
    "                  <span class=\"label label-{{ image.Status|statusBadge }}\" style=\"font-size: 95%;\">{{ image.ContainerCreate }} {{ image.Status|statusRunning }}</span>\n" +
    "                </a>\n" +
    "              </td>\n" +
    "            </tr>\n" +
    "          </table>\n" +
    "        </div>\n" +
    "        <!-- Middle Container --> \n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "</div>");
}]);

angular.module("app/components/hostInformations/hostInformation.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/hostInformations/hostInformation.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-include=\"template\" ng-controller=\"WrapperHostsController\"></div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "	<div class=\"container-fluid\">\n" +
    "		<div class=\"row\">\n" +
    "			<!-- Middle Container -->\n" +
    "			<div class=\"col-xs-12\" id=\"body-middle-container\">\n" +
    "				<h1 class=\"page-header\">Host information</h1>\n" +
    "				<a href='/#/hosts/'><- Return Hosts</a><br/><br/>\n" +
    "				<div class=\"panel panel-default\">\n" +
    "					<div class=\"panel-heading\">\n" +
    "						<h3 class=\"panel-title\">\n" +
    "							<span class=\"col-xs-11\" style=\"margin-top: 5px; font-size: 18px;\">{{ hostInfo.Name }}</span>\n" +
    "              <div class=\"btn-group\">\n" +
    "                <button type=\"button\" class=\"btn btn-default dropdown-toggle\" style=\"margin: 0;\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\">\n" +
    "                  Action <span class=\"caret\"></span>\n" +
    "                </button>\n" +
    "								<ul class=\"dropdown-menu\">\n" +
    "								  <div ng-if=\"actImage\">\n" +
    "									  <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        data-toggle=\"modal\" data-target=\"#pull-modal\">Pull image\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                  </div>\n" +
    "                  <div ng-if=\"actContainer\">\n" +
    "									  <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        data-toggle=\"modal\" data-target=\"#create-modal\">Create Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "									  <li role=\"separator\" class=\"divider\"></li>\n" +
    "									  <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"startAction()\">Start Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "									  <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"stopAction()\">Stop Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"killAction()\">Kill Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"pauseAction()\">Pause Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"unpauseAction()\">Unpause Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"restartAction()\">Restart Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                    <li role=\"separator\" ng-show=\"!container.State.Running\" class=\"divider\"></li>\n" +
    "                    <li>\n" +
    "                      <button ng-controller=\"ContainersActionsController\" type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-click=\"removeAction()\">Remove Container\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                  </div>\n" +
    "                  <div ng-if=\"actImage\">\n" +
    "                    <li>\n" +
    "                      <button type=\"button\" class=\"btn-link btn-block btn-dropdown\"\n" +
    "                        ng-controller=\"ImagesActionsController\"\n" +
    "                        ng-click=\"removeImage()\">Remove images\n" +
    "                      </button>\n" +
    "                    </li>\n" +
    "                  </div>\n" +
    "								</ul>\n" +
    "							</div>\n" +
    "						</h3>\n" +
    "					</div>\n" +
    "					<div ng-include=\"template\" ng-controller=\"PullImageController\"></div>\n" +
    "					<div ng-include=\"template\" ng-controller=\"StartContainerController\"></div>\n" +
    "					<div class=\"panel-body\">\n" +
    "						<div class='col-xs-8 well'>\n" +
    "							<h5><b>System :</b></h5>\n" +
    "							<b>OSType : </b>\n" +
    "							{{ hostInfo.OSType }}\n" +
    "							<br/>\n" +
    "							<b>Kernel : </b>\n" +
    "							{{ hostInfo.KernelVersion }}\n" +
    "							<br/>\n" +
    "							<br/>\n" +
    "							<b>IP : </b>\n" +
    "							{{ hostUrl }}\n" +
    "							<br/>\n" +
    "              <br/>\n" +
    "						</div>\n" +
    "						<div class='col-xs-1'>\n" +
    "							<br/>\n" +
    "						</div>\n" +
    "						<div class='col-xs-3 well'>\n" +
    "							<b>Docker Daemon</b> version : <br/><br/>\n" +
    "							<center><span class='label label-primary' style='font-size: 16px;'> {{ hostInfo.ServerVersion }} </span></center>\n" +
    "							<br/>\n" +
    "						</div>\n" +
    "					</div>\n" +
    "					<uib-tabset active=\"active\">\n" +
    "            <uib-tab index=\"0\" heading=\"Containers\" ng-click=\"activeContainer()\">\n" +
    "            <!-- Tabs 1 container info -->\n" +
    "							<!-- Table -->\n" +
    "							<table class=\"table table-striped no-margin-bottom\">\n" +
    "								<tr>\n" +
    "									<th><input type=\"checkbox\" ng-model=\"toggle\" ng-change=\"toggleSelectAll()\" style=\"margin-top: 35px;\"/></th>\n" +
    "									<th>\n" +
    "										<button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('Names')\">\n" +
    "		                  Names\n" +
    "		                  <span class=\"sortorder\" ng-show=\"predicate === 'Names'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "		                </button>\n" +
    "		                <input class=\"form-control input-filter\" ng-model=\"search.Names\" placeholder=\"Filter...\">\n" +
    "	                </th>\n" +
    "									<th>\n" +
    "										<button class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('Id')\">\n" +
    "		                  Container ID\n" +
    "		                  <span class=\"sortorder\" ng-show=\"predicate === 'Id'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "		                </button>\n" +
    "		                <input class=\"form-control input-filter\" ng-model=\"search.Id\" placeholder=\"Filter...\">\n" +
    "									</th>\n" +
    "									<th>\n" +
    "										<button class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('Image')\">\n" +
    "		                  Image\n" +
    "		                  <span class=\"sortorder\" ng-show=\"predicate === 'Image'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "		                </button>\n" +
    "		                <input class=\"form-control input-filter\" ng-model=\"search.Image\" placeholder=\"Filter...\">\n" +
    "									</th>\n" +
    "									<th>\n" +
    "										<button class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('Status')\">\n" +
    "		                  Container Status\n" +
    "		                  <span class=\"sortorder\" ng-show=\"predicate === 'Status'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "		                </button>\n" +
    "		                <input class=\"form-control input-filter\" ng-model=\"search.Status\" placeholder=\"Filter...\">\n" +
    "									</th>\n" +
    "									<th>Action</th>\n" +
    "								</tr>\n" +
    "								<tr ng-repeat=\"container in containers | filter:search:strict | orderBy:predicate:reverse\">\n" +
    "									<td><input type=\"checkbox\" ng-model=\"container.Checked\" /></td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										{{ container | containername }}\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										<a href=\"#/hosts/{{ hostInfo.Name }}/containers/{{ container.Id }}\">\n" +
    "										{{ container.Id|truncate:15 }}\n" +
    "										</a>\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										{{ container.Image }}\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										<span class=\"label label-{{ container.Status|statusBadge }}\" style=\"font-size: 95%\">\n" +
    "										{{ container.Status|statusControle }}\n" +
    "										</span>\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										<a ng-controller=\"ContainersActionsController\" href=\"#/hosts/{{ hostInfo.Name }}/\" type=\"button\" id=\"button_agent_action\" ng-click=\"actionContainer(container.Id, container, container.Status)\" class=\"btn btn-sm btn-default {{ container.Status|statusButtonActive }}\" style=\"padding: 4px;\" autocomplete=\"off\">\n" +
    "										<span class=\"label label-{{ container.Status|statusInverseBadge }} {{ container.Status|statusIconsStartStop }}\" style=\"font-size: 100%;top: 1px;\"> </span>\n" +
    "										</a>\n" +
    "									</td>\n" +
    "								</tr>\n" +
    "							</table>\n" +
    "						</uib-tab>\n" +
    "            <uib-tab index=\"1\" heading=\"Images\" ng-click=\"activeImage()\">\n" +
    "							<table class=\"table table-striped no-margin-bottom\">\n" +
    "								<tr>\n" +
    "									<th></th>\n" +
    "									<th>\n" +
    "										<button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"orderImage('RepoTags')\">\n" +
    "											Tags\n" +
    "											<span class=\"sortorder\" ng-show=\"predicateImage === 'RepoTags'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "										</button>\n" +
    "										<input class=\"form-control input-filter\" ng-model=\"search.RepoTag\" placeholder=\"Filter...\">\n" +
    "									</th>\n" +
    "									<th>\n" +
    "										<button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"orderImage('Id')\">\n" +
    "											Id\n" +
    "											<span class=\"sortorder\" ng-show=\"predicateImage === 'Id'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "										</button>\n" +
    "										<input class=\"form-control input-filter\" ng-model=\"search.Id\" placeholder=\"Filter...\">\n" +
    "									</th>\n" +
    "									<th>\n" +
    "										<button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"orderImage('Created')\">\n" +
    "											Created\n" +
    "											<span class=\"sortorder\" ng-show=\"predicateImage === 'Created'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "										</button>\n" +
    "										<input class=\"form-control input-filter\" ng-model=\"search.Create\" placeholder=\"Filter...\">\n" +
    "								</th>\n" +
    "								<th>\n" +
    "									<button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"orderImage('VirtualSize')\">\n" +
    "										VirtualSize\n" +
    "										<span class=\"sortorder\" ng-show=\"predicateImage === 'VirtualSize'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "									</button>\n" +
    "								<input class=\"form-control input-filter\" ng-model=\"search.VirtualSize\" placeholder=\"Filter...\">\n" +
    "								</th>\n" +
    "								<th>\n" +
    "                  Containers\n" +
    "                </th>\n" +
    "								</tr>\n" +
    "								<tr ng-repeat=\"image in images | filter:search:strict | orderBy:predicateImage:reverse\">\n" +
    "									<td>\n" +
    "									  <div ng-if=\"!image.ContainerCreate\">\n" +
    "                      <input type=\"checkbox\" ng-model=\"image.Checked\" />\n" +
    "                    </div>\n" +
    "                  </td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										<a href=\"#/hosts/{{ hostInfo.Name }}/images/{{ image.Id }}\">{{ image | repotag }}</a>\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										{{ image.Id | truncate:15  }}\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										{{ image.Created | getdate1000 }}\n" +
    "									</td>\n" +
    "									<td>\n" +
    "										&nbsp;&nbsp;&nbsp;\n" +
    "										{{ image.VirtualSize | humansize }}\n" +
    "									</td>\n" +
    "									<td>\n" +
    "                    <a href=\"\" style=\"text-decoration: none;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"Container(s) created\">\n" +
    "                      <span class=\"label label-success\" style=\"font-size: 95%;\">{{ image.ContainerCreate }}</span>\n" +
    "                    </a>\n" +
    "                  </td>\n" +
    "								</tr>\n" +
    "							</table>\n" +
    "						</uib-tab>\n" +
    "					</div>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "</div>");
}]);

angular.module("app/components/hosts/hosts.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/hosts/hosts.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-include=\"template\" ng-controller=\"WrapperHostsController\"></div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"row\">\n" +
    "      <!-- Middle Container -->\n" +
    "      <div class=\"col-xs-12\" id=\"body-middle-container\">\n" +
    "        <h1 class=\"page-header\">Hosts Docker</h1>\n" +
    "        <div class=\"panel panel-default\">\n" +
    "          <div class=\"panel-heading\">\n" +
    "            <h3 class=\"panel-title\">Hosts's List</h3>\n" +
    "          </div>\n" +
    "          <!-- Table -->\n" +
    "          <table class=\"table table-striped\">\n" +
    "            <tr>\n" +
    "              <th><input type=\"checkbox\" ng-model=\"toggle\" ng-change=\"toggleSelectAll()\" style=\"margin-top: 35px;\"/></th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('nodename')\">\n" +
    "                  Hostname\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'nodename'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.nodename\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('url')\">\n" +
    "                  Url\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'url'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.url\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('version')\">\n" +
    "                  Docker version\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'version'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.version\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('health')\">\n" +
    "                  Status\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'health'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.health\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "              <th>\n" +
    "                <button type=\"button\" class=\"btn-link btn-block btn-dropdown\" ng-click=\"order('running')\">\n" +
    "                  Containers Status\n" +
    "                  <span class=\"sortorder\" ng-show=\"predicate === 'running'\" ng-class=\"{reverse:reverse}\"></span>\n" +
    "                </button>\n" +
    "                <input class=\"form-control input-filter\" ng-model=\"search.running\" placeholder=\"Filter...\">\n" +
    "              </th>\n" +
    "            </tr>\n" +
    "            <tr ng-repeat=\"swarm in swarms | filter:search:strict | orderBy:predicate:reverse\">\n" +
    "              <td><input type=\"checkbox\" ng-model=\"swarm.Checked\" /></td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                <a href=\"/#/hosts/{{ swarm.nodename }}/\">{{ swarm.nodename }}</a>\n" +
    "              </td>\n" +
    "              <td>&nbsp;&nbsp;&nbsp;\n" +
    "                {{ swarm.url }}\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                {{ swarm.version }}\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                <span class=\"label label-{{ swarm.health|statusbadgeNode }}\" style=\"font-size: 95%\">{{ swarm.health }}</span>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                &nbsp;&nbsp;&nbsp;\n" +
    "                <a href=\"\" style=\"text-decoration: none;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"Container(s) running\">\n" +
    "                  <span class=\"label label-success\" style=\"font-size: 95%;\">{{ swarm.running }}</span>\n" +
    "                </a>\n" +
    "                <a href=\"\" style=\"text-decoration: none;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"Container(s) stopped\">\n" +
    "                  <span class=\"label label-warning\" style=\"font-size: 95%;\">{{ swarm.stopped }}</span>\n" +
    "                </a>\n" +
    "                <a href=\"\" style=\"text-decoration: none;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"Container(s) created\">\n" +
    "                  <span class=\"label label-default\" style=\"font-size: 95%;\">{{ swarm.created }}</span>\n" +
    "                </a>\n" +
    "              </td>\n" +
    "            </tr>\n" +
    "          </table>\n" +
    "        </div>\n" +
    "        <!-- Middle Container --> \n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "</div>");
}]);

angular.module("app/components/image/image.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/image/image.html",
    "<div id=\"wrapper\">     \n" +
    "  <!-- Include Sidebar -->\n" +
    "  <div ng-if=\"dashOn\" ng-include=\"template\" ng-controller=\"WrapperDashboardController\"></div>\n" +
    "  <div ng-if=\"hostOn\" ng-include=\"template\" ng-controller=\"WrapperHostsController\"></div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"row\">\n" +
    "      <!-- Middle Container -->\n" +
    "      <div class=\"col-xs-12\">\n" +
    "        <h1 class=\"page-header\">Image information</h1>\n" +
    "        <div class=\"panel panel-default\">\n" +
    "          <div class=\"panel-heading\">\n" +
    "            <h3 class=\"panel-title\">\n" +
    "              <span class=\"col-xs-11\" style=\"margin-top: 5px; font-size: 18px;\">{{ RepoTag }}</span>\n" +
    "              <br/>\n" +
    "              <br/>\n" +
    "            </h3>\n" +
    "          </div>\n" +
    "          <div class=\"panel-body\">\n" +
    "            <a href=\"/#{{ from }}\"><- Return {{ returnTo }}</a><br/><br/>\n" +
    "            <div class='col-xs-9 well'>\n" +
    "              <h4>Global</h4>\n" +
    "              <b>Id : </b>{{ image.Id }}\n" +
    "              <br/>\n" +
    "              <b>Created : </b>{{ image.Created | date: 'medium' }}\n" +
    "              <br/>\n" +
    "              <br/>\n" +
    "            </div>\n" +
    "            <div class='col-xs-3'>\n" +
    "              <br/>\n" +
    "            </div>\n" +
    "            <div ng-include=\"template\" ng-controller=\"StartContainerController\"></div>          \n" +
    "          <table class=\"table table-striped\">\n" +
    "              <tbody>\n" +
    "              <tr>\n" +
    "                  <td>Parent:</td>\n" +
    "                  <td><a href=\"#{{ toParent }}{{ image.Parent }}/\">{{ image.Parent }}</a></td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                  <td>Size (Virtual Size):</td>\n" +
    "                  <td>{{ image.Size|humansize }} ({{ image.VirtualSize|humansize }})</td>\n" +
    "              </tr>\n" +
    "\n" +
    "              <tr>\n" +
    "                  <td>Hostname:</td>\n" +
    "                  <td>{{ image.ContainerConfig.Hostname }}</td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                  <td>User:</td>\n" +
    "                  <td>{{ image.ContainerConfig.User }}</td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                  <td>Cmd:</td>\n" +
    "                  <td>\n" +
    "                    <div class=\"well well-large no-margin-bottom\">\n" +
    "                      <ul class=\"deco-none\">\n" +
    "                        <li>{{ image.ContainerConfig.Cmd }}</li>\n" +
    "                      </ul>\n" +
    "                    </div>\n" +
    "                  </td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                  <td>Volumes:</td>\n" +
    "                  <td>\n" +
    "                    {{ image.ContainerConfig.Volumes }}</td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                  <td>Volumes from:</td>\n" +
    "                  <td>\n" +
    "                    {{ image.ContainerConfig.VolumesFrom }}\n" +
    "                  </td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                  <td>Built with:</td>\n" +
    "                  <td>\n" +
    "                    <div class=\"well well-large no-margin-bottom\">\n" +
    "                      <ul class=\"deco-none\">\n" +
    "                        <li>Docker {{ image.DockerVersion }} on {{ image.Os}}, {{ image.Architecture }}</li>\n" +
    "                      </ul>\n" +
    "                    </div>\n" +
    "                  </td>\n" +
    "              </tr>\n" +
    "              <tr>\n" +
    "                <td>History:</td>\n" +
    "                <td>\n" +
    "                  <div class=\"well well-large no-margin-bottom\">\n" +
    "                    <ul class=\"deco-none\">\n" +
    "                      <li ng-repeat=\"change in history | filter:hasContent\">\n" +
    "                        <strong>{{ change.Id }}</strong>: Created: {{ change.Created|getdate1000 }} Created by: {{ change.CreatedBy }}\n" +
    "                      </li>\n" +
    "                    </ul>\n" +
    "                  </div>\n" +
    "                </td>\n" +
    "              </tr>\n" +
    "              </tbody>\n" +
    "          </table>          \n" +
    "        </div>\n" +
    "        <!-- Middle Container -->   \n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- Main component for a primary marketing message or call to action -->\n" +
    "</div>");
}]);

angular.module("app/components/loader/loader.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/loader/loader.html",
    "<div id=\"loader-modal\" class=\"modal fade\">\n" +
    "  <div class=\"modal-dialog\">\n" +
    "    <div class=\"modal-content\">\n" +
    "      <div class=\"modal-header\">\n" +
    "        <h3>Loading...</h3>\n" +
    "      </div>\n" +
    "      <div class=\"modal-body\">\n" +
    "        <div class=\"progress\">\n" +
    "          <div class=\"progress-bar progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"100\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width: 100%\">\n" +
    "          </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("app/components/masthead/masthead.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/masthead/masthead.html",
    "<nav class=\"navbar navbar-inverse navbar-fixed-top\">\n" +
    "  <div class=\"container-fluid\">\n" +
    "    <div class=\"navbar-header\">\n" +
    "      <button type=\"button\" class=\"navbar-toggle collapsed\" data-toggle=\"collapse\" data-target=\"#navbar\" aria-expanded=\"false\" aria-controls=\"navbar\">\n" +
    "        <span class=\"sr-only\">Toggle navigation</span>\n" +
    "        <span class=\"icon-bar\"></span>\n" +
    "        <span class=\"icon-bar\"></span>\n" +
    "        <span class=\"icon-bar\"></span>\n" +
    "      </button>\n" +
    "      <a class=\"navbar-brand\" href=\"#/\">\n" +
    "        <span><img style=\"margin-top: -14px;\" src=\"ico/swarmui.png\">Solerni</span>\n" +
    "      </a>\n" +
    "    </div>\n" +
    "    <div id=\"navbar\" class=\"navbar-collapse collapse\">\n" +
    "      <ul class=\"nav navbar-nav navbar-right\">\n" +
    "        <li ng-if=\"dashOn\" id=\"navbar_0001\" class=\"active\">\n" +
    "          <a ng-click=\"updateMasthead(1)\" href=\"#/\">Dashboards</a>\n" +
    "        </li>\n" +
    "        <li ng-if=\"!dashOn\" id=\"navbar_0001\">\n" +
    "          <a ng-click=\"updateMasthead(1)\" href=\"#/\">Dashboards</a>\n" +
    "        </li>\n" +
    "        <li ng-if=\"hostOn\" id=\"navbar_0002\" class=\"active\">\n" +
    "          <a ng-click=\"updateMasthead(2)\" href=\"#/hosts/\">Hosts</a>\n" +
    "        </li>\n" +
    "        <li ng-if=\"!hostOn\" id=\"navbar_0002\">\n" +
    "          <a ng-click=\"updateMasthead(2)\" href=\"#/hosts/\">Hosts</a>\n" +
    "        </li>\n" +
    "        <li id=\"navbar_0003\" ng-if=\"showAdmin\">\n" +
    "          <a ng-click=\"updateMasthead(3)\" href=\"#/admin/\">Admin</a>\n" +
    "        </li>\n" +
    "        <li id=\"navbar_0004\" ng-if=\"showLogout\">\n" +
    "          <a ng-click=\"updateMasthead(3)\" href=\"#/logout/\">\n" +
    "            <span class=\"glyphicon glyphicon-off\" style=\"font-size: 14px;\"></span>\n" +
    "          </a>\n" +
    "        </li>\n" +
    "        <li id=\"navbar_0004\">\n" +
    "          <button type=\"button\" class=\"btn-link\"  ng-click=\"open()\"\n" +
    "            data-toggle=\"modal\" data-target=\"#about-modal\" style=\"margin-top: 11px;\">\n" +
    "              <span class=\"glyphicon glyphicon-info-sign\" style=\"font-size: 18px;\"></span>\n" +
    "          </button>\n" +
    "        </li>      \n" +
    "        <li>\n" +
    "          <button class=\"btn btn-primary\" style=\"margin-top:8px; margin-right:10px;\" ng-click=\"refresh()\">\n" +
    "            <span class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span>\n" +
    "            Refresh\n" +
    "          </button>\n" +
    "        </li>\n" +
    "      </ul>\n" +
    "    </div>\n" +
    "    <!--/.nav-collapse -->\n" +
    "  </div>\n" +
    "</nav>");
}]);

angular.module("app/components/pullImage/pullImage.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/pullImage/pullImage.html",
    "<div id=\"pull-modal\" class=\"modal fade\">\n" +
    "  <div class=\"modal-dialog\">\n" +
    "    <div class=\"modal-content\">\n" +
    "      <div class=\"modal-header\">\n" +
    "        <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">&times;</button>\n" +
    "        <h3>Download Mooc</h3>\n" +
    "      </div>\n" +
    "      <div class=\"modal-body\">\n" +
    "        <form role=\"form\" name=\"pullForm\">\n" +
    "          <div class=\"form-group\">\n" +
    "            <label>Select Mooc:</label>\n" +
    "            <select class=\"form-control\" ng-model=\"config.image\" ng-change=\"selectedMooc()\">\n" +
    "              <option ng-repeat=\"Mooc in moocsResult\">\n" +
    "                {{ Mooc }}\n" +
    "              </option>\n" +
    "            </select>\n" +
    "          </div>\n" +
    "        </form>\n" +
    "      </div>\n" +
    "      <div class=\"alert alert-error\" id=\"error-message\" style=\"display:none\">\n" +
    "        {{ error }}\n" +
    "      </div>\n" +
    "      <div ng-if=\"moocSelected\" class=\"modal-footer\">\n" +
    "        <a href=\"\" class=\"btn btn-primary\" ng-click=\"pull()\">Install</a>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("app/components/startContainer/startcontainer.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/startContainer/startcontainer.html",
    "<div id=\"create-modal\" class=\"modal fade\">\n" +
    "  <div class=\"modal-dialog\">\n" +
    "    <div class=\"modal-content\">\n" +
    "      <div class=\"modal-header\">\n" +
    "        <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">&times;</button>\n" +
    "        <h3>Create Container</h3>\n" +
    "      </div>\n" +
    "      <div class=\"modal-body\">\n" +
    "        <form role=\"form\">\n" +
    "          <uib-accordion close-others=\"true\">\n" +
    "            <uib-accordion-group heading=\"Container options\" is-open=\"menuStatus.containerOpen\">\n" +
    "                <fieldset>\n" +
    "                    <div class=\"row\">\n" +
    "                        <div class=\"col-xs-12\">\n" +
    "                          <div ng-if=\"!RepoTags\" class=\"form-group\">\n" +
    "                            <label>Image Tag version:</label>\n" +
    "                            <select class=\"form-control\" ng-model=\"config.Image\">\n" +
    "                              <option ng-repeat=\"Tag in images\" value=\"{{ Tag | repotag }}\">\n" +
    "                                {{ Tag | repotag }}\n" +
    "                              </option>\n" +
    "                            </select>\n" +
    "                          </div>\n" +
    "                          <div ng-if=\"RepoTags\" class=\"form-group\">\n" +
    "                            <label>Image Tag version:</label>\n" +
    "                            <select class=\"form-control\" ng-model=\"config.Image\">\n" +
    "                              <option ng-repeat=\"Tag in RepoTags\" value=\"{{ Tag }}\">\n" +
    "                                {{ Tag }}\n" +
    "                              </option>\n" +
    "                            </select>\n" +
    "                          </div>\n" +
    "                        </div>\n" +
    "                        <div class=\"col-xs-12\">\n" +
    "                          <div ng-if=\"!hostOn\" class=\"form-group\">\n" +
    "                            <label>Server host:</label>\n" +
    "                            <select class=\"form-control\" ng-model=\"selected.Host\">\n" +
    "                              <option ng-repeat=\"Node in Nodes\" value=\"{{ Node | nodename }}\">\n" +
    "                                {{ Node | nodename }}\n" +
    "                              </option>\n" +
    "                            </select>\n" +
    "                          </div>\n" +
    "                          <div ng-if=\"hostOn\" class=\"form-group\">\n" +
    "                            <label>Server host:</label>\n" +
    "                            <select class=\"form-control\" ng-model=\"selected.Host\">\n" +
    "                              <option value=\"{{ node }}\">\n" +
    "                                {{ node }}\n" +
    "                              </option>\n" +
    "                            </select>\n" +
    "                          </div>\n" +
    "                        </div>\n" +
    "                        <div class=\"col-xs-6\">\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Cmd:</label>\n" +
    "                                <input type=\"text\" placeholder='[\"/bin/echo\", \"Hello world\"]'\n" +
    "                                       ng-model=\"config.Cmd\" class=\"form-control\"/>\n" +
    "                                <small>Input commands as a raw string or JSON array</small>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Entrypoint:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.Entrypoint\" class=\"form-control\"\n" +
    "                                       placeholder=\"./entrypoint.sh\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Name:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.name\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Hostname:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.Hostname\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Domainname:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.Domainname\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>User:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.User\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Memory:</label>\n" +
    "                                <input type=\"number\" ng-model=\"config.Memory\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Volumes:</label>\n" +
    "\n" +
    "                                <div ng-repeat=\"volume in config.Volumes\">\n" +
    "                                    <div class=\"form-group form-inline\">\n" +
    "                                        <input type=\"text\" ng-model=\"volume.name\" class=\"form-control\"\n" +
    "                                               placeholder=\"/var/data\"/>\n" +
    "                                        <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                                                ng-click=\"rmEntry(config.Volumes, volume)\">Remove\n" +
    "                                        </button>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                        ng-click=\"addEntry(config.Volumes, {name: ''})\">Add Volume\n" +
    "                                </button>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                        <div class=\"col-xs-6\">\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>MemorySwap:</label>\n" +
    "                                <input type=\"number\" ng-model=\"config.MemorySwap\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>CpuShares:</label>\n" +
    "                                <input type=\"number\" ng-model=\"config.CpuShares\" class=\"form-control\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>Cpuset:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.Cpuset\" class=\"form-control\"\n" +
    "                                       placeholder=\"1,2\"/>\n" +
    "                                <small>Input as comma-separated list of numbers</small>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>WorkingDir:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.WorkingDir\" class=\"form-control\"\n" +
    "                                       placeholder=\"/app\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>MacAddress:</label>\n" +
    "                                <input type=\"text\" ng-model=\"config.MacAddress\" class=\"form-control\"\n" +
    "                                       placeholder=\"12:34:56:78:9a:bc\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label for=\"networkDisabled\">NetworkDisabled:</label>\n" +
    "                                <input id=\"networkDisabled\" type=\"checkbox\"\n" +
    "                                       ng-model=\"config.NetworkDisabled\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label for=\"tty\">Tty:</label>\n" +
    "                                <input id=\"tty\" type=\"checkbox\" ng-model=\"config.Tty\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label for=\"openStdin\">OpenStdin:</label>\n" +
    "                                <input id=\"openStdin\" type=\"checkbox\" ng-model=\"config.OpenStdin\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label for=\"stdinOnce\">StdinOnce:</label>\n" +
    "                                <input id=\"stdinOnce\" type=\"checkbox\" ng-model=\"config.StdinOnce\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label>SecurityOpts:</label>\n" +
    "\n" +
    "                                <div ng-repeat=\"opt in config.SecurityOpts\">\n" +
    "                                    <div class=\"form-group form-inline\">\n" +
    "                                        <input type=\"text\" ng-model=\"opt.name\" class=\"form-control\"\n" +
    "                                               placeholder=\"label:type:svirt_apache\"/>\n" +
    "                                        <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                                                ng-click=\"rmEntry(config.SecurityOpts, opt)\">Remove\n" +
    "                                        </button>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                        ng-click=\"addEntry(config.SecurityOpts, {name: ''})\">Add Option\n" +
    "                                </button>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <hr>\n" +
    "                    <div class=\"form-group\">\n" +
    "                        <label>Env:</label>\n" +
    "\n" +
    "                        <div ng-repeat=\"envar in config.Env\">\n" +
    "                            <div ng-if=\"envar.name != 'constraint:node='\" class=\"form-group form-inline\">\n" +
    "                                <div class=\"form-group\">\n" +
    "                                    <label class=\"sr-only\">Variable Name:</label>\n" +
    "                                    <input type=\"text\" ng-model=\"envar.name\" class=\"form-control\"\n" +
    "                                           placeholder=\"NAME\"/>\n" +
    "                                </div>\n" +
    "                                <div class=\"form-group\">\n" +
    "                                    <label class=\"sr-only\">Variable Value:</label>\n" +
    "                                    <input type=\"text\" ng-model=\"envar.value\" class=\"form-control\"\n" +
    "                                           placeholder=\"value\"/>\n" +
    "                                </div>\n" +
    "                                <div class=\"form-group\">\n" +
    "                                    <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                            ng-click=\"rmEntry(config.Env, envar)\">Remove\n" +
    "                                    </button>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                            <div ng-if=\"envar.name == 'constraint:node='\">\n" +
    "                              <div ng-init=\"rmEntry(config.Env, envar)\"></div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                        <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                ng-click=\"addEntry(config.Env, {name: '', value: ''})\">Add environment\n" +
    "                            variable\n" +
    "                        </button>\n" +
    "                    </div>\n" +
    "                    <div class=\"form-group\">\n" +
    "                        <label>Labels:</label>\n" +
    "\n" +
    "                        <div ng-repeat=\"label in config.Labels\">\n" +
    "                            <div class=\"form-group form-inline\">\n" +
    "                                <div class=\"form-group\">\n" +
    "                                    <label class=\"sr-only\">Key:</label>\n" +
    "                                    <input type=\"text\" ng-model=\"label.key\" class=\"form-control\"\n" +
    "                                           placeholder=\"key\"/>\n" +
    "                                </div>\n" +
    "                                <div class=\"form-group\">\n" +
    "                                    <label class=\"sr-only\">Value:</label>\n" +
    "                                    <input type=\"text\" ng-model=\"label.value\" class=\"form-control\"\n" +
    "                                           placeholder=\"value\"/>\n" +
    "                                </div>\n" +
    "                                <div class=\"form-group\">\n" +
    "                                    <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                            ng-click=\"rmEntry(config.Labels, label)\">Remove\n" +
    "                                    </button>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                        <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                ng-click=\"addEntry(config.Labels, {key: '', value: ''})\">Add Label\n" +
    "                        </button>\n" +
    "                    </div>\n" +
    "                </fieldset>\n" +
    "            </uib-accordion-group>\n" +
    "            <uib-accordion-group heading=\"HostConfig options\" is-open=\"menuStatus.hostConfigOpen\">\n" +
    "              <fieldset>\n" +
    "                <div class=\"row\">\n" +
    "                    <div class=\"col-xs-6\">\n" +
    "                      <div class=\"form-group\">\n" +
    "                        <label>Binds:</label>\n" +
    "\n" +
    "                        <div ng-repeat=\"bind in config.HostConfig.Binds\">\n" +
    "                          <div class=\"form-group form-inline\">\n" +
    "                            <input type=\"text\" ng-model=\"bind.name\" class=\"form-control\"\n" +
    "                              placeholder=\"/host:/container\"/>\n" +
    "                            <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                              ng-click=\"rmEntry(config.HostConfig.Binds, bind)\">Remove\n" +
    "                            </button>\n" +
    "                          </div>\n" +
    "                        </div>\n" +
    "                        <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                          ng-click=\"addEntry(config.HostConfig.Binds, {name: ''})\">Add Bind\n" +
    "                        </button>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                        <label>Links:</label>\n" +
    "\n" +
    "                        <div ng-repeat=\"link in config.HostConfig.Links\">\n" +
    "                          <div class=\"form-group form-inline\">\n" +
    "                            <input type=\"text\" ng-model=\"link.name\" class=\"form-control\"\n" +
    "                              placeholder=\"web:db\">\n" +
    "                            <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                              ng-click=\"rmEntry(config.HostConfig.Links, link)\">Remove\n" +
    "                            </button>\n" +
    "                          </div>\n" +
    "                        </div>\n" +
    "                        <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                ng-click=\"addEntry(config.HostConfig.Links, {name: ''})\">Add Link\n" +
    "                        </button>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                        <label>Dns:</label>\n" +
    "\n" +
    "                        <div ng-repeat=\"entry in config.HostConfig.Dns\">\n" +
    "                          <div class=\"form-group form-inline\">\n" +
    "                            <input type=\"text\" ng-model=\"entry.name\" class=\"form-control\"\n" +
    "                              placeholder=\"8.8.8.8\"/>\n" +
    "                            <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                              ng-click=\"rmEntry(config.HostConfig.Dns, entry)\">Remove\n" +
    "                            </button>\n" +
    "                          </div>\n" +
    "                        </div>\n" +
    "                        <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                ng-click=\"addEntry(config.HostConfig.Dns, {name: ''})\">Add entry\n" +
    "                        </button>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                        <label>DnsSearch:</label>\n" +
    "\n" +
    "                        <div ng-repeat=\"entry in config.HostConfig.DnsSearch\">\n" +
    "                          <div class=\"form-group form-inline\">\n" +
    "                            <input type=\"text\" ng-model=\"entry.name\" class=\"form-control\"\n" +
    "                              placeholder=\"example.com\"/>\n" +
    "                            <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                              ng-click=\"rmEntry(config.HostConfig.DnsSearch, entry)\">\n" +
    "                                Remove\n" +
    "                            </button>\n" +
    "                          </div>\n" +
    "                        </div>\n" +
    "                        <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                          ng-click=\"addEntry(config.HostConfig.DnsSearch, {name: ''})\">Add\n" +
    "                            entry\n" +
    "                        </button>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label>CapAdd:</label>\n" +
    "\n" +
    "                          <div ng-repeat=\"entry in config.HostConfig.CapAdd\">\n" +
    "                              <div class=\"form-group form-inline\">\n" +
    "                                  <input type=\"text\" ng-model=\"entry.name\" class=\"form-control\"\n" +
    "                                         placeholder=\"cap_sys_admin\"/>\n" +
    "                                  <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                                          ng-click=\"rmEntry(config.HostConfig.CapAdd, entry)\">Remove\n" +
    "                                  </button>\n" +
    "                              </div>\n" +
    "                          </div>\n" +
    "                          <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                  ng-click=\"addEntry(config.HostConfig.CapAdd, {name: ''})\">Add entry\n" +
    "                          </button>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label>CapDrop:</label>\n" +
    "\n" +
    "                          <div ng-repeat=\"entry in config.HostConfig.CapDrop\">\n" +
    "                              <div class=\"form-group form-inline\">\n" +
    "                                  <input type=\"text\" ng-model=\"entry.name\" class=\"form-control\"\n" +
    "                                         placeholder=\"cap_sys_admin\"/>\n" +
    "                                  <button type=\"button\" class=\"btn btn-danger btn-sm\"\n" +
    "                                          ng-click=\"rmEntry(config.HostConfig.CapDrop, entry)\">Remove\n" +
    "                                  </button>\n" +
    "                              </div>\n" +
    "                          </div>\n" +
    "                          <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                  ng-click=\"addEntry(config.HostConfig.CapDrop, {name: ''})\">Add entry\n" +
    "                          </button>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"col-xs-6\">\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label>NetworkMode:</label>\n" +
    "                          <input type=\"text\" ng-model=\"config.HostConfig.NetworkMode\"\n" +
    "                                 class=\"form-control\" placeholder=\"bridge\"/>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label for=\"publishAllPorts\">PublishAllPorts:</label>\n" +
    "                          <input id=\"publishAllPorts\" type=\"checkbox\"\n" +
    "                                 ng-model=\"config.HostConfig.PublishAllPorts\"/>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label for=\"privileged\">Privileged:</label>\n" +
    "                          <input id=\"privileged\" type=\"checkbox\"\n" +
    "                                 ng-model=\"config.HostConfig.Privileged\"/>\n" +
    "                      </div>\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label>VolumesFrom:</label>\n" +
    "\n" +
    "                          <div ng-repeat=\"volume in config.HostConfig.VolumesFrom\">\n" +
    "                              <div class=\"form-group form-inline\">\n" +
    "                                  <select ng-model=\"volume.name\" class=\"form-control\">\n" +
    "                                    <option ng-repeat=\"name in containers\" value=\"{{ name | containername }}\">\n" +
    "                                      {{ name | containername }}\n" +
    "                                    </option>   \n" +
    "                                  </select>\n" +
    "                                  <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                          ng-click=\"rmEntry(config.HostConfig.VolumesFrom, volume)\">\n" +
    "                                      Remove\n" +
    "                                  </button>\n" +
    "                              </div>\n" +
    "                          </div>\n" +
    "                          <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                                  ng-click=\"addEntry(config.HostConfig.VolumesFrom, {name: ''})\">Add\n" +
    "                              volume\n" +
    "                          </button>\n" +
    "                      </div>\n" +
    "\n" +
    "                      <div class=\"form-group\">\n" +
    "                          <label>RestartPolicy:</label>\n" +
    "                          <select ng-model=\"config.HostConfig.RestartPolicy.name\">\n" +
    "                              <option value=\"\">disabled</option>\n" +
    "                              <option value=\"always\">always</option>\n" +
    "                              <option value=\"on-failure\">on-failure</option>\n" +
    "                          </select>\n" +
    "                          <label>MaximumRetryCount:</label>\n" +
    "                          <input type=\"number\"\n" +
    "                                 ng-model=\"config.HostConfig.RestartPolicy.MaximumRetryCount\"/>\n" +
    "                      </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "                <hr>\n" +
    "                <div class=\"form-group\">\n" +
    "                    <label>ExtraHosts:</label>\n" +
    "\n" +
    "                    <div ng-repeat=\"entry in config.HostConfig.ExtraHosts\">\n" +
    "                        <div class=\"form-group form-inline\">\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label class=\"sr-only\">Hostname:</label>\n" +
    "                                <input type=\"text\" ng-model=\"entry.host\" class=\"form-control\"\n" +
    "                                       placeholder=\"hostname\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label class=\"sr-only\">IP Address:</label>\n" +
    "                                <input type=\"text\" ng-model=\"entry.ip\" class=\"form-control\"\n" +
    "                                       placeholder=\"127.0.0.1\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                        ng-click=\"rmEntry(config.HostConfig.ExtraHosts, entry)\">Remove\n" +
    "                                </button>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                            ng-click=\"addEntry(config.HostConfig.ExtraHosts, {host: '', ip: ''})\">Add\n" +
    "                        extra host\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "                <div class=\"form-group\">\n" +
    "                    <label>LxcConf:</label>\n" +
    "\n" +
    "                    <div ng-repeat=\"entry in config.HostConfig.LxcConf\">\n" +
    "                        <div class=\"form-group form-inline\">\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label class=\"sr-only\">Name:</label>\n" +
    "                                <input type=\"text\" ng-model=\"entry.name\" class=\"form-control\"\n" +
    "                                       placeholder=\"lxc.utsname\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <label class=\"sr-only\">Value:</label>\n" +
    "                                <input type=\"text\" ng-model=\"entry.value\" class=\"form-control\"\n" +
    "                                       placeholder=\"docker\"/>\n" +
    "                            </div>\n" +
    "                            <div class=\"form-group\">\n" +
    "                                <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                        ng-click=\"rmEntry(config.HostConfig.LxcConf, entry)\">Remove\n" +
    "                                </button>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                            ng-click=\"addEntry(config.HostConfig.LxcConf, {name: '', value: ''})\">Add\n" +
    "                        Entry\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "                <div class=\"form-group\">\n" +
    "                    <label>Devices:</label>\n" +
    "\n" +
    "                    <div ng-repeat=\"device in config.HostConfig.Devices\">\n" +
    "                        <div class=\"form-group form-inline inline-four\">\n" +
    "                            <label class=\"sr-only\">PathOnHost:</label>\n" +
    "                            <input type=\"text\" ng-model=\"device.PathOnHost\" class=\"form-control\"\n" +
    "                                   placeholder=\"PathOnHost\"/>\n" +
    "                            <label class=\"sr-only\">PathInContainer:</label>\n" +
    "                            <input type=\"text\" ng-model=\"device.PathInContainer\" class=\"form-control\"\n" +
    "                                   placeholder=\"PathInContainer\"/>\n" +
    "                            <label class=\"sr-only\">CgroupPermissions:</label>\n" +
    "                            <input type=\"text\" ng-model=\"device.CgroupPermissions\" class=\"form-control\"\n" +
    "                                   placeholder=\"CgroupPermissions\"/>\n" +
    "                            <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                    ng-click=\"rmEntry(config.HostConfig.Devices, device)\">Remove\n" +
    "                            </button>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                            ng-click=\"addEntry(config.HostConfig.Devices, { PathOnHost: '', PathInContainer: '', CgroupPermissions: ''})\">\n" +
    "                        Add Device\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "                <div class=\"form-group\">\n" +
    "                    <label>PortBindings:</label>\n" +
    "\n" +
    "                    <div ng-repeat=\"portBinding in config.HostConfig.PortBindings\">\n" +
    "                        <div class=\"form-group form-inline inline-four\">\n" +
    "                            <label class=\"sr-only\">Host IP:</label>\n" +
    "                            <input type=\"text\" ng-model=\"portBinding.ip\" class=\"form-control\"\n" +
    "                                   placeholder=\"Host IP Address\"/>\n" +
    "                            <label class=\"sr-only\">Host Port:</label>\n" +
    "                            <input type=\"text\" ng-model=\"portBinding.extPort\" class=\"form-control\"\n" +
    "                                   placeholder=\"Host Port\"/>\n" +
    "                            <label class=\"sr-only\">Container port:</label>\n" +
    "                            <input type=\"text\" ng-model=\"portBinding.intPort\" class=\"form-control\"\n" +
    "                                   placeholder=\"Container Port\"/>\n" +
    "                            <select ng-model=\"portBinding.protocol\">\n" +
    "                                <option value=\"\">tcp</option>\n" +
    "                                <option value=\"udp\">udp</option>\n" +
    "                            </select>\n" +
    "                            <button class=\"btn btn-danger btn-xs form-control\"\n" +
    "                                    ng-click=\"rmEntry(config.HostConfig.PortBindings, portBinding)\">\n" +
    "                                Remove\n" +
    "                            </button>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <button type=\"button\" class=\"btn btn-success btn-sm\"\n" +
    "                            ng-click=\"addEntry(config.HostConfig.PortBindings, {ip: '', extPort: '', intPort: ''})\">\n" +
    "                        Add Port Binding\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "              </fieldset>\n" +
    "            </uib-accordion-group>\n" +
    "          </uib-accordion>\n" +
    "        </form>\n" +
    "      </div>\n" +
    "      <div class=\"modal-footer\">\n" +
    "        <a href=\"\" class=\"btn btn-primary btn-lg\" ng-click=\"addNodeEntry(config.Env); create()\">Create</a>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("app/components/wrapperDashboard/wrapperDashboard.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/wrapperDashboard/wrapperDashboard.html",
    "<!-- Sidebar -->\n" +
    "<div id=\"sidebar-wrapper\">\n" +
    "  <ul id=\"sidebar_menu\" class=\"sidebar-nav\">\n" +
    "    <li class=\"sidebar-brand\">\n" +
    "      <a id=\"menu-toggle\" href=\"\" ng-click=\"wrapperDash()\">\n" +
    "        <span id=\"main_icon\" class=\"glyphicon glyphicon-align-justify\">\n" +
    "        </span>\n" +
    "      </a>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "  <ul class=\"sidebar-nav\" id=\"sidebar\">     \n" +
    "    <li id=\"wrapper-dash_0001\">\n" +
    "      <a href=\"/#/\" id=\"dash_elem_0001\" data-toggle=\"tooltip\" data-placement=\"right\" title=\"Dashboard\">\n" +
    "        Dashboard\n" +
    "        <div id=\"wrapper-dash\">\n" +
    "          <span id=\"main_icon_dash\" class=\"glyphicon glyphicon-dashboard\"></span>\n" +
    "        </div>\n" +
    "      </a>\n" +
    "    </li>\n" +
    "    <li id=\"wrapper-dash_0002\">\n" +
    "      <a href=\"/#/dashboard/images/\" id=\"dash_elem_0002\" data-toggle=\"tooltip\" data-placement=\"right\" title=\"Images Docker\">\n" +
    "        Images\n" +
    "        <div id=\"wrapper-agents\">\n" +
    "          <span id='main_icon_dash' class='glyphicon glyphicon-picture'>\n" +
    "            <span class='wrapper-badge wrapper-badge-danger'></span>\n" +
    "          </span>\n" +
    "        </div>\n" +
    "      </a>\n" +
    "    </li>\n" +
    "    <li id=\"wrapper-dash_0003\">\n" +
    "      <a href=\"/#/dashboard/containers/\" id=\"dash_elem_0003\" data-toggle=\"tooltip\" data-placement=\"right\" title=\"Containers Docker\">\n" +
    "        Containers\n" +
    "        <div id=\"wrapper-instances\">\n" +
    "          <span id='main_icon_dash' class='glyphicon glyphicon-oil'>\n" +
    "            <span class='wrapper-badge wrapper-badge-danger'></span>\n" +
    "          </span>\n" +
    "        </div>\n" +
    "      </a>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "</div>\n" +
    "");
}]);

angular.module("app/components/wrapperHosts/wrapperHosts.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("app/components/wrapperHosts/wrapperHosts.html",
    "<!-- Sidebar -->\n" +
    "<div id=\"sidebar-wrapper\">\n" +
    "  <ul id=\"sidebar_menu\" class=\"sidebar-nav\">\n" +
    "    <li class=\"sidebar-brand\">\n" +
    "      <a id=\"menu-toggle\" href=\"\" ng-click=\"wrapperDash()\">\n" +
    "        <span id=\"main_icon\" class=\"glyphicon glyphicon-align-justify\">\n" +
    "        </span>\n" +
    "      </a>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "  <ul class=\"sidebar-nav\" id=\"sidebar\">     \n" +
    "    <li id=\"wrapper-hosts_0001\" class=\"active\">\n" +
    "      <a href=\"/#/hosts/\" id=\"hosts_elem_0001\" data-toggle=\"tooltip\" data-placement=\"right\" title=\"Hosts\">\n" +
    "        Hosts\n" +
    "        <div id=\"wrapper-agents\">\n" +
    "          <span id='main_icon_dash' class='glyphicon glyphicon-list-alt'>\n" +
    "            <span class='wrapper-badge wrapper-badge-danger'></span>\n" +
    "          </span>\n" +
    "        </div>\n" +
    "      </a>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "</div>");
}]);
