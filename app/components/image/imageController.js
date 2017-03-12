angular.module('image', [])
.controller('ImageController', ['$scope', '$rootScope', '$routeParams', 'Settings', 'Messages', 'ViewSpinner', 'Roles',
  'Playbooks',
  function ($scope, $rootScope, $routeParams, Settings, Messages, ViewSpinner, Roles, Playbooks) {
    $scope.oneAtATime = true;

    switch($routeParams.from){
      case 'dashboard':
        $scope.fromTo = '/' + $routeParams.from + '/playbooks/';
        $scope.returnTo = "to playbooks list";
        $scope.dashboard = '2';
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

    Playbooks.get({}, function (d){
      var count = 0;
      $scope.playbook = [];
      $scope.playbook.name = ($routeParams.playbook);
      $scope.playbook.playbookNumRoles = d[$routeParams.id].roles.length;
      for (var p = 0; p < d[$routeParams.id].roles.length; p++) {
        $scope.playbook.push({
          role: d[$routeParams.id].roles[p].role
        });
      }
    });

    Roles.get({}, function (d){
        var count = 0;
        $scope.role = [];
        $scope.ansibleTypes = [];
        $scope.ansibleFilenames = [];
        $scope.ansibleKeys = [];
        $scope.ansibleNumFiles = 0;
        $scope.ansibleNumKeys = 0;
        for (var r = 0; r < d[$routeParams.id][$scope.role.name].length; r++) {
          $scope.ansibleType = d[$routeParams.id][$scope.role.name][r];
          for (var t = 0; t < $scope.ansibleType[$scope.ansibleType.type].length; t++) {
            $scope.ansibleFilenames = $scope.ansibleType[$scope.ansibleType.type][t];
            $scope.ansibleNumFiles++;
            $scope.role.push({
              filename: $scope.ansibleType.type + '/' + $scope.ansibleFilenames.filename,
              keys: []
            });
            for (var f = 0; f < $scope.ansibleFilenames[$scope.ansibleFilenames.filename].length; f++) {
              $scope.ansibleKeys = $scope.ansibleFilenames[$scope.ansibleFilenames.filename][f];
              $scope.ansibleNumKeys = $scope.ansibleNumKeys + $scope.ansibleKeys.keynames.length;
              for (var k = 0; k < $scope.ansibleKeys.keynames.length; k++) {
                $scope.role[count].keys.push({
                  key: $scope.ansibleKeys.keynames[k].keyname
                });
              }
            }
          count++;
          }
        }
        $scope.role.roleNumFiles = $scope.ansibleNumFiles;
        $scope.role.roleNumKeys = $scope.ansibleNumKeys;  
    });

}]);