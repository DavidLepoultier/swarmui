angular.module('dashboardImages', [])
.controller('DashboardImagesController', ['$scope', '$routeParams', 'Image', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $routeParams, Image, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.images = [];
    $scope.dashboard = '2';

    $scope.predicate = 'RepoTag';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    var update = function (data) {
      ViewSpinner.spin();
      ConsulPrimarySwarm.get({}, function (d){
        var url = atob(d[0].Value); 
        Image.query({node: url}, function (d) {
          $scope.images = d.map(function (item) {
              return new ImageViewModel(item);
          });
          for (var i = 0; i < $scope.images.length; i++){
            $scope.images[i].From = $routeParams.from;
            $scope.images[i].RepoTag = $scope.images[i].RepoTags[0];
            var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            var language = navigator.browserLanguage;
            var date = new Date($scope.images[i].Created*1000);
            $scope.images[i].Create = date.toLocaleDateString(language, options);
          }
          ViewSpinner.stop();
        });
      });
    };

    $scope.toggleSelectAll = function () {
      angular.forEach($scope.images, function (i) {
        i.Checked = $scope.toggle;
      });
    };
    
  //update({all: Settings.displayAll ? 1 : 0});
  update();
}]);
