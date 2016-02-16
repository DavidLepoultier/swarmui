angular.module('dashboardDocker', [])
.controller('DashboardDockerController', ['$scope', '$routeParams', 'ConsulNodes', 'SettingsConsul', 'Messages', '$timeout', 
  function ($scope, $routeParams, ConsulNodes, SettingsConsul, Messages, $timeout) {
    $scope.predicate = '-Created';
    $scope.consulNodes = [];
    $scope.changes = [];

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

    ConsulNodes.query({recurse: 1}, function (d) {
      for (var i = 0; i < d.length; i++) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        $scope.consulNodes.push(new ConsulNodesModel(values));
      }
    });
  }]);
