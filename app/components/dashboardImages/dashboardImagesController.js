angular.module('dashboardImages', [])
.controller('DashboardImagesController', ['$scope', '$rootScope', '$routeParams', 'Image', 'Container', 'Swarm', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Image, Container, Swarm, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {
    $scope.images = [];
    $scope.toggle = false;
    $scope.swarmUrl = '';
    $scope.dashboard = '2';
    $scope.Nodes = [];
    $scope.containers = [];

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
          var countContainer = 0;
          for (var c = 0; c < $scope.containers.length; c++) {
            if ( $scope.images[i].RepoTag === $scope.containers[c].Image ) {
              countContainer++;
            }
          }
          if (countContainer !== 0) {
            $scope.images[i].ContainerCreate = countContainer;
          } else {
            $scope.images[i].ContainerCreate = '';
          }
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
        Container.query({all: 1, node: $scope.swarmUrl, notruc: 1}, function (d) {
          $scope.containers = d.map(function (item) {
            return new ContainerViewModel(item);
          });
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
            var countContainer = 0;
            for (var c = 0; c < $scope.containers.length; c++) {
              if ( $scope.images[i].RepoTag === $scope.containers[c].Image ) {
                countContainer++;
              }
            }
            if (countContainer !== 0) {
              $scope.images[i].ContainerCreate = countContainer;
            } else {
              $scope.images[i].ContainerCreate = '';
            }
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
