angular.module('masthead', [])
.controller('MastheadController', ['$scope', 'Settings', 'Version', 'ConsulPrimarySwarm', '$uibModal',
  function ($scope, Settings, Version, ConsulPrimarySwarm, $uibModal) {
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

    ConsulPrimarySwarm.get({}, function (d){
      var url = atob(d[0].Value); 
      Version.get({node: url}, function (d) {
        $scope.docker = d;
      });
    });

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
