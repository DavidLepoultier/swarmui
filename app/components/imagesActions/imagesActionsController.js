angular.module('imagesActions', [])
.controller('ImagesActionsController', ['$scope', '$rootScope', '$routeParams', 'Image', 'Container',
  'ConsulPrimarySwarm', 'ConsulSolerni', 'SettingsConsul', 'Settings', 'Messages', 
  function ($scope, $rootScope, $routeParams, Image, Container, ConsulPrimarySwarm, ConsulSolerni, SettingsConsul, Settings, Messages) {

    var batchImage = function (items, order, action, msg) {
      $('#loader-modal').modal({backdrop: 'static', keyboard: true, show: true});
      var counter = 0;
      var complete = function () {
        counter = counter - 1;
        if (counter === 0) {
          $('#loader-modal').modal('hide');
          $rootScope.$emit("CallUpdateImage", {});
        }
      };
      angular.forEach(items, function (c) {
        if (c.Checked) {
          if (order === Image.remove) {
            counter = counter + 1;
            ConsulSolerni.getMoocId({info: c.Name, key: 'containerId'}, function (d) {
              $scope.containerId = atob(d[0].Value);
              console.log($scope.containerId);
              Container.remove({id: $scope.containerId, node: $scope.swarmUrl }, function (d) {
                order({id: c.Id, node: $scope.swarmUrl}, function (d) {
                  if (d[0] === '4'){ 
                    var array = $.map(d, function(value, index) {
                      return [value];
                    });
                    var error = "";
                    for (var i = 0; i < array.length - 15; i++) {
                      error += array[i];
                    }
                    Messages.error("Failure image " + msg, error);
                  } else {
                    Messages.send("Image " + msg, c.Id);
                  }
                  var index = $scope.images.indexOf(c);
                  complete();
                }, function (e) {
                  Messages.error("Failure image " + msg, e.data);
                  complete();
                });
              }, function (e) {
                Messages.error("Failure image " + msg, e.data);
                complete();
              });
            }, function (e) {
              Messages.error("Failure image " + msg, e.data);
              complete();
            });
          }
        }
      });
      if (counter === 0) {
        $('#loader-modal').modal('hide');
      }
    };

    $scope.removeImage = function () {
      console.log($scope.images);
      batchImage($scope.images, Image.remove, '', "Removed");
    };
}]);