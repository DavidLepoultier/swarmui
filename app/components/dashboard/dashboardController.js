angular.module('dashboard', [])
.controller('DashboardController', ['$scope', '$routeParams', 'ConsulNodes', 'ConsulContainers', 
  'ConsulSwarmManager', 'ConsulSwarmAgent', 'SettingsConsul', 'Messages',
  function ($scope, $routeParams, ConsulNodes, ConsulContainers, ConsulSwarmManager, ConsulSwarmAgent, SettingsConsul, Messages) {
    $scope.predicate = '-Created';
    $scope.consulNodes = [];
    $scope.consulContainers = [];
    $scope.consulSwarmManager = [];
    $scope.consulSwarmAgent = [];

    ConsulNodes.query({recurse: 1}, function (d) {
      $scope.consulNodes.total = d.length;
      $scope.consulNodes.running = 0;
      $scope.consulNodes.stopped = 0;
      var stopped = 0;
      for (var i = 0; i < d.length; i++) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        switch(values.status){
          case 'Healthy':
            $scope.consulNodes.running++;
            break;
          default:
            $scope.consulNodes.stopped++;
            break;
        }
      }
    });

    ConsulContainers.query({recurse: 1}, function (d) {
      $scope.consulContainers.total = d.length;
      $scope.consulContainers.running = 0;
      $scope.consulContainers.stopped = 0;
      $scope.consulContainers.ghost = 0;
      var stopped = 0;
      for (var i = 0; i < d.length; i++) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        if (values.status === 'Ghost') {
          $scope.consulContainers.ghost++;
        } else if (values.status.indexOf('Exit') !== -1 && values.status !== 'Exit 0') {
          $scope.consulContainers.stopped++;
        } else {
          $scope.consulContainers.running++;
        }
      }
    });

    ConsulSwarmManager.query({recurse: 1}, function (d) {
      $scope.consulSwarmManager.total = d.length;
      $scope.consulSwarmManager.running = 0;
      $scope.consulSwarmManager.stopped = 0;
      var stopped = 0;
      for (var i = 0; i < d.length; i++) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        switch(values.status){
          case 'Up':
            $scope.consulSwarmManager.running++;
            break;
          default:
            $scope.consulSwarmManager.stopped++;
            break;
        }
      }
    });

    ConsulSwarmAgent.query({recurse: 1}, function (d) {
      $scope.consulSwarmAgent.total = d.length;
      $scope.consulSwarmAgent.running = 0;
      $scope.consulSwarmAgent.stopped = 0;
      var stopped = 0;
      for (var i = 0; i < d.length; i++) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        switch(values.status){
          case 'Up':
            $scope.consulSwarmAgent.running++;
            break;
          default:
            $scope.consulSwarmAgent.stopped++;
            break;
        }
      }
    });

  }]);
