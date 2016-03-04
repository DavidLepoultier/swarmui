angular.module('footer', [])
  .controller('FooterController', ['$scope', 'Settings', 'Version', 'ConsulPrimarySwarm', function ($scope, Settings, Version, ConsulPrimarySwarm) {
    $scope.template = 'app/components/footer/statusbar.html';

    $scope.uiVersion = Settings.uiVersion;
    ConsulPrimarySwarm.get({}, function (d){
			var url = atob(d[0].Value); 
			Version.get({node: url}, function (d) {
				$scope.apiVersion = d.ApiVersion;
				$scope.swarmVersion = d.Version;
			});
    });
  }]);
