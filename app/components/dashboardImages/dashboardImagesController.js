angular.module('dashboardImages', [])
.controller('DashboardImagesController', ['$scope', '$rootScope', '$routeParams', 'Image', 'Swarm', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Image, Swarm, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.images = [];
    $scope.toggle = false;
    $scope.swarmUrl = '';
    $scope.dashboard = '2';
    $scope.Nodes = [];

    $scope.predicate = 'RepoTag';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    $rootScope.$on("CallUpdateImage", function(){
      imageQuery();
    });

    var imageQuery = function (){
      Image.query({node: $scope.swarmUrl}, function (d) {
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
      });
    };

    var update = function (data) {
      ViewSpinner.spin();
      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value);
        Swarm.info({node: $scope.swarmUrl}, function (d) {
          var n = 0;
          for (var i = 4; i < d['SystemStatus'].length;i += 8) {
            $scope.Nodes[n] = d['SystemStatus'][i];
            n++;
          }
        });
        Image.query({node: $scope.swarmUrl}, function (d) {
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
