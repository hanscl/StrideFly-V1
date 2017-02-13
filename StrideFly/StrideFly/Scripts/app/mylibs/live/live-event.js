(function () {
    define(["jQuery", "kendo", "mylibs/maps/maps", "mylibs/maps/cmaps", "mylibs/util/util-session-storage"], function ($, kendo, maps, cmaps, sessionStorage) {

        var eventsUrl = "/odata/vevents";
        var coursesUrl = "/odata/courses";
        var markersUrl = "/odata/coursemarkers";
        var livePartsUrl = "/odata/liveparticipants";
        var liveLapsUrl = "/odata/livelaps";
        var pointsOfInterestUrl = "/odata/pointsofinterest";


        
        var lastSelectedPartsId; // => the grid will be for laps, but will we need a selection?

        var liveLapPageSize = 4; //static

        var activeParticipantIDs = [];
        var mainMapID = null;
        var detailMapID = null;
        var contentString = "event";
        var showHideViewCallback;
        var currentEventId;

        var timer = null;

        // Keep track of how many courses we have completed when reading the markers & liveparticipants sources 
        var dbCourseIndex = { markers: 0, participants: 0, points: 0 };

        var partPerCourseCtr = 0; // this will be reset when a new course is shown on the map & increased every time we change participants;
        var courseRotateCtr; // ensures that we will not endlessly rotatecourses when they're all zero

        var currentLiveCourse = 0; // current course that's shown on the map
        var liveCourses = [];  // {courseID: #, partArray: [], lastPartID: #, firstPartID: #}
        var courseIDs = []; // just the IDs of the courses for this event

        /*** Define Data Models for EVENT, PARTICIPANT, LAP Views ***/
        // MODEL 1/5: Events (view)
        var eventsModel = kendo.data.Model.define({
            id: "EventID",
            fields: {
                EventID: { type: "number", editable: false },
                Name: { type: "string", editable: false },
                Location: { type: "string", editable: false },
                Start: { type: "datetime", editable: false },
                End: { type: "datetime", editable: false },
                SeriesName: { type: "string", editable: false },
                SeriesType: { type: "string", editable: false },
                Laps: { type: "number", editable: false },
                RefreshInterval: { type: "number", editable: false },
                CycleInterval: { type: "number", editable: false }
            }
        });

        // Model 2/5: Courses (Table)
        var courseModel = kendo.data.Model.define({
            id: "CourseID",
            fields: {
                CourseID: { type: "number", editable: false },
                Name: { type: "string", editable: false },
                Distance: { type: "number", editable: false },
                ElevGain: { type: "number", editable: false },
                Order: { type: "number", editable: false },
                Description: { type: "string", editable: false },
                StrokeColor: { type: "string", editable: false },
                StrokeThickness: { type: "number", editable: false },
                StrokeDash: { type: "string", editable: false },
                FK_Event: { editable: false }
            }
        });

        // Model 3/5: Course Markers (Table)
        var markerModel = kendo.data.Model.define({
            id: "MarkerID",
            fields: {
                MarkerID: { type: "number", editable: false },
                Longitude: { type: "number", editable: false },
                Latitude: { type: "number", editable: false },
                Altitude: { type: "number", editable: false },
                Distance: { type: "number", editable: false },
                Bearing: { type: "number", editable: false },
                FK_Course: { type: "number", editable: false },
                Include: { type: "boolean", editable: false }
            }
        });


        // Model 4/5: LiveParticipants (View)
        var liveParticipantsModel = kendo.data.Model.define({
            id: "PartID",
            fields: {
                // PARTICIPANT (Basics)
                PartID: { type: "number", editable: false },
                EventID: { type: "number", editable: false },
                ParticipantName: { type: "string", editable: false },
                Bib: { type: "number", editable: false },
                Runners: { type: "number", editable: false },
                // PARTICIPANT (Stats)
                CurrentCourse: { type: "number", editable: false },
                CurrentLap: { type: "number", editable: false },
                TimeElapsed: { type: "number", editable: false },
                TimeRemaining: { type: "number", editable: false },
                DistanceTotal: { type: "number", editable: false },
                DistanceCompleted: { type: "number", editable: false },
                DistanceRemaining: { type: "number", editable: false },
                AvgPace: { type: "number", editable: false },
                CurrPace: { type: "number", editable: false },
                TotalPace: { type: "number", editable: false },
                StartTime: { type: "datetime", editable: false },
                EndTime: { type: "datetime", editable: false },
                // TRACKING DETAILS
                TrackerID: { type: "number", editable: false },
                TrackPointDT: { type: "datetime", editable: false },
                Latitude: { type: "number", editable: false },
                Longitude: { type: "number", editable: false },
                Altitude: { type: "number", editable: false },
                BatteryPct: { type: "number", editable: false }
            }
        });

        // Model 5/5: LiveLaps (View)
        var liveLapsModel = kendo.data.Model.define({
            id: "LapID",
            fields: {
                // LAP (Basics)
                LapID: { type: "number", editable: false },
                PartID: { type: "number", editable: false },
                EventID: { type: "number", editable: false },
                RunnerNo: { type: "number", editable: false },
                LapNo: { type: "number", editable: false },
                Status: { type: "number", editable: false },
                // LAP (Stats)
                TimeElapsed: { type: "number", editable: false },
                TimeRemaining: { type: "number", editable: false },
                TimeTotal: { type: "number", editable: false },
                DistanceTotal: { type: "number", editable: false },
                DistanceCompleted: { type: "number", editable: false },
                DistanceRemaining: { type: "number", editable: false },
                LapPace: { type: "number", editable: false },
                // Course Info
                CourseNo: { type: "number", editable: false },
                CourseName: { type: "string", editable: false },
                CourseDistance: { type: "number", editable: false },
                CourseElevGain: { type: "number", editable: false },
                //TIME DATA
                StartTime: { type: "datetime", editable: false },
                EndTime: { type: "datetime", editable: false },
                ProjTotalTime: { type: "number", editable: false },
                ProjStartTime: { type: "datetime", editable: false },
                ProjEndTime: { type: "datetime", editable: false }
            }
        });

        // ONE MORE :-)
        var pointModel = kendo.data.Model.define({
            id: "PointID",
            fields: {
                PointID: { type: "number", editable: false },
                Name: { type: "string", editable: false },
                Location: { type: "number", editable: false },
                Icon: { type: "string", editable: false },
                FK_Course: { type: "number", editable: false },
                InfoBoxText: { type: "string", editable: false }
            }
        });

        /***** End Datamodel definitions ****/

        /*** BEGIN: Datasource definitions ***/
        // Datasource 1/5: Events
        var Events = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: eventsUrl,
                    dataType: "json"
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: true,
            schema: {
                model: eventsModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                },
                parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                    for (var i = 0; i < response.value.length; i++) {
                        response.value[i].End = kendo.parseDate(response.value[i].End, "yyyy-MM-ddTHH:mm:ss");
                        response.value[i].Start = kendo.parseDate(response.value[i].Start, "yyyy-MM-ddTHH:mm:ss");
                    }
                    return response;
                }
            },
            change: function (e) {
                // Set the filter for the datasource; this will trigger a read!!
                // Create basic map
                mainMapID = cmaps.createMap("live-event-bigmap", "birdseyeDash");
                // initialize small map
                showHideViewCallback("event", "smallmap", true);

                // Create the detailed map if it didn't exist yet
                if (detailMapID == null)
                    detailMapID = cmaps.createMap("live-event-smallmap", "birdseye");

                Courses.filter({ field: "FK_Event", operator: "eq", value: currentEventId });
                viewModelContainer.set("events", this.view());

                // Save cycle and refresh intervals in separate fields so we can do a runtime edit that doesn't go back to the DB
                viewModelContainer.set("refreshInterval", this.view()[0].RefreshInterval);
                viewModelContainer.set("cycleInterval", this.view()[0].CycleInterval);
            },
        });

        // Datasource 2/5: Courses
        var Courses = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: coursesUrl,
                    dataType: "json"
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: true,
            schema: {
                model: courseModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                }
            },
            change: function (e) {
                viewModelContainer.set("courses", this.view());

                // OLD VERSION
                /* for (i = 0; i < this.view().length; i++) {
                     cID = this.view()[i].CourseID;
                     liveCourses.push({ courseID: cID, partArray: [], lastPartID: 0, firstPartID: 0 });
                     courseIDs.push(cID);
                     Markers.filter({ field: "FK_Course", operator: "eq", value: cID });
                 }*/

                // NEW VERSION
                // Save all courses to our global arrays .. ouch ... i said it ... "global"
                for (var i = 0; i < this.view().length; i++) {
                    cID = this.view()[i].CourseID;
                    liveCourses.push({ courseID: cID, partArray: [], lastPartID: 0, firstPartID: 0 });
                    courseIDs.push(cID);
                }

                // filter the Marker source on the first courseID
                Markers.filter({ field: "FK_Course", operator: "eq", value: courseIDs[dbCourseIndex.markers] });
            },
        });

        // Datasource 3/5: Markers
        var Markers = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: markersUrl,
                    dataType: "json"
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: true,
            schema: {
                model: markerModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                }
            },
            change: function (e) {
                // find the current course that markers were loaded for
                //     if (this.view().length < 1) // nothing loaded
                //       return;


                var courseID = courseIDs[dbCourseIndex.markers];

                for (var crsIndex = 0; crsIndex < viewModelContainer.courses.length; crsIndex++) {
                    if (courseID == viewModelContainer.courses[crsIndex].CourseID && this.view().length > 0) {
                        // Save the index for next filter request and to know when we're done
                        // NEW TODAY, SAVE MARKERS TO COURSE
                        viewModelContainer.courses[crsIndex].Markers = this.view();
                        //dbCourseIndex.markers = i;
                        //         // Process these markers
                        cCourse = viewModelContainer.courses[crsIndex];
                        cmaps.addCourse(mainMapID, courseID, this.view(), { color: cCourse.StrokeColor, thickness: cCourse.StrokeThickness, dash: cCourse.StrokeDash });                   
                        cmaps.addCourse(detailMapID, courseID, this.view(), { color: cCourse.StrokeColor, thickness: cCourse.StrokeThickness, dash: cCourse.StrokeDash });
                        if (crsIndex == 0) { // add start line 
                            cmaps.addPin(mainMapID, "finishLine", "points", this.view()[0], { icon: "finishLine" })
                            cmaps.addPin(detailMapID, "finishLine", "points", this.view()[0], { icon: "finishLine" })
                            cmaps.centerViewOnPin(detailMapID, "finishLine", "points", 18);
                        }
                        // Add milemarkers for each course & map
                        var mileNo = 1;
                        var lastDistance = 0;
                        for (var mrkIndex = 0; mrkIndex < this.view().length; mrkIndex++) {
                            if (lastDistance < mileNo && this.view()[mrkIndex].Distance > mileNo) {
                                cmaps.addPin(mainMapID, "mileMarker" + courseID + mileNo, "points", this.view()[mrkIndex], {icon: "mileMarker", style: "mileMarker", text: kendo.format("Mile {0}", mileNo)});
                                cmaps.addPin(detailMapID, "mileMarker" + courseID + mileNo, "points", this.view()[mrkIndex], { icon: "mileMarker", style: "mileMarker", text: kendo.format("Mile {0}", mileNo) });
                                mileNo++;
                            }
                            lastDistance = this.view()[mrkIndex].Distance;
                        }
                        //viewModelContainer.courses[i].Markers = this.view();

                        // Add points of interest
                        break; 
                    }
                }

                if (dbCourseIndex.markers == courseIDs.length - 1) { // now we have all courses and can set the view of the map
                    cmaps.setMapViewToCourses(mainMapID, courseIDs, 15);

                    // ...and reset course index for the next time (although this should only happen once :-)
                    dbCourseIndex.markers = 0;

                    // Request the participants for the first course; subsequent courses will be requested from the participants DS change() function
                    LiveParticipants.filter({ logic: "and", filters: [{ field: "CurrentCourse", operator: "eq", value: courseIDs[dbCourseIndex.participants] }, { field: "EventID", operator: "eq", value: currentEventId }] });
                    // also read the POIs here for the first course
                    PointsOfInterest.filter({ field: "FK_Course", operator: "eq", value: courseIDs[dbCourseIndex.points] });

                } else { // if this wasn't the last one, change the filter to trigger another change() on the Markers source
                    Markers.filter({ field: "FK_Course", operator: "eq", value: courseIDs[++dbCourseIndex.markers] });
                }

            },
        });

        // Datasource 4/5: LiveParticipants
        var LiveParticipants = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: livePartsUrl,
                    dataType: "json"
                },
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: true,
            schema: {
                model: liveParticipantsModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                },
                errors: function (data) {
                },
                parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                    for (var i = 0; i < response.value.length; i++) {
                        response.value[i].TrackPointDT = kendo.parseDate(response.value[i].TrackPointDT, "yyyy-MM-ddTHH:mm:ss");
                        response.value[i].StartTime = kendo.parseDate(response.value[i].StartTime, "yyyy-MM-ddTHH:mm:ss");
                        response.value[i].EndTime = kendo.parseDate(response.value[i].EndTime, "yyyy-MM-ddTHH:mm:ss");
                    }
                    return response;
                }
            },
            change: function (e) {
                //viewModelContainer.set("participants", this.view());

                cID = courseIDs[dbCourseIndex.participants];

                // save the participant to the correct course
                for (var i = 0; i < viewModelContainer.courses.length; i++) {
                    if (cID == viewModelContainer.courses[i].CourseID) {
                        //dbCourseIndex.participants = i; // Save the index so we know down below if we've read parts for all courses
                        viewModelContainer.courses[i].Participants = this.view();
                        break;
                    }
                }

                refreshParticipants(dbCourseIndex.participants, this.view());

                if (dbCourseIndex.participants == courseIDs.length - 1) { // last course has been read; continue with refreshing participants (&courses)
                    // if this is the first time we need to initialize the timer
                    if (timer == null) {
                        timer = window.setInterval(timesUp, viewModelContainer.refreshIntervalMS());
                    }

                    // reset the counter every time 
                    dbCourseIndex.participants = 0;

                    // now show the next participant (if the cycle count has been reached; otherwise refresh map & highlight same participant again)
                    if (/*viewModelContainer.activeParticipant.data && */ ++viewModelContainer.cycleCount >= viewModelContainer.cycleInterval) {
                        viewModelContainer.cycleCount = 0;
                        rotateParticipant();
                    } else { // update positions but not cycling the runner
                        refreshRunnersOnMap();
                        showNextParticipant(viewModelContainer.activeParticipant.data);
                    }
                } else { // Not done yet, filter the source for the next courseID
                    LiveParticipants.filter({ logic: "and", filters: [{ field: "CurrentCourse", operator: "eq", value: courseIDs[++dbCourseIndex.participants] }, { field: "EventID", operator: "eq", value: currentEventId }] });
                }
            },
        });

        // Datasource 5/5: LiveLaps
        var LiveLaps = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: liveLapsUrl,
                    dataType: "json"
                },
            },
            batch: false,
            serverPaging: true,
            serverSorting: true,
            serverFiltering: true,
            schema: {
                model: liveLapsModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                },
                errors: function (data) {
                },
                parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                     for (var i = 0; i < response.value.length; i++) {
                         response.value[i].StartTime = kendo.parseDate(response.value[i].StartTime, "yyyy-MM-ddTHH:mm:ss");
                         response.value[i].EndTime = kendo.parseDate(response.value[i].EndTime, "yyyy-MM-ddTHH:mm:ss");
                         response.value[i].ProjStartTime = kendo.parseDate(response.value[i].ProjStartTime, "yyyy-MM-ddTHH:mm:ss");
                         response.value[i].ProjEndTime = kendo.parseDate(response.value[i].ProjEndTime, "yyyy-MM-ddTHH:mm:ss");
                     }
                     return response;
                },
                success: function (data) {
                    alert(data);
                }
            },
            change: function (e) {
                viewModelContainer.set("activeParticipant.laps", this.view());
                // find the active lap and save separately to make our lives in the view so easy :-)
                for(var lapIdx = 0; lapIdx < this.view().length; lapIdx++) {
                    if(this.view()[lapIdx].Status == 1) {
                        viewModelContainer.set("activeParticipant.activeLap.data", this.view()[lapIdx]);
                        break; //only one active lap so we can skip out of this now
                    }
                }
            },
        });

        // Datasource 7/7: Upcoming Laps
        var UpcomingLaps = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: liveLapsUrl,
                    dataType: "json"
                },
            },
            batch: false,
            serverPaging: true,
            serverSorting: true,
            serverFiltering: true,
            schema: {
                model: liveLapsModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                },
                errors: function (data) {
                },
                parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                    for (var i = 0; i < response.value.length; i++) {
                        response.value[i].StartTime = kendo.parseDate(response.value[i].StartTime, "yyyy-MM-ddTHH:mm:ss");
                        response.value[i].EndTime = kendo.parseDate(response.value[i].EndTime, "yyyy-MM-ddTHH:mm:ss");
                        response.value[i].ProjStartTime = kendo.parseDate(response.value[i].ProjStartTime, "yyyy-MM-ddTHH:mm:ss");
                        response.value[i].ProjEndTime = kendo.parseDate(response.value[i].ProjEndTime, "yyyy-MM-ddTHH:mm:ss");
                    }
                    return response;
                },
                success: function (data) {
                    alert(data);
                }
            },
            change: function (e) {
                // Check if we need to reset the page request
                // first get the skip counter
                for (var iCtr = 0; iCtr <= viewModelContainer.partLapsSkipCounters.length; iCtr++) {
                    if (viewModelContainer.partLapsSkipCounters[iCtr].PartID == viewModelContainer.activeParticipant.data.PartID) {
                        partSkipIndex = iCtr;
                        break;
                    }
                }

                if (this.view().length == 0 && typeof partSkipIndex != "undefined" && viewModelContainer.partLapsSkipCounters[partSkipIndex].Skip > 1) {
                    viewModelContainer.partLapsSkipCounters[partSkipIndex].Skip = 0; // go back to first page
                    // requery the database
                    UpcomingLaps.query({
                        pageSize: liveLapPageSize,
                        page: 1,
                        sort: { field: "LapNo", dir: "asc" },
                        filter: { logic: "and", filters: [{ field: "PartID", operator: "eq", value: viewModelContainer.activeParticipant.data.PartID }, { field: "EventID", operator: "eq", value: currentEventId }, { field: "LapNo", operator: "gt", value: viewModelContainer.activeParticipant.data.CurrentLap }] }
                    });
                    return;
                }
            }
        });

        // Datasource 6/6: Points of Interest
        var PointsOfInterest = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: pointsOfInterestUrl,
                    dataType: "json"
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: true,
            schema: {
                model: pointModel,
                type: "json",
                data: function (data) {
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                },
                total: function (data) {
                    return data["odata.count"];
                }
            },
            change: function (e) {

                cID = courseIDs[dbCourseIndex.points];
                var cMarkers = viewModelContainer.courses[dbCourseIndex.points].Markers;

                for (var ptCtr = 0; ptCtr < this.view().length; ptCtr++) {

                    var poi = this.view()[ptCtr];

                    // loop through all markers to find where to add the POI
                    var lastDistance = 0;
                    for (var mrkIndex = 0; mrkIndex < cMarkers.length; mrkIndex++) {
                        if (lastDistance < poi.Location && cMarkers[mrkIndex].Distance > poi.Location) {
                            cmaps.addPin(mainMapID, poi.PointID, "points", cMarkers[mrkIndex], { icon: poi.Icon, style: poi.Icon });
                            cmaps.addPin(detailMapID, poi.PointID, "points", cMarkers[mrkIndex], { icon: poi.Icon, style: poi.Icon});
                        }
                        lastDistance = cMarkers[mrkIndex].Distance;
                    }


                }
         
                if (dbCourseIndex.points < courseIDs.length - 1) { // continue to read datasource for each course
                    PointsOfInterest.filter({ field: "FK_Course", operator: "eq", value: courseIDs[++dbCourseIndex.points] });
                }
            }
        });


        /**** C. Define view model ****/
        var viewModelContainer = new kendo.observable({
            // Datasources
            eventSource: Events,
            liveParticipantSource: LiveParticipants,
            liveLapSource: LiveLaps,
            upcomingLapsSource: UpcomingLaps,

            partLapsSkipCounters: [],
            // Datasource views (may not need this + datasource; decide later);
            events: [],
            // participants: [],
            laps: [],
            courses: [],
            activeParticipant: {
                data: {},
                currPace: function () {
                    var secs = this.get("data.CurrPace");
                    return getCustomTimeString(secs, true);
                },
                avgPace: function () {
                    var secs = this.get("data.AvgPace");
                    return getCustomTimeString(secs, true);
                },
                totalPace: function () {
                    var secs = this.get("data.TotalPace");
                    return getCustomTimeString(secs, true);
                },
                distanceCompleted: function () {
                    var dist = this.get("data.DistanceCompleted");
                    return getDistanceString(dist);

                },
                distanceTotal: function() {
                    var dist = this.get("data.DistanceTotal");
                    return getDistanceString(dist);
                },
                timeElapsed: function () {
                    var secs = this.get("data.TimeElapsed");
                    return getCustomTimeString(secs, false, true);
                },
                timeRemaining: function () {
                    var secs = this.get("data.TimeRemaining");
                    return getCustomTimeString(secs, false, true);
                },
                startTime: function() {
                    var sTime = this.get("data.StartTime");
                    return kendo.format("{0:T}", sTime);
                },
                endTime: function () {
                    var eTime = this.get("data.EndTime");
                    return kendo.format("{0:T}", eTime);
                },
                batteryPct: function() {
                    var pct = this.get("data.BatteryPct");
                    return kendo.format("{0:0}%", pct);
                },
                activeLap: {
                    data: {},
                    lapPace: function () {
                        var secs = this.get("data.LapPace");
                        return getCustomTimeString(secs, true);
                    },
                    distanceCompleted: function () {
                        var dist = this.get("data.DistanceCompleted");
                        return getDistanceString(dist);

                    },
                    distanceTotal: function () {
                        var dist = this.get("data.DistanceTotal");
                        return getDistanceString(dist);
                    },
                    timeElapsed: function () {
                        var secs = this.get("data.TimeElapsed");
                        return getCustomTimeString(secs, false, true);
                    },
                    timeRemaining: function () {
                        var secs = this.get("data.TimeRemaining");
                        return getCustomTimeString(secs, false, true);
                    },
                    startTime: function () {
                        var sTime = this.get("data.StartTime");
                        return kendo.format("{0:T}", sTime);
                    },
                    projEndTime: function () {
                        var eTime = this.get("data.ProjEndTime");
                        return kendo.format("{0:T}", eTime);
                    }
                }
            },

         /*   currentParticipantLap: {
                data: {},
                lapPace: function() {
                    var secs = this.get("data.LapPace");
                    return kendo.format("{0:0}:{1:00} min/mile", Math.floor(secs/60), Math.floor(secs % 60));
                }
            },*/

            // Initial values for refreshing view & cycling participants
            refreshInterval: null,
            refreshIntervalMS: function() {
                return viewModelContainer.refreshInterval * 1000;
            },
            cycleInterval: null,
            cycleCount: 3,


            // EVENTS
            saveViewOptions: function (e) {
                e.preventDefault();
                this.trigger("event:saveViewOptions");
            },
            deleteViewOptions: function (e) {
                e.preventDefault();
                this.trigger("event:deleteViewOptions");
            }

            // GRID FUNCTIONS: LATER
            /*
            dataBound: function (arg) {
                if (lastSelectedPartsId == null) return; // check if there was a row that was selected
                var view = this.liveTrackerSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].PartID == lastSelectedPartsId) { // find row with the lastSelectedProductd
                        var grid = arg.sender; // get the grid
                        grid.select(grid.table.find("tr[data-uid='" + view[i].uid + "']")); // set the selected row
                        break;
                    }
                }
            },
            // TODO: DO WE REALLY NEED THIS??
            onChange: function (arg) {
                var oldTrackerId = lastSelectedPartsId;
                var grid = arg.sender;
                //var x = $(arg.target).closest("tr").index();
                var dataItem = grid.dataItem(grid.select());
                lastSelectedPartsId = dataItem.TrackerID;
                alert("change");
                //maps.removeTracker(mapID, lastSelectedPartsId);

                // change back last icon
                if (oldTrackerId > 0)
                    maps.changeTrackerIcon(mapID, oldTrackerId, { icon: '/content/images/maps/green-marker-mini.png' });

                // set observable object
                viewModelContainer.set("liveTrackerItem", dataItem);

                maps.changeTrackerIcon(mapID, lastSelectedPartsId, { icon: '/content/images/maps/red-marker-mini.png' });

                // show the detail info view
                showHideViewCallback(contentString, "third", true);
            }*/
        });

        var getCustomTimeString = function (totalSeconds, pace, forceHours) {

            if (isNaN(totalSeconds))
                return "Calculating ...";

            forceHours = (typeof forceHours == "undefined") ? false : forceHours;

            if (pace == true) {
                return kendo.format("{0:0}:{1:00} mins/mile", getMinutes(totalSeconds), getSeconds(totalSeconds));
            } else {
                if (totalSeconds >= 3600 || forceHours)
                    return kendo.format("{0:0}:{1:00}:{2:00} hrs", getHours(totalSeconds), getMinutes(totalSeconds), getSeconds(totalSeconds));
                else
                    return kendo.format("{0:0}:{1:00} mins", getMinutes(totalSeconds), getSeconds(totalSeconds));
            }
                
        };

        // Format functions for vieModel
        var getDistanceString = function (dist) {
            if (isNaN(dist))
                return "n/a";

            return kendo.format("{0:#.00}", dist);
        };
        var getHours = function (totalSeconds) {
            return Math.floor(totalSeconds / 3600);
        };

        var getMinutes = function (totalSeconds) {
            return Math.floor((totalSeconds % 3600) / 60);
        };

        var getSeconds = function(totalSeconds) {
            return Math.floor(totalSeconds % 60);
        };

        viewModelContainer.bind("event:saveViewOptions", function (data) {
            if (courseRotateCtr > liveCourses.length) // We are currently in course overview mode, save view for courseID array
                cmaps.saveMapView(mainMapID, courseIDs);
            else // single course view, save coordinates under single course ID
                cmaps.saveMapView(mainMapID, currentLiveCourse);

        });

        viewModelContainer.bind("event:deleteViewOptions", function (data) {

            var result = sessionStorage.removeVar(currentLiveCourse.toString());
        });

        var timesUp = function () {
            // refresh the participants when ever time's up (start with first course)
            LiveParticipants.filter({ logic: "and", filters: [{ field: "CurrentCourse", operator: "eq", value: courseIDs[0] }, { field: "EventID", operator: "eq", value: currentEventId }] });
        };

        var rotateParticipant = function () {

            courseRotateCtr = 0;
            var currentCourseObj;
            var bCourseChange = false;
            // Check if this is a first run (no course yet) or if we have shown 6 participants on this course already
            // In either case, we need to select the next (first) course before doing anything else
            if (currentLiveCourse == 0) {
                currentCourseObj = rotateCourse(0, 0);   // call refresh course with INDEX (!! not ID) of 0 
                bCourseChange = true;
            } else if (partPerCourseCtr == 6) { // we've shown 6 participants on the current course, time to switch
                var nextIdx = (courseIDs.indexOf(currentLiveCourse) == courseIDs.length - 1) ? 0 : (courseIDs.indexOf(currentLiveCourse) + 1);
                currentCourseObj = rotateCourse(courseIDs.indexOf(currentLiveCourse), nextIdx);
                bCourseChange = true;
            } else { // just increase the lastPartID (this is called from rotate course for the first two cases)
                // retrieve a reference to the current live course object -- nice :-)
                currentCourseObj = liveCourses[courseIDs.indexOf(currentLiveCourse)];
                selectNextPartID(currentCourseObj);
            }

            // Check if we've already shown this participant in the current course rotation (happens when there's less than 6 participants on a course)
            if (currentCourseObj.lastPartID == currentCourseObj.firstPartID) {
                // reset last & first partID of the current course before moving on, so that we don't skip this item when we come back to this map
                currentCourseObj.firstPartID = selectPreviousPartID(currentCourseObj);
                // move on to next course
                var nextIdx = (courseIDs.indexOf(currentLiveCourse) == courseIDs.length - 1) ? 0 : (courseIDs.indexOf(currentLiveCourse) + 1);
                currentCourseObj = rotateCourse(courseIDs.indexOf(currentLiveCourse), nextIdx);
                bCourseChange = true;
            }

            // Here we move on to the next course if there are no participants on the course. However we have a safeguard against endless rotation if all courses are empty.
            // Cause that's how I roll :-)
            while (courseRotateCtr <= liveCourses.length && currentCourseObj.partArray.length == 0) {
                var nextIdx = (courseIDs.indexOf(currentLiveCourse) == courseIDs.length - 1) ? 0 : (courseIDs.indexOf(currentLiveCourse) + 1);
                currentCourseObj = rotateCourse(courseIDs.indexOf(currentLiveCourse), nextIdx);
                bCourseChange = true;
            }

            // Lastly, if we've just come across an empty course, make sure we rotate out next time ?? REMOVE for now cause we're not showing empty courses at all
            //    if (currentCourseObj.partArray.length <= 1) {
            //      partPerCourseCtr = 6;
            //  }

            // If we switched the course, reset the firstPartID of the course object! (so we will rotate when it comes up next)
            // Also set the map view to the new course
            // IF there's only ONE participant, we need to force the firstPartID to 0 to ensure the participant is shown once before rotating again!!
            if (bCourseChange == true) {
                //currentCourseObj.firstPartID = (currentCourseObj.partArray.length == 1) ? 0 : currentCourseObj.lastPartID;
                // CHANGED 2013-10-14: Always set to lastPartID because we have already shown this participant so it's ok to rotate them out next round!
                currentCourseObj.firstPartID =  currentCourseObj.lastPartID;
                if (courseRotateCtr > liveCourses.length) // all course are empty; show the overview map
                    cmaps.setMapViewToCourses(mainMapID, courseIDs, 15);
                else
                    cmaps.setMapViewToCourses(mainMapID, currentCourseObj.courseID);
            }
            // RIGHT HERE ... the course ain't gonna change anymore; refresh runners on the map, please :-)
            refreshRunnersOnMap();

            // obtain the participant object ...
            var liveParticipant = getLiveParticipantObject(currentCourseObj);
            // ... and save it to the view model
            viewModelContainer.set("activeParticipant.data", liveParticipant);

            

            if (liveParticipant != null) {

                // now update the datasource filter; this will automatically trigger the read of the LiveLap data
                // continue in the datasource.change() function of the LiveLap datasource ...
                // var partSkipCounter = 1;
                var partSkipCounter = null;
                for (var skipIdx = 0; skipIdx < viewModelContainer.partLapsSkipCounters.length; skipIdx++) {
                    if (viewModelContainer.partLapsSkipCounters[skipIdx].PartID == liveParticipant.PartID) {
                        // increase skip and use for query below
                        viewModelContainer.partLapsSkipCounters[skipIdx].Skip++;
                        partSkipCounter = viewModelContainer.partLapsSkipCounters[skipIdx].Skip;
                        break;
                    }
                }
                // if we didn't find a skip counter for this participant, add one now
                if (partSkipCounter == null) {
                    partSkipCounter = 1;
                    viewModelContainer.partLapsSkipCounters.push({ PartID: liveParticipant.PartID, Skip: partSkipCounter });
                }


                LiveLaps.filter({ logic: "and", filters: [{ field: "PartID", operator: "eq", value: liveParticipant.PartID }, { field: "EventID", operator: "eq", value: currentEventId }] });

                UpcomingLaps.query({
                    pageSize: liveLapPageSize,
                    page: partSkipCounter,
                    sort: { field: "LapNo", dir: "asc" },
                    filter: { logic: "and", filters: [{ field: "PartID", operator: "eq", value: liveParticipant.PartID }, { field: "EventID", operator: "eq", value: currentEventId }, { field: "LapNo", operator: "gt", value: liveParticipant.CurrentLap }] }
                });

                // LiveLaps.filter({ logic: "and", filters: [{ field: "PartID", operator: "eq", value: liveParticipant.PartID }, { field: "EventID", operator: "eq", value: currentEventId }, { field: "LapNo", operator: "gt", value: liveParticipant.CurrentLap }] });
            }
            // HERE GOES ALL THE PARTICIPANT SPECIFIC STUFF, i.e.
            // 1. Highlight the Runner on the main map
            // 2. Load all the sub-views with detailed maps, tables, etcs
            showNextParticipant(liveParticipant);

        };

        var getLiveParticipantObject = function (liveCourseObj) {
            for (var i = 0; i < viewModelContainer.courses.length; i++) {
                if (currentLiveCourse == viewModelContainer.courses[i].CourseID) { // found the course
                    for (var j = 0; j < viewModelContainer.courses[i].Participants.length; j++) {
                        if (liveCourseObj.lastPartID == viewModelContainer.courses[i].Participants[j].PartID) {
                            return viewModelContainer.courses[i].Participants[j];
                        }
                    }
                }
            }
            return null;
        };

        var selectNextPartID = function (courseObj) {
            // Now we can select the next participant (check if it's first participant on a course & if it's the last element in the array)
            if (courseObj.lastPartID == 0) // no participant selected on this course
                courseObj.lastPartID = (courseObj.partArray.length < 1) ? 0 : courseObj.partArray[0]; // ID remains 0 if there are no participants on course
            else if (courseObj.partArray.indexOf(courseObj.lastPartID) == courseObj.partArray.length - 1)
                courseObj.lastPartID = courseObj.partArray[0];
            else
                courseObj.lastPartID = courseObj.partArray[courseObj.partArray.indexOf(courseObj.lastPartID) + 1];

            // Don't forget to increase the counter
            partPerCourseCtr++;
        };

        var selectPreviousPartID = function (courseObj) {
            if (courseObj.partArray.indexOf(courseObj.lastPartID) == 0)
                courseObj.lastPartID = courseObj.partArray[courseObj.partArray.length - 1];
            else
                courseObj.lastPartID = courseObj.partArray[courseObj.partArray.indexOf(courseObj.lastPartID) - 1];

            return courseObj.lastPartID;
        };

        var showNextParticipant = function (participant) {
            // FIRST: Highlight the runner on the main map
            if (participant == null) {
                // remove the infobox
                cmaps.highlightParticipant(mainMapID, 0);
                cmaps.highlightParticipant(detailMapID, 0);
                cmaps.centerViewOnPin(detailMapID, "finishLine", "points", 18);
                // hide all the subviews with participant infos

                // RESET VIEW TO START FINISH LINE
                showHideViewCallback("event", "details", false);
                showHideViewCallback("event", "currentlap", false);
                showHideViewCallback("event", "laptable", false);

                return;
            }

            showHideViewCallback("event", "details", true);
            showHideViewCallback("event", "currentlap", true);
            showHideViewCallback("event", "laptable", true);

            // Make sure the current runner is in front and add the info-box as well!!
            cmaps.highlightParticipant(mainMapID, participant.PartID, { bib: String(participant.Bib), name: participant.ParticipantName });
            cmaps.highlightParticipant(detailMapID, participant.PartID, { bib: String(participant.Bib), name: participant.ParticipantName });

            cmaps.centerViewOnPin(detailMapID, participant.PartID, "participants", 19);
        };

        var refreshRunnersOnMap = function () {

            // remove highlights
            cmaps.highlightParticipant(mainMapID, 0);
            cmaps.highlightParticipant(detailMapID, 0);

            // Remove current participants on both maps
            cmaps.flushPins(mainMapID, "participants");
            cmaps.flushPins(detailMapID, "participants");

            var course;

            for (var crsCtr = 0; crsCtr < viewModelContainer.courses.length; crsCtr++) {

                course = viewModelContainer.courses[crsCtr];
                
                // add all the participants to the map
                for (var i = 0; i < course.Participants.length; i++) {

                    cPart = course.Participants[i];

                    // Add this participant
                    cmaps.addPin(mainMapID, cPart.PartID, "participants", cPart, { icon: "bib", text: String(cPart.Bib), style: "bib" });
                    cmaps.addPin(detailMapID, cPart.PartID, "participants", cPart, { icon: "bib", text: String(cPart.Bib), style: "bib" });
                }
            }
            
        };

        var rotateCourse = function (currentCourseIdx, nextCourseIndex) {

            var partIDs = [];
            var nextCourse = viewModelContainer.courses[nextCourseIndex];


            // Update our variables that track the state of the event page
            currentLiveCourse = nextCourse.CourseID;
            partPerCourseCtr = 0;

            // select the next participant for this course (or the first one, if this is the first time we're seeing this course)
            var currentCourseObj = liveCourses[courseIDs.indexOf(currentLiveCourse)];
            selectNextPartID(currentCourseObj);

            // remember that we switched a course 
            courseRotateCtr++;

            // Reset the "firstPartID" for this course
            // currentCourseObj.firstPartID = currentCourseObj.lastPartID; ??MOVED TO ROTATE PARTIICPANT;
            return currentCourseObj;
        }

        var refreshParticipants = function (courseIndex, dbPartArray) {

            var updPartArray = [];
            var oldPartArray = [];

            //extract part IDs from db Participants objects
            for (var i = 0; i < dbPartArray.length; i++) {
                updPartArray.push(dbPartArray[i].PartID);
            }

            // get reference to old part IDs
            oldPartArray = liveCourses[courseIndex].partArray;

            // FIRST: Go through old array and remove all participants that are not in the dbPartArray any longer
            for (var i = 0; i < oldPartArray.length; i++) {
                if ($.inArray(oldPartArray[i], updPartArray) == -1) { // particpant was previously on course, but is not any longer => REMOVE
                    // IF particpant to be removed was last selected => select next one (shift index + 1), also check if that would put us past the length of the array
                    if (liveCourses[courseIndex].lastPartID == oldPartArray[i]) {
                        liveCourses[courseIndex].lastPartID = (i == 0) ? oldPartArray[oldPartArray.length - 1] : oldPartArray[i - 1];
                    }
                    if (liveCourses[courseIndex].firstPartID == oldPartArray[i]) { // same thing for the first ID
                            liveCourses[courseIndex].firstPartID = (i == 0) ? oldPartArray[oldPartArray.length - 1] : oldPartArray[i - 1];
                        }
                    // Remove partID
                    oldPartArray.splice(i, 1);
                    // Decrement counter cause we removed an element
                    i--;
                }
            }

            // SECOND: Add any new participants that are not in the oldPartArray yet 
            for (var i = 0; i < updPartArray.length; i++) {
                if ($.inArray(updPartArray[i], oldPartArray) == -1)
                    oldPartArray.push(updPartArray[i]);
            }
        };

        /* DEPRECATED 
        var updateActiveParticipants = function () {
            for (i = 0; i < viewModelContainer.participants.length; i++) {
                if (activeParticipantIDs.indexOf(viewModelContainer.participants[i].PartID) == -1) // need to add ID to active participants
                    activeParticipantIDs.push(viewModelContainer.participants[i].PartID);
            }
        };

        var rotateActiveParticipant = function () {
            var nextParticipantID = activeParticipantIDs.shift(); // remove first element
            activeParticipantIDs.push(nextParticipantID); // add this ID to the end of the queue

            // request this participant from the datasource so we can store it in the view model for easy access by the view
            viewModelContainer.set("activeParticipant", viewModelContainer.liveParticipantSource.get(nextParticipantID));

            // TEST
          //  LiveLaps.filter({ field: "EventID", operator: "eq", value: currentEventId });
        };*/

        return {
            // add update function here!!
            init: function (id, callback) {

                // Store parameters for later use (yes, global ... how ugly :-( )
                showHideViewCallback = callback;
                currentEventId = parseInt(id);
           //     viewModelContainer.set("eventID", currentEventId);

                // Set the filter for the datasource; this will trigger a read!!
                viewModelContainer.eventSource.filter({ field: "EventID", operator: "eq", value: currentEventId });

                return viewModelContainer;
            },
            timeFormat: function(gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                var lapItem = viewModelContainer.liveLapSource.get(gridRow.LapID);

                return getCustomTimeString(gridRow.ProjTotalTime, false, false);

//                return kendo.format("({0}) {1}-{2}", phone.area, phone.prefix, phone.extension);

            },
            courseLookup: function(gridRow) {

            },
            viewModel: function () {
                return viewModelContainer;
            }
        }
    });
}).call(this);