angular.module('image', [])
.controller('ImageController', ['$scope', '$rootScope', '$routeParams', 'Settings', 'Messages', 'ViewSpinner', 'Roles',
  'Playbooks',
  function ($scope, $rootScope, $routeParams, Settings, Messages, ViewSpinner, Roles, Playbooks) {
    $scope.oneAtATime = true;
    $scope.oneAtATimeRole = true;

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
      var countf = 0;
      $scope.playbook = [];
      $scope.playbook.name = ($routeParams.playbook);
      $scope.playbook.playbookNumRoles = d[$routeParams.id].roles.length;
      for (var p = 0; p < d[$routeParams.id].roles.length; p++) {
        $scope.playbook.push({
          role: d[$routeParams.id].roles[p].role,
          files: []
        });
        for (var r = 0; r < $rootScope.dataRoles.length; r++) {
          //console.log($rootScope.dataRoles[r].role);
          //console.log(d[$routeParams.id].roles[p].role);
          if ( $rootScope.dataRoles[r].role === d[$routeParams.id].roles[p].role ) {
            $scope.role = d[$routeParams.id].roles[p].role;
                countf = 0;
            for ( var t = 0; t < $rootScope.dataRoles[r][$scope.role].length; t++) {
              $scope.type = $rootScope.dataRoles[r][$scope.role][t].type;
              for ( var f = 0; f < $rootScope.dataRoles[r][$scope.role][t][$scope.type].length; f++) {
                $scope.filename = $rootScope.dataRoles[r][$scope.role][t][$scope.type][f].filename;
                $scope.playbook[count].files.push({
                  file: $scope.type + '/' + $scope.filename,
                  keys: []
                });
                for ( var k = 0; k < $rootScope.dataRoles[r][$scope.role][t][$scope.type][f][$scope.filename].length; k++) {
                  for ( var n = 0; n < $rootScope.dataRoles[r][$scope.role][t][$scope.type][f][$scope.filename][k].keynames.length; n++) {
                    $scope.keyname = $rootScope.dataRoles[r][$scope.role][t][$scope.type][f][$scope.filename][k].keynames[n].keyname;
                    $scope.playbook[count].files[countf].keys.push({
                      keyname: $scope.keyname
                    });
                  }
                }
                console.log($scope.role + '/' + $scope.filename + '/' + countf);
                countf++;
              }
            }
          }
        }
        count++;
      }
    });
}]);