angular.module('hosts', [])
.controller('HostsController', ['$scope', '$routeParams', 'Swarm', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, Swarm, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.swarms = [];
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
    
  //update({all: Settings.displayAll ? 1 : 0});
  update();
}]);
