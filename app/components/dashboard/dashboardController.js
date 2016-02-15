angular.module('dashboard', [])
.controller('DashboardController', ['$scope', 
  function ($scope) {
    $scope.predicate = '-Created';
    $scope.containers = [];

  }]);
