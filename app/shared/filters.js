angular.module('swarmui.filters', [])
    .filter('truncate', function () {
        'use strict';
        return function (text, length, end) {
            if (isNaN(length)) {
                length = 10;
            }

            if (end === undefined) {
                end = '...';
            }

            if (text.length <= length || text.length - end.length <= length) {
                return text;
            }
            else {
                return String(text).substring(0, length - end.length) + end;
            }
        };
    })
    .filter('statusbarTask', function () {
        'use strict';
        return function (text) {
            switch(text){
                case 'success':
                    return 'success';
                case 'starting':
                    return 'striped active';
                case 'failed':
                    return 'danger';
                case 'canceled':
                    return 'warning';
                case 'waiting':
                    return 'warning';
            }
        };
    })
    .filter('statusBadge', function () {
        'use strict';
        return function (text) {
            if (text === 'Ghost') {
                return 'important';
            } else if (text.indexOf('Exit') !== -1 && text !== 'Exit 0') {
                return 'warning';
            }
            return 'success';
        };
    })
    .filter('statusInverseBadge', function () {
        'use strict';
        return function (text) {
            if (text === 'Ghost') {
                return 'important';
            } else if (text.indexOf('Exit') !== -1 && text !== 'Exit 0') {
                return 'success';
            }
            return 'danger';
        };
    })
    .filter('statusIconsStartStop', function () {
        'use strict';
        return function (text) {
            if (text === 'Ghost') {
                return 'glyphicon glyphicon-off';
            } else if (text.indexOf('Exit') !== -1 && text !== 'Exit 0') {
                return 'glyphicon glyphicon-play';
            }
            return 'glyphicon glyphicon-off';
        };
    })
    .filter('statusButtonActive', function () {
        'use strict';
        return function (text) {
            if (text === 'unknown') {
                return 'disabled';
            } 
            return '';
        };
    })
    .filter('statusbadgeNode', function () {
        'use strict';
        return function (text) {
            if (text === 'Unknown') {
                return 'important';
            } 
            return 'success';
        };
    })
    .filter('statusbadgeOnAlarm', function () {
        'use strict';
        return function (text) {
            if (text === '1') {
                return 'btn-default';
            } 
            return 'btn-success active';
        };
    })
    .filter('statusbadgeOffAlarm', function () {
        'use strict';
        return function (text) {
            if (text === '1') {
                return 'btn-danger active';
            } 
            return 'btn-default';
        };
    })
    .filter('getstatetext', function () {
        'use strict';
        return function (state) {
            if (state === undefined) {
                return '';
            }
            if (state.Ghost && state.Running) {
                return 'Ghost';
            }
            if (state.Running && state.Paused) {
                return 'Running (Paused)';
            }
            if (state.Running) {
                return 'Running';
            }
            return 'Stopped';
        };
    })
    .filter('getstatelabel', function () {
        'use strict';
        return function (state) {
            if (state === undefined) {
                return 'label-default';
            }

            if (state.Ghost && state.Running) {
                return 'label-important';
            }
            if (state.Running) {
                return 'label-success';
            }
            return 'label-default';
        };
    })
    .filter('humansize', function () {
        'use strict';
        return function (bytes) {
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) {
                return 'n/a';
            }
            var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
            var value = bytes / Math.pow(1024, i);
            var decimalPlaces = (i < 1) ? 0 : (i - 1);
            return value.toFixed(decimalPlaces) + ' ' + sizes[[i]];
        };
    })
    .filter('containerShortId', function () {
        'use strict';
        return function (text) {
            return text.substring(0, 12) + "...";
        };
    })
    .filter('imageShortId', function () {
        'use strict';
        return function (text) {
            return text.substring(0, 12) + "...";
        };
    })
    .filter('containername', function () {
        'use strict';
        return function (container) {
            var name = container.Names[0].split("/");
            return name[2];
        };
    })
    .filter('nodename', function () {
        'use strict';
        return function (container) {
            var name = container.Names[0].split("/");
            return name[1];
        };
    })
    .filter('repotag', function () {
        'use strict';
        return function (image) {
            if (image.RepoTags && image.RepoTags.length > 0) {
                var tag = image.RepoTags[0];
                if (tag === '<none>:<none>') {
                    tag = '';
                }
                return tag;
            }
            return '';
        };
    })
    .filter('getdate', function () {
        'use strict';
        return function (data) {
            var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            var language = navigator.browserLanguage;
            //Multiply by 1000 for the unix format
            var date = new Date(data);
            return date.toLocaleDateString(language, options);
        };
    })
    .filter('errorMsg', function () {
        return function (object) {
            var idx = 0;
            var msg = '';
            while (object[idx] && typeof(object[idx]) === 'string') {
                msg += object[idx];
                idx++;
            }
            return msg;
        };
    });
