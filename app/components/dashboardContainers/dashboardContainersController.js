angular.module('dashboardContainers', [])
.controller('DashboardContainersController', ['$scope', '$routeParams', 'ConsulContainers', 'ConsulNodes', 'Container', 'ConsulPrimarySwarm', 
  'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, ConsulContainers, ConsulNodes, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.predicate = '-Created';
    $scope.toggle = false;
    $scope.displayAll = Settings.displayAll;
    $scope.consulContainers = [];
    $scope.setContainer = [];


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

    $scope.actionContainer = function (id,node,status){
      var addrNode = [];
      if (status === 'Ghost') {
          return;
      } else if (status.indexOf('Exit') !== -1 && status !== 'Exit 0') {
        containerStart(id, node);
      } else {
        containerStop(id, node);
      }
      
    };

    var containerStart = function (id) {
        ViewSpinner.spin();
        ConsulNodes.get({node: node}, function (d) {
          var values = JSON.parse(atob(d[0].Value));
          Container.start({id: id, node: values.url}, function (d) {
            Container.get({id: id, node: values.url});
            update(values.url);
            Messages.send("Container stopped on " + node, id);
          }, function (e) {
            Messages.error("Failure", "Container failed to stop." + $routeParams.id);
          });
        });
        ViewSpinner.stop();
    };

    var containerStop = function (id, node) {
        ViewSpinner.spin();
        ConsulNodes.get({node: node}, function (d) {
          var values = JSON.parse(atob(d[0].Value));
          Container.stop({id: id, node: values.url}, function (d) {
            Container.get({id: id, node: values.url});
            update();
            Messages.send("Container stopped on " + node, id);
          }, function (e) {
            Messages.error("Failure", "Container failed to stop." + $routeParams.id);
          });
        });
        ViewSpinner.stop();
    };    

    ConsulContainers.query({recurse: 1}, function (d) {
      for (var i = 0; i < d.length; i++) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        $scope.consulContainers.push(new ConsulContainersModel(values));
      }
    });

    var update = function (data) {
      ViewSpinner.spin(); 
      ConsulPrimarySwarm.get({}, function (d){
        var url = atob(d[0].Value); 
        Container.query({all:1, node: url}, function (d) {
          for (var i = 0; i < d.length; i++) {
            var item = d[i];
            var setContainer = [];
            $scope.setContainer.push(new ContainersUpdateModel(item));
            var itemNames = item.Names[0].split("/");
            $scope.setContainer[i].nodeName = itemNames[1];
            $scope.setContainer[i].serviceName = itemNames[2];
            $scope.setContainer[i].idConsul = itemNames[1] + "-" + item.Id.substr(0, 12);
            ConsulContainers.update($scope.setContainer[i]);
          }
          ConsulContainers.query(data, function (d) {
            $scope.containers = d.map(function (item) {
              return new ContainerViewModel(item);
            });
            ViewSpinner.stop();
          });
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
}]);
