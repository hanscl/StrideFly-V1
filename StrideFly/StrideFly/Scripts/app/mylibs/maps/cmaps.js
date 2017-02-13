(function () {
    define(["jQuery", "kendo", "mylibs/util/util-session-storage"], function (jQuery, kendo, sessionStorage) {

        var lineColors = {
            yellow: new Microsoft.Maps.Color(200, 255, 255, 0),
            red: new Microsoft.Maps.Color(200, 255, 0, 0),
            blue: new Microsoft.Maps.Color(200, 0, 0, 255),
            green: new Microsoft.Maps.Color(200, 0, 255, 0)
        };

        var ppIcons = {
            greenMarkerMini: { url: '/content/images/maps/green-marker-mini.png', height: 54, width: 38 },
            redMarkerMini: { url: '/content/images/maps/red-marker-mini.png', height: 54, width: 38 },
            bib: { url: '/content/images/maps/bib-icon-50.png', height: 45, width: 51 },
            mileMarker: { url: '/content/images/maps/mile-marker.png', height: 70, width: 55 },
            finishLine: { url: '/content/images/maps/finish-line-red.png', height: 80, width: 49 },
            waterStation: { url: '/content/images/maps/water-station.png', height: 58, width: 43 },
        };

        var textStyles = {
            bib: 'bibNumber',
            mileMarker: 'mileMarker'
        };

        var mapCollection = [];

        var mapOptions = {
            aerial: {
                credentials: "AphaWn396J8Pk2qM-h8UxAIomRC0lrGxm8GZQ-HiGHXjb83d0Uiwdw43xmokokJb",
                mapTypeId: Microsoft.Maps.MapTypeId.aerial,
            },
            birdseyeDash: {
                credentials: "AphaWn396J8Pk2qM-h8UxAIomRC0lrGxm8GZQ-HiGHXjb83d0Uiwdw43xmokokJb",
                mapTypeId: Microsoft.Maps.MapTypeId.birdseye,
                showDashboard: true
            },
            birdseye: {
                credentials: "AphaWn396J8Pk2qM-h8UxAIomRC0lrGxm8GZQ-HiGHXjb83d0Uiwdw43xmokokJb",
                mapTypeId: Microsoft.Maps.MapTypeId.birdseye,
                showDashboard: false
            }
        }

        // Helper functions go here so they are not visible outside of the module ...
        var hlpMapLocation = function (locObject) {
            return new Microsoft.Maps.Location(locObject.Latitude, locObject.Longitude);
        };

        var hlpMapArray = function (locArray) {

            var pointArray = [];

            for (var i = 0; i < locArray.length; i++) {
                pointArray.push(hlpMapLocation(locArray[i]));
            }

            return pointArray;
        };

        var hlpGetIndexFromID = function (objArray, objID) {
            for (var i = 0; i < objArray.length; i++) {
                if (objArray[i].id == objID) {
                    return i;
                }
            }

            return -1;
        };

        var removeCourse = function (mapIndex, courseID, courseIndex) {

            var eMap = mapCollection[mapIndex]; // Obtain map object

            // See if we have an index or if we need to find it still
            if (typeof courseIndex == "undefined") { // index not passed in, need to find it
                courseIndex = hlpGetIndexFromID(eMap.courses, courseID);

                if (courseIndex == -1) // this ID doesn't exist. Exit
                    return;
            }

            // Now we have the courseIndex => First remove entity from map ...
            eMap.map.entities.remove(eMap.courses[courseIndex].course);

            // ... then delete the object from the course array
            eMap.courses.splice(courseIndex, 1);
        };

        var removePin = function (mapIndex, pinID, pinIndex, pinType) {

            var eMap = mapCollection[mapIndex]; // Obtain map object
            var pinArray = eMap.pins[pinType]; // Obtain correct pushpin array from pins object

            // See if we have an index or if we need to find it still
            if (typeof pinIndex == "undefined") { // index not passed in, need to find it
                pinIndex = hlpGetIndexFromID(pinArray, pinID);

                if (pinIndex == -1) // this ID doesn't exist. Exit
                    return;
            }

            // Now we have the courseIndex => First remove entity from map ...
            eMap.map.entities.remove(pinArray[pinIndex].pin);

            // ... then delete the object from the course array
            pinArray.splice(pinIndex, 1);
        };

        var pinZIndex = function (mapIndex, pinID, pinType) {
            var zCtr = 1;

            var eMap = mapCollection[mapIndex]; // Obtain map object
            var pinArray = eMap.pins[pinType]; // Obtain correct pushpin array from pins object

            for (var i = 0; i < pinArray.length; i++) {
                if(pinArray[i].id == pinID) 
                    pinArray[i].pin.setOptions({ zIndex: 0 });
                else 
                    pinArray[i].pin.setOptions({ zIndex: zCtr++ });
            }
        };

        return {
            createMap: function (mapDiv, type) {

                var nMap = new Object();    // Create map object

                // select type
                options = (typeof type == "undefined") ? mapOptions.aerial : mapOptions[type];


                // Create a basic map & save the div element 
                nMap.map = new Microsoft.Maps.Map(document.getElementById(mapDiv), options);
                nMap.div = mapDiv;

                // initialize other data members of the map object
                nMap.courses = [];
                nMap.pins = { trackers: [], participants: [], points: [] };
                nMap.partInfoBox = null;

                return (mapCollection.push(nMap) - 1);
            },

            addCourse: function (mapIndex, courseID, courseArray, strokeOptions /*object with properties "color", "thickness" and optionally "dash"*/ ) {

                var courseOptions = {};
                var eMap = mapCollection[mapIndex];

                // check if this course already exists and remove if so
                var courseIndex = hlpGetIndexFromID(eMap.courses, courseID);
                
                if (courseIndex != -1)
                    removeCourse(mapIndex, courseID, courseIndex);

                // set course options (i.e. stroke)
                courseOptions.strokeColor = lineColors[strokeOptions.color];
                courseOptions.strokeThickness = strokeOptions.thickness;
                if (typeof strokeOptions.dash !== "undefined") {
                    courseOptions.strokeDashArray = strokeOptions.dash;
                }

                // convert the courseArray into an array of lat/lng pairs
                pointArray = hlpMapArray(courseArray);

                // save the course and show on map
                var courseCount = eMap.courses.push({ id: courseID, course: new Microsoft.Maps.Polyline(pointArray, courseOptions) });
                eMap.map.entities.push(eMap.courses[courseCount-1].course);
            },
           
            setMapViewToCourses: function (mapIndex, courseIDs, zoom) {
                // Obtain the map
                var eMap = mapCollection[mapIndex];
                var locArray = new Array();

                // see if the user has saved a different view in his session
                var viewOptions = sessionStorage.getVar(courseIDs.toString());
                if(viewOptions != false) {
                    eMap.map.setView(viewOptions);
                    return;
                }

                // Check if it's more than one map
                courseIDs = ($.isArray(courseIDs)) ? courseIDs : [courseIDs];

                var index;
                // loop through and add the locations of the requested courses to the locations array
                for (var i = 0; i < eMap.courses.length; i++) {
                    if ($.inArray(eMap.courses[i].id, courseIDs) != -1) {
                        locArray = locArray.concat(eMap.courses[i].course.getLocations());
                    }
                }

                // set the map view
                eMap.map.setView({ bounds: Microsoft.Maps.LocationRect.fromLocations(locArray) });

                // 
                if (typeof zoom !== "undefined") {
                    eMap.map.setView({ zoom: zoom });
                }
            },

            addPin: function (mapIndex, pinID, pinType, pinLocation, options) {

                var pinOptions = {};
                var eMap = mapCollection[mapIndex];
                //id: viewModelContainer.trackPointArray[i].TrackerID, pin: new Microsoft.Maps.Pushpin(locs[i], { icon: '/content/images/maps/green-marker-mini.png', height: 54, width: 38 }) }

                // Obtain correct pushpin array from pins object
                var pinArray = eMap.pins[pinType];

                // generate fake ID if it;s null
                if (pinID == null) {
                    pinID = "static" + pinArray.length;
                }

                // check if this course already exists and remove if so
                var pinIndex = hlpGetIndexFromID(pinArray, pinID);

                if (pinIndex != -1)
                    removePin(mapIndex, pinID, pinIndex, pinType);

                // set course options (i.e. stroke)
                pinOptions.icon = ppIcons[options.icon].url;
                pinOptions.height = ppIcons[options.icon].height;
                pinOptions.width = ppIcons[options.icon].width;
                if (typeof options.text !== "undefined") {
                    pinOptions.text = options.text;
                }
                if (typeof options.style !== "undefined") {
                    pinOptions.typeName = textStyles[options.style];
                }

                // convert the courseArray into an array of lat/lng pairs
                pinPoint = hlpMapLocation(pinLocation);

                // save the course and show on map
                var pinCount = pinArray.push({ id: pinID, pin: new Microsoft.Maps.Pushpin(pinPoint, pinOptions) });
                eMap.map.entities.push(pinArray[pinCount - 1].pin);
            },

            setMapViewToPins: function (mapIndex, pinIDs, pinType) {

                // Obtain the map
                var eMap = mapCollection[mapIndex];
                var locArray = new Array();

                // Check if it's more than one map
                pinIDs = ($.isArray(pinIDs)) ? pinIDs : [pinIDs];

                var index;
                // loop through and add the locations of the requested courses to the locations array
                for (var i = 0; i < eMap.pins[pinType].length; i++) {
                    if ($.inArray(eMap.pins[pinType][i].id, pinIDs) != -1)
                        locArray.push(eMap.pins[pinType][i].pin.getLocation());
                }

                // set the map view
                eMap.map.setView({ bounds: Microsoft.Maps.LocationRect.fromLocations(locArray) });
                eMap.map.setView({ zoom: 18 });

            },

            centerViewOnPin: function (mapIndex, pinID, pinType, zoomLevel) 
            {
                // Obtain the map
                var eMap = mapCollection[mapIndex];

                // Get the index
                var pinArray = eMap.pins[pinType]; // Obtain correct pushpin array from pins object
                pinIndex = hlpGetIndexFromID(pinArray, pinID);

                if (pinIndex == -1) // this ID doesn't exist. Exit
                    return;

                eMap.map.setView({ center: pinArray[pinIndex].pin.getLocation(), zoom: zoomLevel });
            },

            changePinLocation: function (mapIndex, pinID, pinType, pinLocation) {
                var eMap = mapCollection[mapIndex]; // Obtain map object
                var pinArray = eMap.pins[pinType]; // Obtain correct pushpin array from pins object

                // See if we have an index or if we need to find it still
                pinIndex = hlpGetIndexFromID(pinArray, pinID);

                if (pinIndex == -1) // this ID doesn't exist. Exit
                    return;

                // convert the courseArray into an array of lat/lng pairs
                pinPoint = hlpMapLocation(pinLocation);

                pinArray[pinIndex].pin.setLocation(pinPoint);
            },

            changePinOptions: function (mapIndex, pinID, pinType, options) {
                var pinOptions = {};
                var eMap = mapCollection[mapIndex]; // Obtain map object
                var pinArray = eMap.pins[pinType]; // Obtain correct pushpin array from pins object

                // See if we have an index or if we need to find it still
                pinIndex = hlpGetIndexFromID(pinArray, pinID);

                if (pinIndex == -1) // this ID doesn't exist. Exit
                    return;

                // set pinOptions
                if (typeof options.icon != "undefined") {
                    pinOptions.icon = ppIcons[options.icon].url;
                    pinOptions.height = ppIcons[options.icon].height;
                    pinOptions.width = ppIcons[options.icon].width;
                }
                
                if (typeof options.text !== "undefined") {
                    pinOptions.text = options.text;
                }
                if (typeof options.style !== "undefined") {
                    pinOptions.typeName = textStyles[options.style];
                }

                pinArray[pinIndex].pin.setOptions(pinOptions);

            },

            flushPins: function(mapIndex, pinType) {
                var eMap = mapCollection[mapIndex]; // Obtain map object
                var pinArray = eMap.pins[pinType]; // Obtain correct pushpin array from pins object

                for (var i = 0; i < pinArray.length; i++) {
                    eMap.map.entities.remove(pinArray[i].pin);
                }

                // set to empty array
                eMap.pins[pinType] = [];
            },

            highlightParticipant: function(mapIndex, partID, values /* "bib" & "name" for now*/) {
                var eMap = mapCollection[mapIndex]; // Obtain map object
                
                // check if this is a "hide" operation & the infobox in fact exists
                if(partID == 0) {
                    if(eMap.partInfoBox != null) // hide it if exists
                        eMap.partInfoBox.setOptions({ visible: false });
                    // return since we have no participant
                    return;
                }

                // Obtain correct pushpin array from pins object
                var pinArray = eMap.pins["participants"];

                // get the index for this participant
                var pinIndex = hlpGetIndexFromID(pinArray, partID);

                if (pinIndex == -1) // Invalid partID => return
                    return;

                // obtain ref to participant object
                partPin = pinArray[pinIndex].pin;

                eMap.map.entities.remove(partPin);
                eMap.map.entities.push(partPin);
                // pinZIndex(mapIndex, pinArray[pinIndex].id, "participants");
                //this.reAddPin(mapIndex, pinArray[pinIndex], "participants"); // re-add to bring it to the front (i.e. zIndex)
          

                // Create infobox if it doesn't exist
                if(eMap.partInfoBox == null) {
                    eMap.partInfoBox = new Microsoft.Maps.Infobox(partPin.getLocation(), { visible: false });
                    eMap.map.entities.push(eMap.partInfoBox);
                }

                // remove partInfoBox (and re-add later) to put it on top of other items on the map
                eMap.map.entities.remove(eMap.partInfoBox);

                // Update infobox and make visible
                eMap.partInfoBox.setLocation(partPin.getLocation());
                eMap.partInfoBox.setHtmlContent('<div id="participant-info-box" style="background-color:black; border-style:solid;border-width:medium; border-color:DarkOrange; min-height:25px; position:relative;top:-25px; left:23px; width:170px;font-size:9pt;"><b id="participant-info-title" style="position:absolute; top:5px; left:5px; width:160px;color:white">#' + values.bib + ' - ' + values.name + '</b></div>'); 
                eMap.partInfoBox.setOptions({visible: true});

                // And add it back to the map!!
                eMap.map.entities.push(eMap.partInfoBox);
                
            },

            saveMapView: function(mapIndex, courseID) {
                // Obtain the map
                var eMap = mapCollection[mapIndex];

                // check if this course already exists and remove if so
           //     var courseIndex = hlpGetIndexFromID(eMap.courses, courseID);
                
           //     if (courseIndex == -1) // doesn't exist
           //         return;

                // obtain view & center
                var center = eMap.map.getCenter();
                var zoom = eMap.map.getZoom();

                sessionStorage.setVar(courseID.toString(), {center: center, zoom: zoom});
            },

            removeCourse: removeCourse


        }

    });
}).call(this);