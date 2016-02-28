angular.module('dashboardContainers', [])
.controller('DashboardContainersController', ['$scope', '$routeParams', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner', 'ConsulTasks',
  function ($scope, $routeParams, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner, ConsulTasks) {
    $scope.toggle = false;
    $scope.displayAll = Settings.displayAll;

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
      var startDate = new Date().getTime();
      var actionCont = '';
      if (status === 'Ghost') {
          return;
      } else if (status.indexOf('Exit') !== -1 && status !== 'Exit 0') {
        actionCont = 'start';
      } else {
        actionCont = 'stop';
      }
      ConsulPrimarySwarm.get({}, function (d){
        var url = atob(d[0].Value);
        var node = container.Names[0].split("/");
        containerBatch(id, url, actionCont, node[1], startDate);
      });
    };

    var containerBatch = function (id, url, actionCont, node, startDate) {
      ViewSpinner.spin();
      var actionTask = actionCont[0].toUpperCase() + actionCont.slice(1) + " container";
      var idShort = id.substring(0, 12);
      var idConsul = startDate + "-" + idShort;
      var logs = "";
      Container.actionCont({id: id, node: url, action: actionCont}, function (d) {
        update();
        var stat = "success";
        var endDate = new Date().getTime();
        ConsulTasks.createTask({id: idConsul,logs: logs,progress: 100,stat: stat,nodeName: node,action: actionCont,containerID: idShort,describe: actionTask,startDate: startDate,endDate: endDate});
        Messages.send(actionTask + " on " + node, id);
      }, function (e) {
        Messages.error("Failure", "Container failed to " + actionCont + "." + $routeParams.id);
        var stat = "failed";
        var endDate = new Date().getTime();
        ConsulTasks.createTask({id: idConsul,logs: logs,progress: 100,stat: stat,nodeName: node,action: actionCont,containerID: idShort,describe: actionTask,startDate: startDate,endDate: endDate});
      });
       ViewSpinner.stop();
    };    

    var update = function (data) {
      ViewSpinner.spin();
      ConsulPrimarySwarm.get({}, function (d){
        var url = atob(d[0].Value); 
        Container.query({all: 1, node: url}, function (d) {
          $scope.containers = d.map(function (item) {
              return new ContainerViewModel(item);
          });
          for (var i = 0; i < $scope.containers.length; i++){
            var splitedNames = $scope.containers[i].Names[0].split("/");
            $scope.containers[i].NodeName = splitedNames[1];
            $scope.containers[i].ContainerName = splitedNames[2];
          }
          ViewSpinner.stop();
        });
      });
    };
    
    var batch = function (items, action, msg) {
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
          if (action === Container.start) {
            Container.get({id: c.Id}, function (d) {
              c = d;
              counter = counter + 1;
              action({id: c.Id, HostConfig: c.HostConfig || {}}, function (d) {
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
          }
          else {
            counter = counter + 1;
            action({id: c.Id}, function (d) {
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
  batch($scope.containers, Container.start, "Started");
};

$scope.stopAction = function () {
  batch($scope.containers, Container.stop, "Stopped");
};

$scope.restartAction = function () {
  batch($scope.containers, Container.restart, "Restarted");
};

$scope.killAction = function () {
  batch($scope.containers, Container.kill, "Killed");
};

$scope.pauseAction = function () {
  batch($scope.containers, Container.pause, "Paused");
};

$scope.unpauseAction = function () {
  batch($scope.containers, Container.unpause, "Unpaused");
};

$scope.removeAction = function () {
  batch($scope.containers, Container.remove, "Removed");
};

//update({all: Settings.displayAll ? 1 : 0});
update();
}]);
