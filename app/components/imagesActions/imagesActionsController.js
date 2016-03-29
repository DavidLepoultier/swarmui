angular.module('imagesActions', [])
.controller('ImagesActionsController', ['$scope', '$rootScope', '$routeParams', 'Image', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner',
  function ($scope, $rootScope, $routeParams, Image, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner) {

    var batchImage = function (items, order, action, msg) {
      ViewSpinner.spin();
      var counter = 0;
      var complete = function () {
        counter = counter - 1;
        if (counter === 0) {
          ViewSpinner.stop();
          $rootScope.$emit("CallUpdateImage", {});
        }
      };
      angular.forEach(items, function (c) {
        if (c.Checked) {
          if (order === Image.remove) {
            counter = counter + 1;
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
          }
        }
      });
      if (counter === 0) {
        ViewSpinner.stop();
      }
    };

    $scope.removeImage = function () {
      batchImage($scope.images, Image.remove, '', "Removed");
    };
}]);