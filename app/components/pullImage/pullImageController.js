angular.module('pullImage', [])
    .controller('PullImageController', ['$scope', '$log', 'Messages', 'Image', 'ViewSpinner', 'Swarm', 'ConsulPrimarySwarm', 'errorMsgFilter', 'Repositories',
        function ($scope, $log, Messages, Image, ViewSpinner, Swarm, ConsulPrimarySwarm, errorMsgFilter, Repositories) {
            $scope.template = 'app/components/pullImage/pullImage.html';
            $scope.searchResult = false;
            $scope.searchTagResult = false;
            $scope.swarmUrl = '';
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

            $scope.init = function () {
                $scope.config = {
                    selectedImage: '',
                    searchImage: '',
                    image: '',
                    tag: '',
                    node: ''
                };
            };

            $scope.init();

            function failedRequestHandler(e, Messages) {
                Messages.error('Error', errorMsgFilter(e));
            }

            $scope.searchDockerCont = function () {
                // Copy the config before transforming fields to the remote API format
                var config = angular.copy($scope.config);
                ViewSpinner.spin();
                Image.search({node: $scope.swarmUrl, term: config.searchImage}, function (d){
                    ViewSpinner.stop();
                    $scope.ImagesResult = [];
                    $scope.TagsResult = [];
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
                var splitUser = $scope.config.image.split("/");
                if (!splitUser[1]) {
                  imageName = 'library/' + $scope.config.image;
                } else {
                  imageName = $scope.config.image;
                }
                Repositories.get({image: imageName, n: 25}, function (d) {
                    $scope.TagsResult = [];
                    for (var i = 0; i < d.results.length; i++) {
                        $scope.TagsResult[i] = d.results[i];
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
                    (config.image) +
                    (config.tag ? ':' + config.tag : '');

                $('#pull-modal').modal('hide');
                Messages.send("Pull image started", imageName);
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
                            $scope.searchResult = false;
                        }
                    } else {
                        Messages.send("Image Added", imageName);
                        $scope.init();
                        $scope.searchResult = false;
                    }
                }, function (e) {
                    $scope.error = "Cannot pull image " + imageName + " Reason: " + e.data;
                    $('#pull-modal').modal('show');
                    $('#error-message').show();
                });
            };
        }]);
