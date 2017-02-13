(function () {
    define(["jQuery", "kendo"], function (jQuery, kendo) {

        var course = null; // deprecated
        var coursePrev = null; // deprecated
        var map = null; // dperecated

        var mapCollection = [];

       /* function map(map, div, course) {
            this.map = map;
            this.div = div;
            this.course = course;
            this.overlay = null;
            this.entities = [];
        };*/

        var mapOptions = {
            credentials: "AphaWn396J8Pk2qM-h8UxAIomRC0lrGxm8GZQ-HiGHXjb83d0Uiwdw43xmokokJb",
            mapTypeId: Microsoft.Maps.MapTypeId.aerial,
        };

        return {
            createMap: function (mapDiv, courseArray, viewRect) {

                var nMap = new Object();

                nMap.map = new Microsoft.Maps.Map(document.getElementById(mapDiv), mapOptions);
                nMap.div = mapDiv;
                nMap.pins = [];

                if (courseArray != null) {
                    nMap.course = new Microsoft.Maps.Polyline(courseArray, { strokeColor: new Microsoft.Maps.Color(200, 255, 0, 0), strokeThickness: 3 });
                    nMap.map.entities.push(nMap.course);
                }

                var viewRect = viewRect == null ? courseArray : viewRect;
                viewRect = ($.isArray(viewRect) && viewRect.length < 1) ? null : viewRect;

                if(viewRect != null)
                    nMap.map.setView({ bounds: Microsoft.Maps.LocationRect.fromLocations(viewRect) });
                //map = new Microsoft.Maps.Map(document.getElementById(mapDiv), mapOptions);

                //course = new Microsoft.Maps.Polyline(courseArray, { strokeColor: new Microsoft.Maps.Color(200, 255, 0, 0), strokeThickness: 3 });
                //map.entities.push(course);

                //map.setView({ bounds: Microsoft.Maps.LocationRect.fromLocations(courseArray) });
                return (mapCollection.push(nMap) - 1);
            },

            addOverlayCourse: function (index, courseArray) {

                var eMap = mapCollection[index];

                if (eMap.coursePrev != null)
                    eMap.map.entities.remove(coursePrev);

                eMap.overlay = new Microsoft.Maps.Polyline(courseArray, { strokeColor: new Microsoft.Maps.Color(200, 255, 255, 0), strokeThickness: 2 });
                eMap.map.entities.push(eMap.overlay);
            },

            addPushpins: function (index, pushpins) {
                var pins = $.isArray(pushpins) == true ? pushpins : [pushpins];
                var eMap = mapCollection[index];

                for (i = 0; i < pins.length; i++) {
                    eMap.pins.push(pins[i]);    // save pins collection to map object
                    eMap.map.entities.push(pins[i]);    // show on Map
                }

            },

            addTrackers: function(index, trackers) {
                var eMap = mapCollection[index];
                eMap.trackers = trackers;

                for (i = 0; i < trackers.length; i++) {
                  //  eMap.pins.push(trackers[i]);    // save pins collection to map object
                    eMap.map.entities.push(trackers[i].pin);    // show on Map
                }
            },

            removeTracker: function (mapId, trackerID) {
                var eMap = mapCollection[mapId];
                var pushpin = null;

                for (i = 0; i < eMap.trackers.length; i++) {
                    if (eMap.trackers[i].id == trackerID) {
                        pushpin = eMap.trackers[i].pin;
                        break;
                    }
                }

                // found?
                if (pushpin != null)
                    eMap.map.entities.remove(pushpin);

            },

            changeTrackerIcon: function (mapId, trackerId, options) {
                var eMap = mapCollection[mapId];
                var pushpin = null;

                for (i = 0; i < eMap.trackers.length; i++) {
                    if (eMap.trackers[i].id == trackerId)
                        pushpin = eMap.trackers[i].pin;
                }

                // found?
                if (pushpin != null)
                    pushpin.setOptions(options);
            }
        

    }
    });
}).call(this);