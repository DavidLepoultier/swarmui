angular.module('dashboard', [])
.controller('DashboardController', ['$scope', 'Container', 'Image', 'Settings', 'LineChart', 'ConsulPrimarySwarm', 'ConsulSolerni', 'Swarm',
  function ($scope, Container, Image, Settings, LineChart, ConsulPrimarySwarm, ConsulSolerni, Swarm) {
  $scope.predicate = '-Created';
  $scope.dashboard = '1';

  $scope.wrapperDash = function() {
      $('#wrapper').toggleClass('active');
  };

  var getStarted = function (data) {
      $scope.totalContainers = data.length;
      LineChart.build('#containers-started-chart', data, function (c) {
          return new Date(c.Created * 1000).toLocaleDateString();
      });
      var s = $scope;
      Image.query({}, function (d) {
          s.totalImages = d.length;
          LineChart.build('#images-created-chart', d, function (c) {
              return new Date(c.Created * 1000).toLocaleDateString();
          });
      });
  };

  function addText(d, total) {
    var canvas = document.getElementById(d);
    var ctx = document.getElementById(d).getContext("2d");
    var cx = '';
    var cy = '';

    switch(screen.availWidth){
        case 1280:
          cx = canvas.width / 4;
          cy = canvas.height / 4;
          break;
        default:
          cx = canvas.width / 2;
          cy = canvas.height / 2;
          break;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 2em Helvetica Neue';
    ctx.fillStyle = '#000';
    ctx.fillText(total, cx, cy);
  }

  var opts = {
    animation: false,
    responsive: true
  };

  var getActiveMooc =  ConsulSolerni.getActiveMooc({}, function (d){});

  ConsulPrimarySwarm.get({}, function (d){
    var url = atob(d[0].Value);
    var activeMooc = atob(getActiveMooc[0].Value);
    Container.get({node: url, id: activeMooc}, function (d) {
        var running = 0;
        var created = 0;
        var stopped = 0;
        
        if (d.State.Status === '') {
            created += 1;
        } else if (d.State.Status.indexOf('exit') !== -1) {
            stopped += 1;
        } else {
            running += 1;
        }

        var c = new Chart($('#containers-chart').get(0).getContext("2d"));
        var data = [
            {
                value: running,
                color: '#5bb75b',
                title: 'Running'
            }, // running
            {
                value: stopped,
                color: '#C7604C',
                title: 'Stopped'
            } // stopped
        ];

        c.Doughnut(data, opts);
        var lgd = $('#containers-chart-legend').get(0);
        legend(lgd, data);
        addText('containers-chart', d.Name.split('/')[1]);
    });
    Image.query({node: url}, function (d) {
      var tags = 0;
      var untags = 0;
      
      for (var i = 0; i < d.length; i++) {
          var item = d[i];
          if (item.RepoTags[0].indexOf('mooc') !== -1) {
              tags += 1;
          } 
      }

      var c = new Chart($('#images-chart').get(0).getContext("2d"));
      var data = [
          {
              value: tags,
              color: '#5bb75b',
              title: 'Mooc Tagged'
          }
      ];

      c.Doughnut(data, opts);
      addText('images-chart', tags);
    });
  });
}]);
