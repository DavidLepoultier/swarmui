angular.module('tasks', [])
.controller('TasksController', ['$scope', '$routeParams', '$location', 'ConsulTasks', 'SettingsConsul', 'Messages', '$timeout',
  function ($scope, $routeParams, $location, ConsulTasks, SettingsConsul, Messages, $timeout) {
    $scope.template = 'app/components/tasks/tasks.html';
    $scope.consulTasks = [];

    ConsulTasks.query({recurse: 1}, function (d) {
      for (var i = d.length - 1; i >= 0; i--) {
        var item = d[i];  
        var values = [];
        values = JSON.parse(atob(item.Value));
        $scope.consulTasks.push(new ConsulTasksModel(values));
      }
    });

  }]);
