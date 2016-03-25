angular.module('hostsInforamtion', [])
.controller('HostsInformationController', ['$scope', '$rootScope', '$routeParams', 'Swarm', 'Container', 'containernameFilter',
  'errorMsgFilter', 'ConsulPrimarySwarm', 'SettingsConsul', 'Settings', 'Messages', 'ViewSpinner', 'Image',
  function ($scope, $rootScope, $routeParams, Swarm, Container, containernameFilter, errorMsgFilter, ConsulPrimarySwarm, SettingsConsul, Settings, Messages, ViewSpinner, Image) {
    $scope.dashboard = '1';
    $scope.toggle = false;
    $scope.toggleImg = false;
    $scope.newToggle = true;
    $scope.swarmUrl = '';
    $scope.hostUrl = '';
    $scope.containers = [];
    $scope.images = [];
    $scope.Nodes = [];

    $rootScope.$on("CallUpdateContainer", function(){
      containerQuery();
    });

    $rootScope.$on("CallUpdateImageNode", function(){
      imageQuery();
    });

    $scope.predicate = 'Names';
    $scope.reverse = false;
    $scope.order = function(predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    $scope.predicateImage = 'RepoTags';
    $scope.reverse = false;
    $scope.orderImage = function(predicateImage) {
      $scope.reverse = ($scope.predicateImage === predicateImage) ? !$scope.reverse : false;
      $scope.predicateImage = predicateImage;
    };

	$scope.toggleSelectAll = function () {
		if ( $scope.toggle === $scope.newToggle ){
			$scope.toggle = false;
		} else {
			$scope.toggle = true;
		}
		angular.forEach($scope.containers, function (i) {
			i.Checked = $scope.toggle;
		});
	};

	$scope.toggleSelectAllImage = function () {
		if ( $scope.toggleImg === $scope.newToggle ){
			$scope.toggleImg = false;
		} else {
			$scope.toggleImg = true;
		}
		angular.forEach($scope.images, function (i) {
			i.Checked = $scope.toggleImg;
		});
	};

	var containerQuery = function (){
		Container.query({all: 1, node: $scope.hostUrl}, function (d) {
			$scope.containers = d.map(function (item) {
				return new ContainerViewModel(item);
			});
		});
	};

	var imageQuery = function (){
		Image.query({node: $scope.hostUrl}, function (d) {
			console.log(d);
			$scope.images = d.map(function (item) {
				return new ImageViewModel(item);
			});
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
						$scope.Nodes[0] = d['SystemStatus'][i];
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
					$scope.containerNames = d.map(function (item) {
              return containernameFilter(item);
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