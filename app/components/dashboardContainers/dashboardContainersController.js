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
