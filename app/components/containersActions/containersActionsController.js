angular.module('containersActions', [])
.controller('ContainersActionsController', ['$scope', '$rootScope', '$routeParams', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {

    $scope.actionContainer = function (id,container,status){
      var actionCont = '';
      if (status === 'Ghost') {
          return;
      } else if (status.indexOf('Exit') !== -1 && status !== 'Exit 0' || status === 'created' ) {
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