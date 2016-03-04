angular.module('tasksDashboard', [])
.controller('TasksDashboardController', ['$scope', 
  function ($scope) {
    $scope.containers = [];
    $scope.dashboard = '4';

  }]);
