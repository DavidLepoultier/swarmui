angular.module('dashboardImages', [])
.controller('DashboardImagesController', ['$scope', '$rootScope', '$routeParams', '$timeout', 'Image', 'Container', 'Swarm', 
  'ConsulPrimarySwarm', 'ConsulSolerni', 'ConsulService', 'SettingsConsul', 'Settings', 'Messages', 
  function ($scope, $rootScope, $routeParams, $timeout, Image, Container, Swarm, ConsulPrimarySwarm, ConsulSolerni, ConsulService, SettingsConsul, Settings, Messages) {
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
      update();
    });

    $scope.containerBatch = function () {
      var actionTask = $scope.actionCont[0].toUpperCase() + $scope.actionCont.slice(1) + " container";
      Container.actionCont({id: $scope.containerId, node: $scope.swarmUrl, action: $scope.actionCont}, function (d) {
        Messages.send(actionTask + ' : ', $scope.containerId);
        ConsulSolerni.getMoocId({info: $scope.container.Name, key: 'containerId'}, function (d){
          $scope.containerId = atob(d[0].Value);
          $scope.actionCont = 'start';
          actionTask = $scope.actionCont[0].toUpperCase() + $scope.actionCont.slice(1) + " container";
          Container.actionCont({id: $scope.containerId, node: $scope.swarmUrl, action: $scope.actionCont}, function (d) {
            Messages.send(actionTask + ' : ', $scope.containerId);
            ConsulSolerni.updateActiveMooc({}, $scope.containerId, function (d){ 
              update();
              $('#loader-modal').modal('hide');
              ConsulService.removeService({Node: $scope.containers.Name.slice(1)});
              ConsulService.addService({Datacenter: 'dc1', Node: $scope.container.Name, Address: '172.17.0.2', Service: {Service: $scope.container.Name.split('-')[1], Port: 80}});
            });
          }, function (e) {
            Messages.error("Failure", "Container failed to " + $scope.actionCont + ".");
            update();
            $('#loader-modal').modal('hide');
          });
        });
      }, function (e) {
        Messages.error("Failure", "Container failed to " + $scope.actionCont + ".");
        update();
        $('#loader-modal').modal('hide');
      });  
    };

    $scope.actionImage = function (image) {
      if (image.Status !== 'running'){
        $('#loader-modal').modal({backdrop: 'static', keyboard: true, show: true});
        $scope.actionCont = 'stop';
        $scope.container = image;
        $scope.containerId = $scope.activeMooc;
        $scope.containerBatch();
      }
    };

    var update = function (data) {
      ConsulPrimarySwarm.get({}, function (d){
        $scope.swarmUrl = atob(d[0].Value);
        ConsulSolerni.getActiveMooc({}, function (d){
          $scope.activeMooc = atob(d[0].Value);
          Container.get({node: $scope.swarmUrl, id: $scope.activeMooc}, function (d) {
            $scope.containers = d;
          });
          Image.query({node: $scope.swarmUrl}, function (d) {
            $scope.images = d.map(function (item) {
                return new ImageViewModel(item);
            });
            for (var i = 0; i < $scope.images.length; i++){
              var tmp = $scope.images[i].RepoTags[0].split('/')[2];
              if (tmp.indexOf('mooc') === -1) {
                $scope.images.splice(i, 1);
                i--;
              } else {
                $scope.images[i].From = $routeParams.from;
                $scope.images[i].RepoTag = tmp;
                $scope.images[i].Name = tmp.split(':')[0];
                var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                var language = navigator.browserLanguage;
                var date = new Date($scope.images[i].Created*1000);
                $scope.images[i].Create = date.toLocaleDateString(language, options);
                var countContainer = 0;
                if ( $scope.images[i].Id === $scope.containers.Image) {
                  countContainer++;
                }
                if (countContainer !== 0) {
                  $scope.images[i].ContainerCreate = 'Set';
                  $scope.images[i].Status = $scope.containers.State.Status;
                  $scope.images[i].Select = 'off';
                } else {
                  $scope.images[i].ContainerCreate = 'Unset';
                  $scope.images[i].Status = 'created';
                }
              }
            }
          });
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
