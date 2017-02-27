Colors = {};
Colors.names = {
    // aqua: "#00ffff",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    // black: "#000000",
    // blue: "#0000ff",
    brown: "#a52a2a",
    // cyan: "#00ffff",
    // darkblue: "#00008b",
    // darkcyan: "#008b8b",
    darkgrey: "#a9a9a9",
    darkgreen: "#006400",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkviolet: "#9400d3",
    fuchsia: "#ff00ff",
    gold: "#ffd700",
    green: "#008000",
    indigo: "#4b0082",
    khaki: "#f0e68c",
    // lightblue: "#add8e6",
    // lightcyan: "#e0ffff",
    lightgreen: "#90ee90",
    lightgrey: "#d3d3d3",
    lightpink: "#ffb6c1",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    magenta: "#ff00ff",
    maroon: "#800000",
    navy: "#000080",
    olive: "#808000",
    orange: "#ffa500",
    pink: "#ffc0cb",
    purple: "#800080",
    violet: "#800080",
    red: "#ff0000",
    // silver: "#c0c0c0",
    // white: "#ffffff",
    yellow: "#ffff00"
};

// create our angular app and inject ngAnimate and ui-router 
// =============================================================================
angular.module('locationTrackingApp', ['ngAnimate', 'ngRoute'])


/* VALUES */

.value("map", {})
    .value("watchID", null)
    .value("remotedb", window.location.origin + '/api/location-tracker')
    .value("num", 0)
    .value("successMessage", {})
    .value("errorMessage", "error")


/* ROUTES */

.config(['$routeProvider', function($routeProvider) {

    $routeProvider.
    when('/welcome', {
        templateUrl: 'welcome.html',
        controller: 'locationWelcomeController'
    }).
    when('/tracking', {
        templateUrl: 'tracking.html',
        controller: 'locationTrackingController'
    }).
    when('/savedata', {
        templateUrl: 'savedata.html',
        controller: 'locationTrackingSaveDataController'
    }).
    when('/success', {
        templateUrl: 'success.html',
        controller: 'locationTrackingSuccessController'
    }).
    when('/error', {
        templateUrl: 'error.html',
        controller: 'locationTrackingErrorController'
    }).
    when('/map', {
        templateUrl: 'map-result.html',
        controller: 'mapResultController'
    }).
    when('/sign-up', {
        templateUrl: 'sign-up.html',
        controller: 'locationSignUpController'
    }).
    when('/sign-in', {
        templateUrl: 'sign-in.html',
        controller: 'locationSignInController'
    }).
    otherwise({
        redirectTo: '/welcome'
    })

}])


/* sign-up.html Controller */
.controller('locationSignUpController', function($scope, $location, authService) {

    $scope.transEnter = function() {
        $('.sign-up-btn').on('click', function() {
            $('.sign-up-btn').attr('disabled', 'disabled');
            authService.signup($scope.login, $scope.password);
            $scope.$on('auth:updated', function() {
                $scope.$apply(function() {
                    if (authService.username) {
                        $location.path('/tracking');
                    } else {
                        // TODO: Better handle failed sign up
                        $('.sign-up-btn').removeAttr('disabled');
                        $scope.login = null;
                        $scope.password = null;
                    }
                });
            });
        });
    };
    $scope.transLeave = function() {};
})

/* sign-in.html Controller */
.controller('locationSignInController', function($scope, $location, authService) {

    $scope.transEnter = function() {
        $('.sign-in-btn').on('click', function() {
            $('.sign-in-btn').attr('disabled', 'disabled');
            authService.login($scope.login, $scope.password);
            $scope.$on('auth:updated', function() {
                $scope.$apply(function() {
                    if (authService.username) {
                        $location.path('/tracking');
                    } else {
                        // TODO: Better handle failed login up
                        $('.sign-in-btn').removeAttr('disabled');
                        $scope.login = null;
                        $scope.password = null;
                    }
                });
            });
        });
    }
    $scope.transLeave = function() {};
})

/* welcome.html Controller */
.controller('locationWelcomeController', function($scope, $location, authService) {
    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
    authService.getSession();
    $scope.username = authService.username;
    $scope.$on('auth:updated', function() {
        $scope.$apply(function() {
            $scope.username = authService.username;
        });
    });
})


/* tracking.html Controller */
.controller('locationTrackingController', function($scope, map, watchID, pouchLocal, num, authService) {

    /* VARS */
    var mapTracker; // map object
    var lc; // location control object
    var last_lon = 0;
    var last_lat = 0;
    //TODO: Deprecate session_id?
    var session_id = guid();
    var db = pouchLocal;
    var watchID = {}; //geolocation object holder

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transEnter = function() {
        if (navigator.geolocation) {

            /* vars to pass into leaflet map object */
            var osmUrl = 'https://{s}.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYnJhZGxleS1ob2x0IiwiYSI6IjAyNDM4Njc4MjY0MzFhODBiOTQ0NGJhNTAxMDVmNGZiIn0.4neomrdr6V2_UFEgj4WKfg';
            var osmAttrib = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="http://mapbox.com">Mapbox</a>';
            var osm = new L.TileLayer(osmUrl, {
                attribution: osmAttrib,
                id: 'mapbox.streets'
            });

            /* instantiate Leaflet tracking map */
            mapTracker = new L.Map('map', {
                layers: [osm],
                zoom: 18,
                zoomControl: true
            });

            /* Instantiate Leaflet Locate plugin */
            lc = L.control.locate({
                follow: true
            }).addTo(mapTracker);

            mapTracker.locate({
                setView: true
            });

            /* store geolocation in an object to */
            geoLoc = navigator.geolocation;
            var watchOptions = {
                maximumAge: 0,
                timeout: 10000,
                enableHighAccuracy: true
            };
            watchID = geoLoc.watchPosition(doWatch, watchError, watchOptions);

            /* leaflet events */
            mapTracker.on('locationfound', onLocationFound);
            mapTracker.on('startfollowing', function() {
                mapTracker.on('dragstart', lc._stopFollowing, lc);
            }).on('stopfollowing', function() {
                mapTracker.off('dragstart', lc._stopFollowing, lc);
            });
        } else {
            alert("Geolocation IS NOT available!");
        }
    };

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transLeave = function() {
        geoLoc.clearWatch(watchID);
        mapTracker.remove();
    };

    /* locationfound event handler */
    function onLocationFound(e) {
        var radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(mapTracker).bindPopup(
            '<span>Latitude&nbsp;&nbsp;</span>' + e.latlng.lat +
            '<br><span>Longitude&nbsp;&nbsp;</span>' + e.latlng.lng);
        lc.start();
    }

    /* geoLoc.watchPosition event handler */
    function doWatch(position) {
        var lon = Number(Math.round(position.coords.longitude + 'e' + 4) + 'e-' + 4);
        var lat = Number(Math.round(position.coords.latitude + 'e' + 4) + 'e-' + 4);
        if ((lon == last_lon) && (lat == last_lat)) return null;

        if (last_lon == 0) {
            last_lon = lon;
            last_lat = lat;
        }

        /* create points to connect (last and latest) */
        var pointA = new L.LatLng(last_lat, last_lon);
        var pointB = new L.LatLng(lat, lon);
        var pointList = [pointA, pointB];

        last_lon = lon;
        last_lat = lat;

        /* create line to connect points */
        var polyline = new L.Polyline(pointList, {
            color: '#e5603d',
            weight: 4,
            opacity: 0.64,
            smoothFactor: 1
        });
        polyline.addTo(mapTracker);

        /* data object to write to your NoSQL doc */
        var coord = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "username": authService.username,
                "session_id": session_id,
                "timestamp": position.timestamp
            }
        };

        /* POST object to db */
        db.post(coord, function callback(err, response) {
            if (err) {
                alert('PUT ERROR: ' + err);
            }

            /* get doc and update lat + lon text in the view */
            db.get(response.id, function callback(err, doc) {
                if (err) {
                    console.log('ERROR: ' + err);
                }
                $('.longitude-coordinate').text(doc.geometry.coordinates[0]);
                $('.latitude-coordinate').text(doc.geometry.coordinates[1]);
            });
        });
    }

    /* geoLoc.watchPosition event error handler */
    function watchError(err) {
        $('.longitude-coordinate, .latitude-coordinate').text("permission denied...");
        alert('Error' + err.code + ' msg: ' + err.message);
    }

    /**
     * Generates a GUID string.
     * @returns {String} The generated GUID.
     * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
     * @author Slavik Meltser (slavik@meltser.info).
     * @link http://slavik.meltser.info/?p=142
     */
    function guid() {
        function _p8(s) {
            var p = (Math.random().toString(16) + "000000000").substr(2, 8);
            return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    }
})


/* savedata.html Controller */
.controller('locationTrackingSaveDataController', function($scope, map, watchID, pouchLocal, pouchResult, successMessage, errorMessage) {

    var timer;

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transEnter = function() {
        navigator.geolocation.clearWatch(watchID);
        db = pouchLocal;

        timer = setInterval(function() {
            $(".dot-anim")
                .velocity("transition.slideUpBigIn", {
                    drag: true
                })
                .delay(750)
                .velocity({
                    opacity: 0
                }, 750)
        }, 2000);

        db.replicate.to(pouchResult).on('complete', function(info) {
            var timer = setTimeout(function() {
                successMessage.docs_written = info.docs_written;
                successMessage.start_time = info.start_time;
                window.location = "#/success";
            }, 2000)

        }).on('error', function(err) {
            errorMessage = 'error replicating: ' + err;
            window.location = "#/error";
        });
    };

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transLeave = function() {
        clearInterval(timer);
    };
})


.controller('locationTrackingSuccessController', function($scope, successMessage) {
    $scope.docs_written = successMessage.docs_written;
    $scope.start_time = successMessage.start_time;

    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
})


.controller('locationTrackingErrorController', function($scope, errorMessage) {
    $scope.error_message = errorMessage;

    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
})

.controller('mapResultController', function($scope, $location, pouchResult, authService) {
    var mapResult;

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transEnter = function() {
        var db = pouchResult;
        var _len;

        Colors.random = function() {
            var result;
            var count = 0;
            for (var prop in this.names)
                if (Math.random() < 1 / ++count)
                    result = prop;
            return result;
        };

        // TODO: Handle error
        db.find({
            selector: {'properties.username': {'$gte': ''}}
        }).then(function (result) {
            var usernames = {};
            result.docs.map(function(doc) {
                //TODO: Use a group_level query for this
                if (doc.properties && doc.properties.username) {
                    if (usernames[doc.properties.username]) {
                        usernames[doc.properties.username]++;
                    } else {
                        usernames[doc.properties.username] = 1;
                    }
                }
            });
            var userList = [];
            for (var username in usernames) {
                userList.push({
                    name: username,
                    color: Colors.random()
                });
            }
            $scope.names = userList;
            $scope.$apply();
            $('a.multi-users').on("click", function(event) {
                event.preventDefault();
                var username = $(this).text();
                // TODO: Improve how this is done
                if (!username) {
                    $('#multi-user-popup').show();
                    $('.click-blocker').show();
                    return;
                }

                // use Cloudant query to get results for a given user, then a run a loop to draw on the map
                // TODO: Handle error
                db.find({
                    selector: {'properties.username': {'$eq': username}},
                }).then(function (result) {
                    movementLayer = instantiateLeafletMap();
                    result.docs.map(function(doc) {
                        updateMovingLayer(doc, movementLayer);
                    });
                    $('.click-blocker').hide();
                    $('#multi-user-popup').hide();
                });
            });
        });

        function instantiateLeafletMap() {
            if (!mapResult) {
                /* instantiate Leaflet map */
                mapResult = new L.Map('mapResult');
            }

            L.tileLayer('https://{s}.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYnJhZGxleS1ob2x0IiwiYSI6IjAyNDM4Njc4MjY0MzFhODBiOTQ0NGJhNTAxMDVmNGZiIn0.4neomrdr6V2_UFEgj4WKfg', {
                maxZoom: 20,
                attribution: 'Map data &copy; ' +
                    '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
                detectRetina: true,
                id: 'mapbox.streets'
            }).addTo(mapResult);

            var last_lat = 0;
            var last_lon = 0;

            var movementLayer = L.geoJson(null, {
                pointToLayer: function(feature, latlng) {

                    // setup a default lat + lng coordinate
                    if (last_lat == 0) {
                        last_lat = latlng.lat;
                        last_lon = latlng.lng;
                    }

                    // we store coordinates so that we can have a start and end point, or pointA and pointB
                    var pointA = [last_lat, last_lon];
                    var pointB = [latlng.lat, latlng.lng];
                    var pointList = [pointA, pointB];

                    last_lat = latlng.lat;
                    last_lon = latlng.lng;

                    var firstpolyline = new L.Polyline(pointList, {
                        color: '#e5603d',
                        weight: 4,
                        opacity: 0.64,
                        smoothFactor: 1
                    });
                    firstpolyline.addTo(mapResult);

                    markeroptions = {
                        icon: L.icon({
                            iconUrl: 'script/images/marker-icon-blue.png',
                            iconRetinaUrl: 'script/images/marker-icon-blue-2x.png',
                            iconSize: [25, 41],
                            iconAnchor: [10, 41],
                            shadowURL: 'script/images/marker-icon-shadow.png',
                            shadowRetinaURL: 'script/images/marker-icon-shadow-2x.png',
                            shadowSize: [41, 41],
                            shadowAnchor: [10, 10]
                        })
                    }
                    return L.marker(latlng, markeroptions).bindPopup(
                        '<span>Latitude&nbsp;&nbsp;</span>' + latlng.lat +
                        '<br><span>Longitude&nbsp;&nbsp;</span>' + latlng.lng);
                }
            }).addTo(mapResult);
            return movementLayer;
        }

        function updateMovingLayer(doc, movementLayer) {
            movementLayer.addData(doc);
            mapResult.fitBounds(movementLayer.getBounds());
        }
    };

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transLeave = function() {
        mapResult.remove();
    };

    $scope.signOut = function() {
        authService.logout();
        $scope.$on('auth:updated', function() {
            $scope.$apply(function() {
                if (!authService.username) {
                    $location.path('/welcome');
                }
            });
        });
    };

})


/* local storage for tracking map */
.factory('pouchLocal', [function() {
    var db = new PouchDB('localdb');
    return db;
}])


/* cloudant db storage for result map */
.factory('pouchResult', ["remotedb", function(remotedb) {
    return new PouchDB(remotedb);
}])


/* cloudant authentication service */
.factory('authService', ['$rootScope', 'pouchResult', function($rootScope, pouchResult) {
    var authService = {};
    authService.getSession = function() {
        pouchResult.getSession().then(function(response) {
            if (response.userCtx.name) {
                authService.username = response.userCtx.name;
            } else {
                delete authService.username;
            }
            $rootScope.$broadcast('auth:updated');
        }).catch(function(err) {
            $rootScope.$broadcast('auth:updated');
        });
    };
    authService.signup = function(userId, password) {
        pouchResult.signup(userId, password).then(function(response) {
            pouchResult.login(userId, password).then(function(response) {
                authService.username = response.name;
                $rootScope.$broadcast('auth:updated');
            });
        }).catch(function(err) {
            $rootScope.$broadcast('auth:updated');
        });
    };
    authService.login = function(userId, password) {
        pouchResult.login(userId, password).then(function(response) {
            authService.username = response.name;
            $rootScope.$broadcast('auth:updated');
        }).catch(function(err) {
            $rootScope.$broadcast('auth:updated');
        });
    };
    authService.logout = function() {
        pouchResult.logout().then(function(response) {
            delete authService.username;
            $rootScope.$broadcast('auth:updated');
        }).catch(function(err) {
            $rootScope.$broadcast('auth:updated');
        });
    };
    return authService;
}])


/* Directive used on controller items to allow for multiple trans in/out */
.directive('animationdirective', ['$animate', '$timeout',
    function($animate, $timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {

                /* jquery button hovers added because clicks were sticking on mobile phone */
                $('.trans-button .btn').hover(
                    function() {
                        $(this).addClass('btnHover')
                    },
                    function() {
                        $(this).removeClass('btnHover')
                    }
                );

                $timeout(function() {
                    $animate.addClass(element, 'anim-page-transition-js');
                }, 10);
            }
        }
    }
])


/* animation module for running javascript transitions */
.animation('.anim-page-transition-js',
    function() {
        return {

            enter: function(element, done) {
                var _element = $(element);
                _element.addClass("visible");

                /* array of items to transition in sequentially */
                $.each([".trans-step1", ".trans-step2", ".trans-step3", ".trans-step4"], function(index, value) {
                    _element.find(value)
                        .velocity({
                            opacity: 0,
                            translateY: "+200px"
                        }, {
                            duration: 0
                        })
                        .velocity({
                            opacity: 1,
                            translateY: "0"
                        }, {
                            easing: "easeInOutQuad",
                            duration: 1000 + (index * 200),
                            delay: 1000 + (index * 100),
                            queue: false,
                            complete: function(elements) {
                                /**/
                            }
                        });
                });

                _element
                    .velocity({
                        opacity: 0,
                        translateY: "100%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 500,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            /* call transEnter function within the called element's controller*/
                            angular.element(_element).scope().transEnter();
                        }
                    });

                _element.find(".trans-button")
                    .velocity({
                        opacity: 0,
                        translateY: "+100%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        easing: "easeInOutQuad",
                        delay: 1500,
                        queue: false,
                        complete: function(elements) {
                            /**/
                        }
                    });
            },
            leave: function(element, done) {
                var _element = $(element);

                /* call transLeave function within the called element's controller*/
                angular.element(_element).scope().transLeave();

                _element.find(".trans-button")
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 0,
                        translateY: "+100%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 1500,
                        delay: 0,
                        complete: function(elements) {
                            /**/
                        }
                    });

                $.each([".trans-step1", ".trans-step2", ".trans-step3", ".trans-step4"], function(index, value) {
                    _element.find(value)
                        .velocity({
                            opacity: 1,
                            translateY: "0"
                        }, {
                            duration: 0
                        })
                        .velocity({
                            opacity: 0,
                            translateY: "-200px"
                        }, {
                            easing: "easeInOutQuad",
                            duration: 1000 + (index * 200),
                            delay: (index * 100),
                            queue: false,
                            complete: function(elements) {
                                /**/
                            }
                        });
                });

                _element
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 0,
                        translateY: "-100%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 1000,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            /**/
                            $(element).remove();
                        }
                    });
            }
        }
    }
);
