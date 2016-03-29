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
            $scope.returnTo = "to images list";
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
            $scope.toParent = $scope.from;
            $scope.returnTo = 'to ' + $routeParams.node;
          }
          $scope.dashboard = '1';
          $scope.hostOn = true;
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
            $location.path($scope.from + $scope.id); // Refresh the current page.
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

      $scope.addTag = function () {
        var tag = $scope.tagInfo;
        Image.tag({
            id: $routeParams.id,
            node:  $scope.swarmUrl,
            repo: tag.repo,
            tag: tag.version,
            force: tag.force ? 1 : 0
        }, function (d) {
            Messages.send("Tag Added", $routeParams.id);
            $location.path($scope.from + $scope.id);
        }, function (e) {
            $scope.error = e.data;
            $('#error-message').show();
        });
      };

      function getContainersFromImage($q, Container, RepoTags, nodeUrl) {
        var defer = $q.defer();
        Container.query({all: 1, node: nodeUrl, notruc: 1}, function (d) {
            var containers = [];
            for (var i = 0; i < d.length; i++) {
                var c = d[i];
                for (r = 0; r < RepoTags.length; r++) {
                  var repoSplited = RepoTags[r].split(":");
                  var repoTagsShort = repoSplited[0];
                  if (c.Image === repoTagsShort && RepoTags[r] === c.Image + ":latest" ) {
                    containers.push(new ContainerViewModel(c));
                  } else if ( c.Image === RepoTags[r] ) {
                    containers.push(new ContainerViewModel(c));
                  }
                }
            }
            defer.resolve(containers);
        });
        return defer.promise;
      }

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

      $scope.getRepositoriesTags = function(RepoTags) {
        var splitName = RepoTags[0].split(":");
        var imageName = splitName[0];
        var splitUser = RepoTags[0].split("/");
        if (!splitUser[1]) {
          imageName = 'library/' + imageName;
        }
        Repositories.get({image: imageName}, function (d) {
          if (d.results[0].name === 'latest' ) {
            $scope.lastRepoTags = d.results[1].name;
          } else {
            $scope.lastRepoTags = d.results[0].name;
          }
        });
      };

      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value); 
        Swarm.info({node: $scope.swarmUrl}, function (d) {
          var n = 0;
          for (var i = 4; i < d['SystemStatus'].length;i += 8) {
            $scope.Nodes[n] = d['SystemStatus'][i];
            n++;
          }
        });
        Image.get({id: $routeParams.id, node: $scope.swarmUrl}, function (d) {
          $scope.image = d;
          $scope.id = d.Id;
          if (d.RepoTags) {
              $scope.RepoTags = d.RepoTags;
          } else {
              getRepoTags($scope.id);
          }
          getContainersFromImage($q, Container, $scope.RepoTags, $scope.swarmUrl).then(function (containers) {
              if (containers.length === 0) {
                $scope.containerchart = false;
              }
              LineChart.build('#containers-started-chart', containers, function (c) {
                return new Date(c.Created * 1000).toLocaleDateString();
              });
          });
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
