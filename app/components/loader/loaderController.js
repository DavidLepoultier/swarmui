angular.module('loader', [])
.controller('LoaderController', ['$scope',
function ($scope) {
  $scope.template = 'app/components/loader/loader.html';
}]);
