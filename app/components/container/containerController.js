angular.module('container', [])
.controller('ContainerController', ['$scope', '$routeParams', '$location', 'Container', 'ContainerCommit', 
  'ContainerLogs', 'Messages', 'ViewSpinner', '$timeout', 'Swarm', 'ConsulPrimarySwarm',
  function ($scope, $routeParams, $location, Container, ContainerCommit, ContainerLogs, Messages, ViewSpinner, $timeout, Swarm, ConsulPrimarySwarm) {
      $scope.changes = [];
      $scope.edit = false;
      $scope.stdout = '';
      $scope.stderr = '';
      $scope.showTimestamps = false;
      $scope.tailLines = 2000;
      $scope.logIntervalId = '';

      var update = function () {
        ViewSpinner.spin();
        ConsulPrimarySwarm.get({}, function (d){
          var url = atob(d[0].Value);
          $scope.primarySwarm = url;
          Swarm.info({node: url}, function (d) {
            for (var i = 4; i < d['SystemStatus'].length;i += 8){
              var nodename = d['SystemStatus'][i][0].split(" ");
              if ( nodename[1] === $routeParams.node ) {
                $scope.hostUrl = d['SystemStatus'][i][1];
                break;
              }
            }
          });
          Container.get({id: $routeParams.id, node: url}, function (d) {
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

      var getLog = function () {
        ViewSpinner.spin();
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
            ViewSpinner.stop();
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
            ViewSpinner.stop();
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
          ViewSpinner.spin();
          Container.remove({
            id: $routeParams.id,
            node: $scope.primarySwarm
          }, function (d) {
              update();
              $location.path('/containers');
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

      update();
      $scope.getChanges();
  }]);
