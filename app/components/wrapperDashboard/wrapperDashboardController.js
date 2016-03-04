angular.module('wrapperDashboard', [])
.controller('WrapperDashboardController', ['$scope',
  function ($scope) {    
    $scope.template = 'app/components/wrapperDashboard/wrapperDashboard.html';

    $scope.wrapperDash = function() {
        $('#wrapper').toggleClass('active');
    };

    $scope.updateDash = function(page) {
      var containerWrapperName="#wrapper-dash_000";
      var totalDashElem=5+1;
      var currentContainer=page;
      for (var i = 1; i < totalDashElem; i++ ) {
          if( i !== currentContainer ){
              $(containerWrapperName+i).removeClass('active');
          }
      }
      $(containerWrapperName+currentContainer).addClass('active');
    };
    
    $scope.$on('$includeContentLoaded', function(event) {
      $scope.updateDash($scope.dashboard);
    });

}]);