angular.module('dashboardImages', [])
.controller('DashboardImagesController', ['$scope', '$rootScope', '$routeParams', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Settings, Messages, ViewSpinner) {

    $rootScope.$emit("CallPlaybooks", {});

    $scope.predicate = 'Playbooks';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

}]);
