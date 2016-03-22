angular.module('dashboardContainers', [])
.controller('DashboardContainersController', ['$scope', '$rootScope', '$routeParams', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
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
      containerQuery();
    });

    var containerQuery = function (){
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
      });
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

    update();
}]);
