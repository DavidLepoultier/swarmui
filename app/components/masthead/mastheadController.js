angular.module('masthead', [])
.controller('MastheadController', ['$scope',
 function ($scope) {
    $scope.template = 'app/components/masthead/masthead.html';
    $scope.showNetworksVolumes = false;

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

    $scope.refresh = function() {
        location.reload();
    };
}]);
