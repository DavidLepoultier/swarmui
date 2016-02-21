angular.module('dashboard', [])
.controller('DashboardController', ['$scope', 'Container', 'Image', 'Settings', 'LineChart', 'ConsulPrimarySwarm', 'Swarm',
  function ($scope, Container, Image, Settings, LineChart, ConsulPrimarySwarm, Swarm) {
  $scope.predicate = '-Created';

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

    var cx = canvas.width / 4;
    var cy = canvas.height / 4;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 50px Helvetica Neue';
    ctx.fillStyle = '#9AA1AA';
    ctx.fillText(total, cx, cy);
  }

  var opts = {
    animation: false,
    responsive: true
  };

  ConsulPrimarySwarm.get({}, function (d){
    var url = atob(d[0].Value);
    Container.query({all: 1, node: url}, function (d) {
        var running = 0;
        var ghost = 0;
        var stopped = 0;
        
        for (var i = 0; i < d.length; i++) {
            var item = d[i];

            if (item.Status === "Ghost") {
                ghost += 1;
            } else if (item.Status.indexOf('Exit') !== -1) {
                stopped += 1;
            } else {
                running += 1;
            }
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
            }, // stopped
            {
                value: ghost,
                color: '#E2EAE9',
                title: 'Ghost'
            } // ghost
        ];

        c.Doughnut(data, opts);
        var lgd = $('#containers-chart-legend').get(0);
        legend(lgd, data);
        addText('containers-chart', d.length);
    });
    Image.query({all: 1, node: url}, function (d) {
      var tags = 0;
      var untags = 0;
      
      for (var i = 0; i < d.length; i++) {
          var item = d[i];
          if (item.RepoTags[0].indexOf('none') !== -1) {
              untags += 1;
          } else {
              tags += 1;
          }
      }

      var c = new Chart($('#images-chart').get(0).getContext("2d"));
      var data = [
          {
              value: tags,
              color: '#5bb75b',
              title: 'Images Tagged'
          },
          {
              value: untags,
              color: '#E2EAE9',
              title: 'Images Untagged'
          }
      ];

      c.Doughnut(data, opts);
      var lgd = $('#images-chart-legend').get(0);
      legend(lgd, data);
      addText('images-chart', d.length);
    });
    Swarm.info({node: url}, function (d) {
      var running = 0;
      var stopped = 0;
      var reserveCpu = 0;
      var reserveMemory = 0;
      var totalCpu = 0;
      var totalMemory = 0;
      var k = 7;
      var l = 8;
      var j = 0;
      for (var i = 5; i < d['SystemStatus'].length;i += 8){
        if (d['SystemStatus'][i][1] === 'Healthy'){
          running += 1;
        } else {
          stopped += 1;
        }
        rCpu = d['SystemStatus'][k][1].split(" ");
        reserveCpu = parseInt(reserveCpu, 10) + parseInt(rCpu[0], 10);
        totalCpu = parseInt(totalCpu, 10) + parseInt(rCpu[2], 10);
        rMemory = d['SystemStatus'][l][1].split(" ");
        reserveMemory = parseInt(reserveMemory, 10) + parseInt(rMemory[0], 10);
        totalMemory = parseInt(totalMemory, 10) + parseInt(rMemory[3], 10);
        k += 8;
        l += 8;
        j++;
      }
      var unReserveCpu = totalCpu - reserveCpu;
      var unReserveMemory = totalMemory - reserveMemory;
      var c = new Chart($('#hosts-chart').get(0).getContext("2d"));
      var m = new Chart($('#hosts-memroy-chart').get(0).getContext("2d"));
      var o = new Chart($('#hosts-cpu-chart').get(0).getContext("2d"));

      var data = [
          {
              value: running,
              color: '#5bb75b',
              title: 'Running'
          },
          {
              value: stopped,
              color: '#C7604C',
              title: 'Stopped'
          }
      ];
      var dataMemory = [
          {
              value: reserveMemory,
              color: '#5bb75b',
              title: 'Reserve Memory'
          },
          {
              value: unReserveMemory,
              color: '#E2EAE9',
              title: 'Unreserve Memory'
          }
      ];
      var dataCpu = [
          {
              value: reserveCpu,
              color: '#5bb75b',
              title: 'Reserve Cpu'
          },
          {
              value: unReserveCpu,
              color: '#E2EAE9',
              title: 'Unreserve Cpu'
          }
      ];
      c.Doughnut(data, opts);
      m.Doughnut(dataMemory, opts);
      o.Doughnut(dataCpu, opts);

      var lgdh = $('#hosts-chart-legend').get(0);
      var lgdc = $('#hosts-cpu-chart-legend').get(0);
      var lgdm = $('#hosts-memory-chart-legend').get(0);
      legend(lgdh, data);
      legend(lgdc, dataCpu);
      legend(lgdm, dataMemory);
      addText('hosts-chart', j);
      addText('hosts-memroy-chart', totalMemory);
      addText('hosts-cpu-chart', totalCpu);
    });
  });
}]);
