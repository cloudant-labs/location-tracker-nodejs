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
    .value("trackingMapInitialized", false)
    .value("resultMapInitialized", false)


/* ROUTES */

.config(['$routeProvider', function($routeProvider) {

    $routeProvider.
    when('/location/welcome', {
        templateUrl: 'location-welcome.html'
    }).
    when('/location/tracking', {
        templateUrl: 'location-tracking.html',
        controller: 'locationTrackingController'
    }).
    when('/location/savedata', {
        templateUrl: 'location-savedata.html',
        controller: 'locationTrackingSaveDataController'
    }).
    when('/location/success', {
        templateUrl: 'location-success.html',
        controller: 'locationTrackingSuccessController'
    }).
    when('/location/error', {
        templateUrl: 'location-error.html',
        controller: 'locationTrackingErrorController'
    }).
    when('/map/map', {
        templateUrl: 'map.html',
        controller: 'mapResultController'
    }).
    otherwise({
        redirectTo: '/location/welcome'
    })

}])


/* location-tracking.html Controller */

.controller('locationTrackingController', function($scope, map, watchID, pouchLocal, num, trackingMapInitialized) {

    var osmUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
    var osmAttrib = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>';
    var osm = new L.TileLayer(osmUrl, {
        attribution: osmAttrib,
        id: 'examples.map-i875mjb7'
    });
    if (!trackingMapInitialized) {
        var map = new L.Map('map', {
            layers: [osm],
            zoom: 18,
            zoomControl: true
        });
        trackingMapInitialized = true;
    }
    var last_lon = 0;
    var last_lat = 0;
    var session_id = guid();
    var db = pouchLocal;

    // add location control to global name space for testing only
    // on a production site, omit the "lc = "!
    lc = L.control.locate({
        follow: true,
        strings: {
            title: "Show me where I am, yo!"
        }
    }).addTo(map);
    /* */

    map.on('startfollowing', function() {
        map.on('dragstart', lc._stopFollowing, lc);
    }).on('stopfollowing', function() {
        map.off('dragstart', lc._stopFollowing, lc);
    });

    if (navigator.geolocation) {
        console.log("Geolocation is available");
    } else {
        alert("Geolocation IS NOT available!");
        document.getElementById('starter').disabled = true;
    }

    function onLocationFound(e) {
        console.log("onLocationFound");
        var radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(map);
        lc.start();
    }

    function onLocationError(e) {
        console.log("onLocationError");
        alert("Rut ro... " + e.message);
    }

    function doWatch(position) {
        var lon = Number(Math.round(position.coords.longitude + 'e' + 4) + 'e-' + 4);
        var lat = Number(Math.round(position.coords.latitude + 'e' + 4) + 'e-' + 4);
        if ((lon == last_lon) && (lat == last_lat)) return null;

        last_lon = lon;
        last_lat = lat;
        var coord = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "session_id": session_id,
                "timestamp": position.timestamp
            }
        };

        db.post(coord, function callback(err, response) {
            if (err) {
                alert('POST ERROR: ' + err);
            }

            db.get(response.id, function callback(err, doc) {
                if (err) {
                    console.log('ERROR: ' + err);
                }

                console.log('GOT: ' + JSON.stringify(doc));
                $('.longitude-coordinate').text(doc.geometry.coordinates[0]);
                $('.latitude-coordinate').text(doc.geometry.coordinates[1]);
            });
        });
    }

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

    $('.longitude-coordinate, .latitude-coordinate').text("updating...");
    watchID = navigator.geolocation.watchPosition(doWatch, watchError);
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
    map.locate({
        setView: true,
        maxZoom: 20
    });
})

.controller('locationTrackingSaveDataController', function($scope, map, watchID, pouchLocal, pouchResult, successMessage, errorMessage) {

    navigator.geolocation.clearWatch(watchID);

    db = pouchLocal;

    setInterval(function() {
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

        console.log("replicate complete");

        setTimeout(function() {
            successMessage.docs_written = info.docs_written;
            successMessage.start_time = info.start_time;
            window.location = "#/location/success";
        }, 2000)

    }).on('error', function(err) {
        console.log('error replicating: ' + err);

        errorMessage = 'error replicating: ' + err;
        window.location = "#/location/success";
    });
})


.controller('locationTrackingSuccessController', function($scope, successMessage) {

    console.log("locationTrackingSuccessController");
    console.log(successMessage);

    $scope.docs_written = successMessage.docs_written;
    $scope.start_time = successMessage.start_time;
})

.controller('locationTrackingErrorController', function($scope, errorMessage) {

    console.log("locationTrackingErrorController");
    console.log(errorMessage);

    $scope.error_message = errorMessage;
})


.controller('mapResultController', function($scope, pouchResult, resultMapInitialized) {

        console.log("mapResultController");

        console.log(pouchResult);

        var db = pouchResult;
        db.changes({
            include_docs: true,
            live: true
        }).on('change', updateMovingLayer);

        if (!resultMapInitialized) {
            var mapResult = new L.Map('mapResult');
            resultMapInitialized = true;
        }

        L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: 'Map data &copy; ' +
                '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            detectRetina: true,
            id: 'examples.map-20v6611k'
        }).addTo(mapResult);

        var movementLayer = L.geoJson(null, {
            pointToLayer: function(feature, latlng) {
                markeroptions = {
                    icon: L.icon({
                        iconUrl: 'js/images/marker-icon.png',
                        iconRetinaUrl: 'js/images/marker-icon-2x.png',
                        iconSize: [25, 41],
                        iconAnchor: [10, 10],
                        shadowURL: 'js/images/marker-icon-shadow.png',
                        shadowRetinaURL: 'js/images/marker-icon-shadow-2x.png',
                        shadowSize: [41, 41],
                        shadowAnchor: [10, 10]
                    })
                }
                return L.marker(latlng, markeroptions);
            }
        }).addTo(mapResult);

        function updateMovingLayer(change) {
            if (!change.doc._deleted && change.doc.type == 'Feature') {
                movementLayer.addData(change.doc);
                mapResult.fitBounds(movementLayer.getBounds());
            }
        }
    })
    .factory('pouchLocal', [function() {
        var db = new PouchDB('localdb');
        return db;
    }])
    .factory('pouchResult', ["remotedb", function(remotedb) {
        var db = new PouchDB(remotedb);
        // TODO: This is a horrible hack, fix it
        // See if the user is logged in
        db.getSession().then(function(response) {
          if (!response.userCtx.name) {
            // User is not logged in, create a new user
            // TODO: Allow user to choose username and password
            var userId = 'user' + Math.floor((Math.random() * 1000) + 1).toString();
            var password = 'passw0rd';
            db.signup(userId, password, function (err, response) {
              if (!err) {
                db.login(userId, password);
              } else {
                if (err.name === 'conflict') {
                  // Username already exists
                  // TODO: Handle error
                } else if (err.name === 'forbidden') {
                  // Invalid username
                  // TODO: Handle error
                } else {
                  // Some other error
                  // TODO: Handle error
                }
              }
            });
          }
        });
        return db;
    }])


/* Directive used on controller items to allow for multiple trans in/out */

.directive('locationdirective', ['$animate', '$timeout',
    function($animate, $timeout) {
        console.log("directive");
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                console.log("directive 2");
                console.log(scope, element, attrs);
                $timeout(function() {

                    console.log('directive triggering inner animation');
                    $animate.addClass(element, 'anim-page-transition-js', function() {
                        console.log('animation complete!');
                    });

                }, 10);

            }
        }
    }
])

.animation('.anim-page-transition-js',
    function() {
        return {
            enter: function(element, done) {
                console.log('route enter animation triggered');

                var _element = $(element);
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
                            easing: "easeInOutQuad", //[0.670, 0.010, 0.090, 0.970],
                            duration: 1000 + (index * 200),
                            delay: 1000 + (index * 100),
                            queue: false,
                            complete: function(elements) {
                                console.log('enter complete', value);
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
                        easing: "easeInOutQuad", //[0.670, 0.010, 0.090, 0.970],
                        duration: 500,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            console.log('enter complete');
                            done();
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
                        easing: "easeInOutQuad", //[0.670, 0.010, 0.090, 0.970],
                        delay: 1500,
                        queue: false,
                        complete: function(elements) {
                            console.log('enter trans-button complete');
                            done();
                        }
                    });


            },
            leave: function(element, done) {
                console.log('route leave animation triggered');
                var _element = $(element);

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
                        easing: "easeInOutQuad", //[0.670, 0.010, 0.090, 0.970],
                        duration: 1500,
                        delay: 0,
                        complete: function(elements) {
                            console.log('leave trans-button complete');
                            done();
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
                            easing: "easeInOutQuad", //[0.670, 0.010, 0.090, 0.970],
                            duration: 1000 + (index * 200),
                            delay: (index * 100),
                            queue: false,
                            complete: function(elements) {
                                console.log('leave complete', value);
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
                        easing: "easeInOutQuad", //[0.670, 0.010, 0.090, 0.970],
                        duration: 1000,
                        delay: 1000,
                        queue: false,
                        // begin: function(elements) {}
                        complete: function(elements) {
                            console.log('leave complete');
                            $(element).remove();
                            done();
                        }
                    });
            }
        }
    }
);
