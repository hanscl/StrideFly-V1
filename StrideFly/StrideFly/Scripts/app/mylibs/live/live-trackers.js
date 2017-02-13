(function () {
    define(["jQuery", "kendo", "mylibs/maps/maps", "mylibs/maps/cmaps"], function ($, kendo, maps, cmaps) {

        var liveTrackersUrl = "/odata/livetrackers";
        var lastSelectedTrackerId;
        var mapID = null;
        var contentString = "trackers";
        var showHideViewCallback;
        var timer = null;
        var timerInterval = 10 * 1000; // 10 seconds

        /**** A. Define Models for data objects ****/
        // LiveTrackers (View)
        var liveTrackersModel = kendo.data.Model.define({
            id: "TrackerID",
            fields: {
                TrackerID: { type: "number", editable: false },
                PointID: { type: "number", editable: false },
                DateTime: { type: "datetime", editable: false },
                Latitude: { type: "number", editable: false },
                Longitude: { type: "number", editable: false },
                Altitude: { type: "number", editable: false },
                ParticipantName: { type: "string", editable: false },
                Bib: { type: "number", editable: false },
                EventName: { type: "string", editable: false },
                BatteryPct: { type: "number", editable: false }
            }
        });
        
        // Main datasource : LIVETRACKERS (View)
        var LiveTrackers = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: liveTrackersUrl,
                    dataType: "json"
                },
                parameterMap: function (data, operation) {
                    return kendo.data.transports["odata"].parameterMap(data, operation);
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: false,
            schema: {
                model: liveTrackersModel,
                type: "json",
                data: function (data) {
                    //delete data["odata.metadata"]; // Need to do this for update action?
                    if (data.value) {
                        return data.value;
                    }
                    delete data["odata.metadata"];
                    return [data];
                    //     return data.value; // IMPORTANT: THIS NEEDS TO CHANGE TO [data] IF ONLY ONE ITEM IS TO BE RETURNED (WEIRD, NO?)
                },
                total: function (data) {
                    return data["odata.count"];
                },
                errors: function (data) {
                },
                parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                    for (var i = 0; i < response.value.length; i++) {
                        response.value[i].DateTime = kendo.parseDate(response.value[i].DateTime, "yyyy-MM-ddTHH:mm:ss");
                    }
                    return response;
                }
            },

            change: function (e) {
                viewModelContainer.set("trackPointArray", this.data());

                if (mapID == null) {
                    mapID = cmaps.createMap("live-trackers-map");
                }
              
                    


                updateView();
            },
        });

        /**** C. Define view model ****/
        var viewModelContainer = new kendo.observable({
            liveTrackerSource: LiveTrackers,
            trackPointArray: [],
            liveTrackerItem: null,

          /*  batteryStatus: function() {
                return kendo.format("{0:P0}", liveTrackerItem.BatteryPct);
            },*/

            dataBound: function (arg) {
                if (lastSelectedTrackerId == null) return; // check if there was a row that was selected
                var view = this.liveTrackerSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].PartID == lastSelectedTrackerId) { // find row with the lastSelectedProductd
                        var grid = arg.sender; // get the grid
                        grid.select(grid.table.find("tr[data-uid='" + view[i].uid + "']")); // set the selected row
                        break;
                    }
                }
            },
            // TODO: DO WE REALLY NEED THIS??
            onChange: function (arg) {
                var oldTrackerId = lastSelectedTrackerId;
                var grid = arg.sender;
                //var x = $(arg.target).closest("tr").index();
                var dataItem = grid.dataItem(grid.select());
                lastSelectedTrackerId = dataItem.TrackerID;

                //maps.removeTracker(mapID, lastSelectedTrackerId);

                // change back last icon
                if (oldTrackerId > 0)
                    cmaps.changePinOptions(mapID, oldTrackerId, "trackers", {icon: "greenMarkerMini"});
                    //maps.changeTrackerIcon(mapID, oldTrackerId, { icon: '/content/images/maps/green-marker-mini.png' });

                // set observable object
                viewModelContainer.set("liveTrackerItem", dataItem);

                cmaps.changePinOptions(mapID, lastSelectedTrackerId, "trackers", { icon: "redMarkerMini" });
                //maps.changeTrackerIcon(mapID, lastSelectedTrackerId, { icon: '/content/images/maps/red-marker-mini.png' });

                // show the detail info view
                showHideViewCallback(contentString, "third", true);
            }
        });

     

        var updateView = function () {
            
            var trackerIDs = [];

            // flush map view
            cmaps.flushPins(mapID, "trackers");

            if (viewModelContainer.trackPointArray.length < 1)
                return;

            for (i = 0; i < viewModelContainer.trackPointArray.length; i++) {

                trackPt = viewModelContainer.trackPointArray[i];
                trackerIDs.push(trackPt.TrackerID);   // save tracker IDs so we can set the view afterwards

                // Add this tracker
                cmaps.addPin(mapID, trackPt.TrackerID, "trackers", trackPt, { icon: "greenMarkerMini" });
            }


            if (trackerIDs.length > 1) {
                // set the map view
                cmaps.setMapViewToPins(mapID, trackerIDs, "trackers");
            }
            else { // set to single point
                cmaps.centerViewOnPin(mapID, trackerIDs.shift(), "trackers", 18) 
            }
        };
   
        var timesUp = function () {
            // refresh the participants when ever time's up (start with first course)
            LiveTrackers.read();
        };

        return {
            init: function (id, callback) {

                showHideViewCallback = callback;
                
                timer = window.setInterval(timesUp, timerInterval);

                viewModelContainer.liveTrackerSource.read();

                return viewModelContainer;
            },

            eventFormat: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                return (gridRow.EventName != null ? "Yes" : "No");
            },

            bibFormat: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                return (gridRow.Bib != null ? gridRow.Bib : "n/a");
            },
            viewModel: function() {
                return viewModelContainer;
            }
        }
    });
}).call(this);