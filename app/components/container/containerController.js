angular.module('container', [])
.controller('ContainerController', ['$scope', '$rootScope', '$routeParams', 'Settings', 'Messages', 'ViewSpinner', 'Roles',
  function ($scope, $rootScope, $routeParams, Settings, Messages, ViewSpinner, Roles) {
    
    switch($routeParams.from){
      case 'dashboard':
        $scope.fromTo = '/' + $routeParams.from + '/roles/';
        $scope.returnTo = "to roles list";
        $scope.dashboard = '3';
        $scope.dashOn = true;
        break;
      case 'hosts':
        $scope.fromTo = '/' + $routeParams.from + '/' + $routeParams.node + '/';
        $scope.returnTo = 'to ' + $routeParams.node;
        $scope.dashboard = '1';
        $scope.hostOn = true;
        break;
      default:
        $scope.from = '/';
        $scope.returnTo = '';
        break;
    }

    Roles.get({}, function (d){
        $scope.role = [];
        $scope.ansibleTypes = [];
        $scope.ansibleFilenames = [];
        $scope.ansibleKeys = [];
        $scope.ansibleNumFiles = 0;
        $scope.ansibleNumKeys = 0;
        $scope.role.name = ($routeParams.role);
        for (var r = 0; r < d[$routeParams.id][$scope.role.name].length; r++) {
          $scope.ansibleType = d[$routeParams.id][$scope.role.name][r];
          for (var t = 0; t < $scope.ansibleType[$scope.ansibleType.type].length; t++) {
            $scope.ansibleFilenames = $scope.ansibleType[$scope.ansibleType.type][t];
            $scope.ansibleNumFiles++;
            for (var f = 0; f < $scope.ansibleFilenames[$scope.ansibleFilenames.filename].length; f++) {
              $scope.ansibleKeys = $scope.ansibleFilenames[$scope.ansibleFilenames.filename][f];
              $scope.ansibleNumKeys = $scope.ansibleNumKeys + $scope.ansibleKeys.keynames.length;
            }
          }
        }
        $scope.role.roleNumFiles = $scope.ansibleNumFiles;
        $scope.role.roleNumKeys = $scope.ansibleNumKeys;  
    });

}]);