angular.module('hostsInforamtion', [])
.controller('HostsInformationController', ['$scope', '$routeParams', 'Swarm', 'Container', 
  'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner', 'Image',
  function ($scope, $routeParams, Swarm, Container, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner, Image) {
    $scope.dashboard = '1';
		$scope.toggle = false;
    $scope.swarmUrl = '';
    $scope.hostUrl = '';
    $scope.containers = [];
    $scope.images = [];

    $scope.predicate = 'Names';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

		$scope.toggleSelectAll = function () {
			angular.forEach($scope.containers, function (i) {
				i.Checked = $scope.toggle;
			});
		};

		var update = function (data) {
			ViewSpinner.spin();
			ConsulPrimarySwarm.get({}, function (d){
				$scope.swarmUrl = atob(d[0].Value); 
				Swarm.info({node: $scope.swarmUrl}, function (d) {
					for (var i = 4; i < d['SystemStatus'].length;i += 8){
						var nodename = d['SystemStatus'][i][0].split(" ");
						if ( nodename[1] === $routeParams.node ) {
							$scope.hostUrl = d['SystemStatus'][i][1];
							break;
						}
					}
					Swarm.info({node: $scope.hostUrl}, function (d){
						$scope.hostInfo = d;
					});
					Container.query({all: 1, node: $scope.hostUrl}, function (d) {
						$scope.containers = d.map(function (item) {
							return new ContainerViewModel(item);
						});
					});
					Image.query({node: $scope.hostUrl}, function (d) {
						console.log(d);
						$scope.images = d.map(function (item) {
							return new ImageViewModel(item);
						});
					});
				});
			});
      ViewSpinner.stop();
    };
    
  update();
}]);