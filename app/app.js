angular.module('swarmui', [
    'swarmui.templates',
    'ngRoute',
    'swarmui.services',
    'swarmui.filters',
    'masthead',
    'dashboard',
    'dashboardContainers',
    'dashboardImages',
    'container',
    'image',
    'startContainer',
    'hosts',
    'wrapperHosts',
    'wrapperDashboard',
    'tasks',
    'tasksHosts',
    'tasksDashboard'])
    .config(['$routeProvider', function ($routeProvider) {
        'use strict';
        $routeProvider.when('/', {
            templateUrl: 'app/components/dashboard/dashboard.html',
            controller: 'DashboardController'
        });
        $routeProvider.when('/:from/images/', {
            templateUrl: 'app/components/dashboardImages/dashboardImages.html',
            controller: 'DashboardImagesController'
        });
        $routeProvider.when('/:from/images/:id/', {
            templateUrl: 'app/components/image/image.html',
            controller: 'ImageController'
        });
        $routeProvider.when('/dashboard/containers/', {
            templateUrl: 'app/components/dashboardContainers/dashboardContainers.html',
            controller: 'DashboardContainersController'
        });
        $routeProvider.when('/:from/:node/containers/:id/', {
            templateUrl: 'app/components/container/container.html',
            controller: 'ContainerController'
        });
        $routeProvider.when('/:from/:node/containers/:containerId/image/:id/', {
            templateUrl: 'app/components/image/image.html',
            controller: 'ImageController'
        });
        $routeProvider.when('/dashboard/tasks/', {
            templateUrl: 'app/components/tasks/tasksDashboard.html',
            controller: 'TasksDashboardController'
        });
        $routeProvider.when('/hosts/', {
            templateUrl: 'app/components/hosts/hosts.html',
            controller: 'HostsController'
        });
        $routeProvider.when('/hosts/tasks/', {
            templateUrl: 'app/components/tasks/tasksHosts.html',
            controller: 'TasksHostsController'
        });
        $routeProvider.otherwise({redirectTo: '/'});
    }])
    // This is your docker url that the api will use to make requests
    // You need to set this to the api endpoint without the port i.e. http://192.168.1.9
    .constant('CONSUL_ENDPOINT', 'consulapi')
    .constant('DOCKER_ENDPOINT', 'swarmuiapitls')
    .constant('DOCKER_PORT', '') // Docker port, leave as an empty string if no port is requred.  If you have a port, prefix it with a ':' i.e. :4243
    .constant('UI_VERSION', 'v0.1.0-alpha');
