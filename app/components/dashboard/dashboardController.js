angular.module('dashboard', [])
.controller('DashboardController', ['$scope', '$rootScope',
  function ($scope, $rootScope) {

  $rootScope.$emit("CallPlaybooks", {});
  $rootScope.$emit("CallRoles", {});

}]);
