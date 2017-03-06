angular.module('dashboardContainers', [])
.controller('DashboardContainersController', ['$scope', '$rootScope', '$routeParams', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Settings, Messages, ViewSpinner) {

    $rootScope.$emit("CallRoles", {});

    $scope.predicate = 'Roles';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };
}]);
