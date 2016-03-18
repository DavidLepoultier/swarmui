angular.module('hostsInforamtion', [])
.controller('HostsInformationController', ['$scope', '$routeParams', 'Swarm', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, Swarm, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.swarms = [];
    $scope.dashboard = '1';

}]);