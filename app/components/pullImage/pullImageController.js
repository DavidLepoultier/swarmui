angular.module('pullImage', [])
.controller('PullImageController', ['$scope', '$rootScope', '$routeParams', '$log', 'Messages', 'Image', 'Swarm', 'Container',
'ConsulPrimarySwarm', 'ConsulSolerni', 'errorMsgFilter', 'Repositories',
function ($scope, $rootScope, $routeParams, $log, Messages, Image, Swarm, Container, ConsulPrimarySwarm, ConsulSolerni, errorMsgFilter, Repositories) {
  $scope.template = 'app/components/pullImage/pullImage.html';
  $scope.searchMoocsResult = false;
  $scope.moocSelected = false;
  $scope.moocsResult = [];

  if ($routeParams.from){
    $scope.fromNode = false;
    $scope.nodeSelected = true;
  }

  $scope.init = function () {
    $scope.searchResult = false;
    $scope.searchTagResult = false;
    $scope.searchTagSelected = false;
    $scope.moocSelected = false;
    $scope.config = {
      selectedImage: '',
      searchImage: '',
      image: '',
      tag: '',
      node: ''
    };
  };

  $scope.create = function (configContainer) {
    var config = angular.copy(configContainer);
    Container.create(config, function (d) {
        Messages.send('Container Created', d.Id);
        ConsulSolerni.addImage({info: config.name, key: 'containerId'}, d.Id);
        $('#loader-modal').modal('hide');
    }, function (e) {
      failedRequestHandler(e, Messages);
      $('#loader-modal').modal('hide');
    });
  };

  $scope.init();

  function failedRequestHandler(e, Messages) {
      Messages.error('Error', errorMsgFilter(e));
  }

  $scope.getRepositoriesMoocs = function() {
    Repositories.query({action: '_catalog'}, function (d) {
      for (var i = 0; i < d.repositories.length; i++) {
        if (d.repositories[i].indexOf('mooc') !== -1) {
            $scope.moocsResult[i] = d.repositories[i];    
        } else {
          d.repositories.splice(i, 1);
          i--;
        }
      }
      console.log($scope.moocsResult);
      $scope.searchMoocsResult = true;
    }, function (e) {
    });
  };

  $scope.getRepositoriesMoocs();

  $scope.selectedMooc = function () {
    $scope.moocSelected = true;
  };

  $scope.updateConsulImage = function (config, imageShort) {
    ConsulSolerni.addImage({info: imageShort, key: 'fullname'}, config.image);
    Container.get({node: $scope.swarmUrl, id: imageShort}, function (d) {
      if (!d.Id) {
        var configContainer = {
          swarmHost: $scope.swarmUrl,
          Hostename: 'docker-raspbian',
          Image: config.image,
          name: imageShort,
          HostConfig: {
            PortBindings: [],
            ExtraHosts: ['raspberry.solerni:127.0.0.1']
          }
        };
        $scope.addEntry(configContainer.HostConfig.PortBindings, {ip: '', extPort: '80', intPort: '80'});
        $scope.addEntry(configContainer.HostConfig.PortBindings, {ip: '', extPort: '2222', intPort: '22'});
        var ExposedPorts = {};
        var PortBindings = {};
        configContainer.HostConfig.PortBindings.forEach(function (portBinding) {
        var intPort = portBinding.intPort + "/tcp";
        if (portBinding.protocol === "udp") {
          intPort = portBinding.intPort + "/udp";
        }
        var binding = {
          HostIp: portBinding.ip,
          HostPort: portBinding.extPort
        };
        if (portBinding.intPort) {
          ExposedPorts[intPort] = {};
          if (intPort in PortBindings) {
            PortBindings[intPort].push(binding);
          } else {
            PortBindings[intPort] = [binding];
          }
        }
        });
        configContainer.HostConfig.PortBindings = PortBindings;
        $scope.create(configContainer);
      } else {
        ConsulSolerni.addImage({info: imageShort, key: 'containerId'}, d.Id);
        $('#loader-modal').modal('hide');
      }
    });
  };

  $scope.addEntry = function (array, entry) {
    array.push(entry);
  };

  $scope.pull = function () {
      $('#error-message').hide();
      var config = angular.copy($scope.config);

      config.node = $scope.swarmUrl;
      config.image = 'repository.inrelosv2.com/' + config.image.replace(/[\s]/g, '');
      imageShort = config.image.split('/')[2];

      var imageName = (config.registry ? config.registry + '/' : '' ) +
        (config.repo ? config.repo + '/' : '') +
        (config.image) +
        (config.tag ? ':' + config.tag : '');

      $('#pull-modal').modal('hide');
      $('#loader-modal').modal({backdrop: 'static', keyboard: true, show: true});
      Messages.send("Pull image started", imageShort);
      Image.create(config, function (data) {
        if (data.constructor === Array) {
          var f = data.length > 0 && data[data.length - 1].hasOwnProperty('error');
          //check for error
          if (f) {
            var d = data[data.length - 1];
            $scope.error = "Cannot pull image " + imageName + " Reason: " + d.error;
            $('#loader-modal').modal('hide');
            $('#pull-modal').modal('show');
            $('#error-message').show();
          } else {
            setTimeout(function(){
              $rootScope.$emit("CallUpdateImage", {});
              Messages.send("Image Added", imageShort);
              $scope.updateConsulImage(config, imageShort);
              $scope.init();
            }, 1000);  
          }
        } else {
          Messages.send("Image Added", imageShort);
          $scope.updateConsulImage(config, imageShort);
          $scope.init();
        }
      }, function (e) {
        $scope.error = "Cannot pull image " + imageName + " Reason: " + e.data;
        $('#loader-modal').modal('hide');
        $('#pull-modal').modal('show');
        $('#error-message').show();
      });
  };
}]);
