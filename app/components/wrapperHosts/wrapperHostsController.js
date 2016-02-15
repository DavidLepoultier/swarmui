angular.module('wrapperHosts', [])
.controller('WrapperHostsController', ['$scope',
  function ($scope) {    
    $scope.template = 'app/components/wrapperHosts/wrapperHosts.html';

    $scope.wrapperDash = function() {
        $('#wrapper').toggleClass('active');
    };

    $scope.updateHosts = function(page) {
      
      var containerWrapperName="#wrapper-hosts_000";
      var totalDashElem=5+1;
      var currentContainer=page;
      for (var i = 1; i < totalDashElem; i++ ) {
          if( i !== currentContainer ){
              $(containerWrapperName+i).removeClass('active');
          }
      }
      $(containerWrapperName+currentContainer).addClass('active');
    };
    
}]);