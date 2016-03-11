angular.module('pullImage', [])
    .controller('PullImageController', ['$scope', '$log', 'Messages', 'Image', 'ViewSpinner', 'Swarm', 'ConsulPrimarySwarm', 'errorMsgFilter', 'Repositories',
        function ($scope, $log, Messages, Image, ViewSpinner, Swarm, ConsulPrimarySwarm, errorMsgFilter, Repositories) {
            $scope.template = 'app/components/pullImage/pullImage.html';
            $scope.searchResult = false;
            $scope.searchTagResult = false;
            $scope.swarmUrl = '';
            $scope.selected = [];
            $scope.Nodes = [];
            $scope.ImagesResult = [];
            $scope.TagsResult = [];

            ConsulPrimarySwarm.get({}, function (d){
              $scope.swarmUrl = atob(d[0].Value); 
              Swarm.info({node: $scope.swarmUrl}, function (d) {
                var n = 0;
                for (var i = 4; i < d['SystemStatus'].length;i += 8) {
                  $scope.Nodes[n] = d['SystemStatus'][i];
                  n++;
                }
              });
            });

            $scope.config = {
                registry: '',
                repo: '',
                searchImage: '',
                fromImage: '',
                tag: 'latest'
            };


            function failedRequestHandler(e, Messages) {
                Messages.error('Error', errorMsgFilter(e));
            }

            $scope.searchDockerCont = function () {
                // Copy the config before transforming fields to the remote API format
                var config = angular.copy($scope.config);
                ViewSpinner.spin();
                // Set Swarm Manager Host
                config.SwarmHost = $scope.swarmUrl;
                Image.search({node: config.SwarmHost, term: config.searchImage}, function (d){
                    ViewSpinner.stop();
                    for (var i = 0; i < d.length; i++) {
                        $scope.ImagesResult[i] = d[i].name;
                    }
                    $scope.searchResult = true;
                }, function (e) {
                    ViewSpinner.stop();
                });

            };

            $scope.getRepositoriesTags = function() {
                ViewSpinner.spin();
                var splitUser = $scope.selected.Image.split("/");
                console.log('splituser: ' + splitUser[1]);
                if (!splitUser[1]) {
                  imageName = 'library/' + $scope.selected.Image;
                } else {
                  imageName = $scope.selected.Image;
                }
                Repositories.get({image: imageName, n: 25}, function (d) {
                    for (var i = 0; i < d.results.length; i++) {
                        $scope.TagsResult[i] = d.results[i].name;
                    }
                    ViewSpinner.stop();
                    $scope.searchTagResult = true;
                }, function (e) {
                    ViewSpinner.stop();
                });
            };

            $scope.pull = function () {
                $('#error-message').hide();
                var config = angular.copy($scope.config);
                var imageName = (config.registry ? config.registry + '/' : '' ) +
                    (config.repo ? config.repo + '/' : '') +
                    (config.fromImage) +
                    (config.tag ? ':' + config.tag : '');

                ViewSpinner.spin();
                $('#pull-modal').modal('hide');
                Image.create(config, function (data) {
                    ViewSpinner.stop();
                    if (data.constructor === Array) {
                        var f = data.length > 0 && data[data.length - 1].hasOwnProperty('error');
                        //check for error
                        if (f) {
                            var d = data[data.length - 1];
                            $scope.error = "Cannot pull image " + imageName + " Reason: " + d.error;
                            $('#pull-modal').modal('show');
                            $('#error-message').show();
                        } else {
                            Messages.send("Image Added", imageName);
                            $scope.init();
                        }
                    } else {
                        Messages.send("Image Added", imageName);
                        $scope.init();
                    }
                }, function (e) {
                    ViewSpinner.stop();
                    $scope.error = "Cannot pull image " + imageName + " Reason: " + e.data;
                    $('#pull-modal').modal('show');
                    $('#error-message').show();
                });
            };
        }]);
