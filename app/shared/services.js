angular.module('swarmui.services', ['ngResource'])
  .factory('Roles', function ContainerFactory($resource) {
    'use strict';
    return $resource('/Ansible/ansible_roles.json', {}, {
        get: {method: 'GET', isArray: true}
    });
  })
  .factory('Playbooks', function ContainerFactory($resource) {
    'use strict';
    return $resource('/Ansible/ansible_playbooks.json', {}, {
        get: {method: 'GET', isArray: true}
    });
  })
  .factory('ConsulPrimarySwarm', ['$resource', 'SettingsConsul', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#2-1-containers
    return $resource(Settings.url + '/v1/kv/docker/swarm/leader', {
        node: '@name'
    }, {
        get: {method: 'GET', isArray: true}
    });
  }])
  .factory('Swarm', ['$resource', 'Settings', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#2-1-containers
    return $resource(Settings.url + '/:node/:action', {
      name: '@name'
    }, {
      info: {method: 'GET', params: {action: 'info'}}
    });
  }])
  .factory('Container', ['$resource', 'Settings', function ContainerFactory($resource, Settings) {
    'use strict';
    // Resource for interacting with the docker containers
    // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#2-1-containers
    return $resource(Settings.url + '/:node/containers/:id/:action', {
      name: '@name'
    }, {
      query: {method: 'GET', params: {node: '@node', all: 0, action: 'json'}, isArray: true},
      get: {method: 'GET', params: {node: '@node', action: 'json'}},
      actionCont: {method: 'POST', params: {id: '@id', node: '@node', t: 5, action: '@action'}},
      changes: {method: 'GET', params: {node: '@node', action: 'changes'}, isArray: true},
      create: {method: 'POST', params: {node: '@SwarmHost', action: 'create'}},
      remove: {method: 'DELETE', params: {id: '@id', node: '@node', v: 0}},
      rename: {method: 'POST', params: {id: '@id', node: '@node', action: 'rename'}, isArray: false},
      top: {method: 'GET', params: {id: '@id', node: '@node', ps_args: '@ps_args', action: 'top'}},
      stats: {method: 'GET', params: {id: '@id', node: '@node', stream: false, action: 'stats'}, timeout: 5000}
    });
  }])
  .factory('ContainerCommit', ['$resource', '$http', 'Settings', function ContainerCommitFactory($resource, $http, Settings) {
    'use strict';
    // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#create-a-new-image-from-a-container-s-changes
    return {
      commit: function (params, callback) {
        $http({
          method: 'POST',
          url: Settings.url + '/:node/commit',
          params: {
            'container': params.id,
            'repo': params.repo
          }
        }).success(callback).error(function (data, status, headers, config) {
          console.log(error, data);
        });
      }
    };
  }])
  .factory('ContainerLogs', ['$resource', '$http', 'Settings', function ContainerLogsFactory($resource, $http, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#get-container-logs
      return {
          get: function (id, node, params, callback) {
              $http({
                  method: 'GET',
                  url: Settings.url + '/' + node + '/containers/' + id + '/logs',
                  params: {
                      'stdout': params.stdout || 0,
                      'stderr': params.stderr || 0,
                      'timestamps': params.timestamps || 0,
                      'tail': params.tail || 'all'
                  }
              }).success(callback).error(function (data, status, headers, config) {
                  console.log(error, data);
              });
          }
      };
  }])
  .factory('Image', ['$resource', 'Settings', function ImageFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#2-2-images
      return $resource(Settings.url + '/:node/images/:id/:action', {}, {
          query: {method: 'GET', params: {all: 0, action: 'json'}, isArray: true},
          get: {method: 'GET', params: {action: 'json'}},
          search: {method: 'GET', params: {node: '@node', action: 'search', term: '@term'}, isArray: true},
          history: {method: 'GET', params: {action: 'history'}, isArray: true},
          create: {
              method: 'POST', isArray: true, transformResponse: [function f(data) {
                  var str = data.replace(/\n/g, " ").replace(/\}\W*\{/g, "}, {");
                  return angular.fromJson("[" + str + "]");
              }],
              params: {node: '@node', action: 'create', fromImage: '@image', repo: '@repo', tag: '@tag', registry: '@registry'}
          },
          insert: {method: 'POST', params: {id: '@id', action: 'insert'}},
          push: {method: 'POST', params: {id: '@id', action: 'push'}},
          tag: {method: 'POST', params: {id: '@id', node: '@node', action: 'tag', force: 0, repo: '@repo', tag: '@tag'}},
          remove: {method: 'DELETE', params: {id: '@id', node: '@node'}, isArray: true}
      });
  }])
  .factory('Repositories', ['$resource', 'SettingsRepo', function ImageFactory($resource, SettingsRepo) {
      'use strict';
      return $resource(SettingsRepo.url + '/hub.docker.com/v2/repositories/:image/tags', {}, {
        get: {method: 'GET', params: {image: '@image'}}
      });
  }])
  .factory('Version', ['$resource', 'Settings', function VersionFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#show-the-docker-version-information
      return $resource(Settings.url + '/:node/version', {}, {
          get: {method: 'GET', params: {node: '@node'}}
      });
  }])
  .factory('Auth', ['$resource', 'Settings', function AuthFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#check-auth-configuration
      return $resource(Settings.url + '/auth', {}, {
          get: {method: 'GET'},
          update: {method: 'POST'}
      });
  }])
  .factory('Info', ['$resource', 'Settings', function InfoFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#display-system-wide-information
      return $resource(Settings.url + '/info', {}, {
          get: {method: 'GET'}
      });
  }])
  .factory('Network', ['$resource', 'Settings', function NetworkFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#2-5-networks
      return $resource(Settings.url + '/networks/:id/:action', {id: '@id'}, {
          query: {method: 'GET', isArray: true},
          get: {method: 'GET'},
          create: {method: 'POST', params: {action: 'create'}},
          remove: {method: 'DELETE'},
          connect: {method: 'POST', params: {action: 'connect'}},
          disconnect: {method: 'POST', params: {action: 'disconnect'}}
      });
  }])
  .factory('Volume', ['$resource', 'Settings', function VolumeFactory($resource, Settings) {
      'use strict';
      // http://docs.docker.com/reference/api/docker_remote_api_<%= remoteApiVersion %>/#2-5-networks
      return $resource(Settings.url + '/volumes/:name/:action', {name: '@name'}, {
          query: {method: 'GET'},
          get: {method: 'GET'},
          create: {method: 'POST', params: {action: 'create'}},
          remove: {method: 'DELETE'}
      });
  }])
  .factory('SettingsConsul', ['CONSUL_ENDPOINT', function SettingsFactory(CONSUL_ENDPOINT) {
      'use strict';
      var url = CONSUL_ENDPOINT;
      var firstLoad = (localStorage.getItem('firstLoad') || 'true') === 'true';
      return {
          displayAll: false,
          endpoint: CONSUL_ENDPOINT,
          url: url,
          firstLoad: firstLoad
      };
  }])
  .factory('SettingsRepo', ['DOCKERREPO_ENDPOINT', function SettingsFactory(DOCKERREPO_ENDPOINT) {
    'use strict';
    var url = DOCKERREPO_ENDPOINT;
    var firstLoad = (localStorage.getItem('firstLoad') || 'true') === 'true';
    return {
        displayAll: false,
        endpoint: DOCKERREPO_ENDPOINT,
        url: url,
        firstLoad: firstLoad
    };
  }])
  .factory('Settings', ['DOCKER_ENDPOINT', 'DOCKER_PORT', 'UI_VERSION', function SettingsFactory(DOCKER_ENDPOINT, DOCKER_PORT, UI_VERSION) {
      'use strict';
      var url = DOCKER_ENDPOINT;
      if (DOCKER_PORT) {
          url = url + DOCKER_PORT + '\\' + DOCKER_PORT;
      }
      var firstLoad = (localStorage.getItem('firstLoad') || 'true') === 'true';
      return {
          displayAll: false,
          endpoint: DOCKER_ENDPOINT,
          uiVersion: UI_VERSION,
          url: url,
          firstLoad: firstLoad
      };
  }])
  .factory('ViewSpinner', function ViewSpinnerFactory() {
      'use strict';
      var spinner = new Spinner();
      var target = document.getElementById('view');

      return {
          spin: function () {
              spinner.spin(target);
          },
          stop: function () {
              spinner.stop();
          }
      };
  })
  .factory('Messages', ['$rootScope', function MessagesFactory($rootScope) {
      'use strict';
      return {
          send: function (title, text) {
              $.gritter.add({
                  title: title,
                  text: text,
                  time: 2000,
                  before_open: function () {
                      if ($('.gritter-item-wrapper').length === 3) {
                          return false;
                      }
                  }
              });
          },
          error: function (title, text) {
              $.gritter.add({
                  title: title,
                  text: text,
                  time: 10000,
                  before_open: function () {
                      if ($('.gritter-item-wrapper').length === 4) {
                          return false;
                      }
                  }
              });
          }
      };
  }])
  .factory('LineChart', ['Settings', function LineChartFactory(Settings) {
      'use strict';
      return {
          build: function (id, data, getkey) {
              var chart = new Chart($(id).get(0).getContext("2d"));
              var map = {};

              for (var i = 0; i < data.length; i++) {
                  var c = data[i];
                  var key = getkey(c);

                  var count = map[key];
                  if (count === undefined) {
                      count = 0;
                  }
                  count += 1;
                  map[key] = count;
              }

              var labels = [];
              data = [];
              var keys = Object.keys(map);
              var max = 1;

              for (i = keys.length - 1; i > -1; i--) {
                  var k = keys[i];
                  labels.push(k);
                  data.push(map[k]);
                  if (map[k] > max) {
                      max = map[k];
                  }
              }
              var steps = Math.min(max, 10);
              var dataset = {
                  fillColor: "rgba(151,187,205,0.5)",
                  strokeColor: "rgba(151,187,205,1)",
                  pointColor: "rgba(151,187,205,1)",
                  pointStrokeColor: "#fff",
                  data: data
              };
              chart.Line({
                      labels: labels,
                      datasets: [dataset]
                  },
                  {
                      scaleStepWidth: Math.ceil(max / steps),
                      pointDotRadius: 1,
                      scaleIntegersOnly: true,
                      scaleOverride: true,
                      scaleSteps: steps
                  });
          }
      };
  }]);
