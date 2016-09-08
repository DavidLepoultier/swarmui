angular.module('image', [])
.controller('ImageController', ['$scope', '$q', '$routeParams', '$location', 'Image', 'Container',
  'Messages', 'LineChart', 'Swarm', 'ConsulPrimarySwarm', 'Repositories',
    function ($scope, $q, $routeParams, $location, Image, Container, Messages, LineChart, Swarm, ConsulPrimarySwarm, Repositories) {
      $scope.history = [];
      $scope.containerchart = true;
      $scope.addTags = false;
      $scope.tagInfo = {repo: '', version: '', force: false};
      $scope.id = '';
      $scope.repoTags = [];
      $scope.Nodes = [];
      $scope.swarmUrl = '';

      switch($routeParams.from){
        case 'dashboard':
          if ($routeParams.containerId){
            $scope.from = '/' + $routeParams.from + '/' + $routeParams.node + '/containers/' + $routeParams.containerId;
            $scope.toParent = $scope.from + '/image/';
            $scope.returnTo = "to container";
            $scope.dashboard = '3';
          } else {
            $scope.from = '/' + $routeParams.from + '/images/';
            $scope.toParent = $scope.from;
            $scope.returnTo = "to moocs list";
            $scope.dashboard = '2';
          }
          $scope.dashOn = true;
          break;
        case 'hosts':
          if ($routeParams.containerId){
            $scope.from = '/' + $routeParams.from + '/' + $routeParams.node + '/containers/' + $routeParams.containerId;
            $scope.toParent = $scope.from + '/image/';
            $scope.returnTo = "to container";
          } else {
            $scope.from = '/' + $routeParams.from + '/' + $routeParams.node;
            $scope.toParent = '/' + $routeParams.from + '/' + $routeParams.node + '/images/';
            $scope.returnTo = 'to ' + $routeParams.node;
          }
          $scope.dashboard = '1';
          $scope.hostOn = true;
          $scope.node = $routeParams.node;
          break;
        default:
          $scope.from = '/';
          $scope.returnTo = '';
          break;
      }

      $scope.removeImage = function (id) {
        Image.remove({id: id, node: $scope.swarmUrl}, function (d) {
          d.forEach(function(msg){
            var key = Object.keys(msg)[0];
            Messages.send(key, msg[key]);
          });
          // If last message key is 'Deleted' then assume the image is gone and send to images page
          if (d[d.length-1].Deleted) {
            $location.path($scope.from);
          } else {
            $location.path($scope.toParent + $scope.id); // Refresh the current page.
          } 
        }, function (e) {
            $scope.error = e.data;
            Messages.error("Warning", $scope.error);
        });
      };

      $scope.getHistory = function (url) {
        Image.history({id: $routeParams.id, node: url}, function (d) {
          $scope.history = d;
        });
      };

      /**
       * Get RepoTags from the /images/query endpoint instead of /image/json,
       * for backwards compatibility with Docker API versions older than 1.21
       * @param {string} imageId
       */
      function getRepoTags(imageId) {
        Image.query({}, function (d) {
            d.forEach(function(image) {
                if (image.Id === imageId && image.RepoTags[0] !== '<none>:<none>') {
                    $scope.RepoTags = image.RepoTags;
                }
            });
        });
      }

      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value); 
        Image.get({id: $routeParams.id, node: $scope.swarmUrl}, function (d) {
          $scope.image = d;
          $scope.id = d.Id;
          $scope.RepoTag = d.RepoTags[0].split('/')[2];
          if (d.RepoTags) {
              $scope.RepoTags = d.RepoTags;
          } else {
              getRepoTags($scope.id);
          }
          //$scope.getRepositoriesTags($scope.RepoTags);
          $scope.getHistory($scope.swarmUrl);
        }, function (e) {
            if (e.status === 404) {
                $('.detail').hide();
                $scope.error = "Image not found.<br />" + $routeParams.id;
            } else {
                $scope.error = e.data;
            }
            $('#error-message').show();
        });
      });
           
  }]);
