angular.module('dashboardDocker', [])
.controller('DashboardDockerController', ['$scope', '$routeParams', 'ConsulNodes', 'Swarm', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, ConsulNodes, Swarm, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.predicate = '-Created';
    $scope.consulNodes = [];
    $scope.swarms = [];


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
          console.log($scope.swarms);
          ViewSpinner.stop();
        });
      });
    };
    
  //update({all: Settings.displayAll ? 1 : 0});
  update();
}]);
