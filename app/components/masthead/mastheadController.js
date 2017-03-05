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
        $rootScope.numRoles = d.length;
        $rootScope.dataRoles = d;
      });    
    };

    $scope.playbooks = function () {
      Playbooks.get({}, function (d){
        $rootScope.numPlaybooks = d.length;
        $rootScope.dataPlaybooks = d;
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
