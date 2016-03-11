angular.module('dashboardContainers', [])
.controller('DashboardContainersController', ['$scope', '$routeParams', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.toggle = false;
    $scope.displayAll = Settings.displayAll;
    $scope.dashboard = '3';
    $scope.swarmUrl = '';

    $scope.predicate = 'NodeName';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
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

    $scope.actionContainer = function (id,container,status){
      var actionCont = '';
      if (status === 'Ghost') {
          return;
      } else if (status.indexOf('Exit') !== -1 && status !== 'Exit 0' || status === 'created' ) {
        actionCont = 'start';
      } else {
        actionCont = 'stop';
      }
      var node = container.Names[0].split("/");
      containerBatch(id, $scope.swarmUrl, actionCont, node[1]);
    };

    var containerBatch = function (id, url, actionCont, node) {
      ViewSpinner.spin();
      var actionTask = actionCont[0].toUpperCase() + actionCont.slice(1) + " container";
      var idShort = id.substring(0, 12);
      var logs = "";
      Container.actionCont({id: id, node: url, action: actionCont}, function (d) {
        update();
        Messages.send(actionTask + " on " + node, id);
      }, function (e) {
        Messages.error("Failure", "Container failed to " + actionCont + "." + $routeParams.id);
      });
       ViewSpinner.stop();
    };    

    var update = function (data) {
      ViewSpinner.spin();
      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value); 
        Container.query({all: 1, node: $scope.swarmUrl}, function (d) {
          $scope.containers = d.map(function (item) {
              return new ContainerViewModel(item);
          });
          for (var i = 0; i < $scope.containers.length; i++){
            if ($scope.containers[i].Status === ''){
              $scope.containers[i].Status = 'created';
            }
            var splitedNames = $scope.containers[i].Names[0].split("/");
            $scope.containers[i].NodeName = splitedNames[1];
            $scope.containers[i].ContainerName = splitedNames[2];
          }
          ViewSpinner.stop();
        });
      });
    };
    
    var batch = function (items, order, action, msg) {
      ViewSpinner.spin();
      var counter = 0;
      var complete = function () {
        counter = counter - 1;
        if (counter === 0) {
          ViewSpinner.stop();
          update({all: Settings.displayAll ? 1 : 0});
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
              console.log(typeof d);
              console.log(d[0]);
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

$scope.toggleSelectAll = function () {
  angular.forEach($scope.containers, function (i) {
    i.Checked = $scope.toggle;
  });
};

$scope.toggleGetAll = function () {
  Settings.displayAll = $scope.displayAll;
  update({all: Settings.displayAll ? 1 : 0});
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
  batch($scope.containers, CContainer.actionCont, 'kill', "Killed");
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

//update({all: Settings.displayAll ? 1 : 0});
update();
}]);
