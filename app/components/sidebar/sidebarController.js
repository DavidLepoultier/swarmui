angular.module('sidebar', [])
    .controller('SideBarController', ['$scope', 'Container', 'Settings',
        function ($scope, Container, Settings) {
            $scope.containers = [];
            $scope.endpoint = Settings.endpoint;

            Container.query({all: 0}, function (d) {
                $scope.containers = d;
            });
        }]);
