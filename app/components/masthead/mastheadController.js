angular.module('masthead', [])
.controller('MastheadController', ['$scope', '$rootScope', 'Settings', 'Version', '$uibModal', 'Roles', 'Playbooks',
  function ($scope, $rootScope, Settings, Version, $uibModal, Roles, Playbooks) {
    $scope.template = 'app/components/masthead/masthead.html';
    $scope.showNetworksVolumes = false;
    $scope.dashOn = false;
    $scope.hostOn = false;
    $scope.animationsEnabled = true;
    $scope.endpoint = Settings.endpoint;
    $scope.uiVersion = Settings.uiVersion;
    $scope.docker = {};

    if ( window.location.hash.indexOf('/hosts/') !== -1 ) {
      $scope.hostOn = true;
    } else {
      $scope.dashOn = true;
    }
    
    $rootScope.$on("CallRoles", function(){
      $scope.roles();
    });

    $rootScope.$on("CallPlaybooks", function(){
      $scope.playbooks();
    });

    $scope.roles = function() {
      Roles.get({}, function (d){
        $rootScope.roles = [];
        $scope.ansibleRoles = [];
        $scope.ansibleTypes = [];
        $scope.ansibleFilenames = [];
        $scope.ansibleKeys = [];
        $rootScope.numRoles = d.length;
        $rootScope.dataRoles = d;
        for (var i = 0; i < $rootScope.dataRoles.length; i++) {
          $scope.ansibleRoles = $rootScope.dataRoles[i];
          $scope.ansibleNumFiles = 0;
          $scope.ansibleNumKeys = 0;
          for (var r = 0; r < $scope.ansibleRoles[$scope.ansibleRoles.role].length; r++) {
            $scope.ansibleType = $scope.ansibleRoles[$scope.ansibleRoles.role][r];
            for (var t = 0; t < $scope.ansibleType[$scope.ansibleType.type].length; t++) {
              $scope.ansibleFilenames = $scope.ansibleType[$scope.ansibleType.type][t];
              $scope.ansibleNumFiles++;
              for (var f = 0; f < $scope.ansibleFilenames[$scope.ansibleFilenames.filename].length; f++) {
                $scope.ansibleKeys = $scope.ansibleFilenames[$scope.ansibleFilenames.filename][f];
                $scope.ansibleNumKeys = $scope.ansibleNumKeys + $scope.ansibleKeys.keynames.length;
              }
            }
          }
          $rootScope.roles.push({
            roleId: i,
            roleName: $scope.ansibleRoles.role,
            roleNumFiles: $scope.ansibleNumFiles,
            roleNumKeys: $scope.ansibleNumKeys
          });
        }    
      });    
    };

    $scope.playbooks = function () {
      Playbooks.get({}, function (d){
        $rootScope.playbooks = [];
        $scope.ansiblePlaybooks = [];
        $scope.ansibleHosts = [];
        $scope.ansibleRoles = [];
        $scope.ansibleFilenames = [];
        $rootScope.numPlaybooks = d.length;
        $rootScope.dataPlaybooks = d;
        for (var i = 0; i < $rootScope.dataPlaybooks.length; i++) {
          $scope.ansiblePlaybooks = $rootScope.dataPlaybooks[i];
          $rootScope.playbooks.push({
            playbookId: i,
            playbookName: $scope.ansiblePlaybooks.filename,
            playbookNumRoles: $scope.ansiblePlaybooks.roles.length
          });
        }    
      });
    };

    $scope.updateMasthead = function(page) {
      var containerWrapperName="#navbar_000";
      var totalDashElem=5+1;
      var currentContainer=page;
      for (var i = 1; i < totalDashElem; i++ ) {
          if( i !== currentContainer ){
              $(containerWrapperName+i).removeClass('active');
          }
      }
      $(containerWrapperName+currentContainer).addClass('active');
    };

    $scope.open = function () {
      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
        templateUrl: 'app/components/about/about.html',
        controller: 'MastheadController'
      });
    };

    $scope.cancel = function () {
      modalInstance.dismiss('cancel');
    };

    $scope.refresh = function() {
      location.reload();
    };
  }
]);
