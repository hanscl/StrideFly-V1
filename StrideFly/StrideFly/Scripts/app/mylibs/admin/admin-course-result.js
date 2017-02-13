(function () {
    define(["jQuery", "kendo", "mylibs/maps/maps", "mylibs/maps/cmaps"],
        function ($, kendo, maps, cmaps) {

            var courseID;
            var adminShowItemView;
            var actionName;

            var markerUrl = "/odata/coursemarkers"; //?$filter=FK_Course eq null";
            var lastSelectedMarkerId;

            var mapID;

            /**** B. Define models for data objects ****/
            // B(1)  Course Marker Model
            var markerModel = kendo.data.Model.define({
                id: "MarkerID",
                fields: {
                    MarkerID: { type: "number", editable: false },
                    Longitude: { type: "number", editable: true },
                    Latitude: { type: "number", editable: true },
                    Altitude: { type: "number", editable: true },
                    Distance: { type: "number", editable: true },
                    Bearing: { type: "number", editable: true },
                    FK_Course: { type: "number", editable: true},
                    Include: { type: "boolean", editable: true }
                }
            });

            /**** C. Define dataSource configurations ***/
            // C(1) SimCard datasource 
            var Markers = new kendo.data.DataSource({
                type: "odata",
                transport: {
                    read: {
                        url: function (options) {
                            return markerUrl;
                        },
                        dataType: "json"
                    },
                    create: {
                        url: markerUrl,
                        dataType: "json",
                        type: "POST"
                    },
                    update: {
                        url: function (params) {
                            return markerUrl + "(" + params.MarkerID + ")";
                        },
                        dataType: "json",
                        type: "PUT",
                    },
                    destroy: {
                        url: function (params) {
                            var url = markerUrl + "(" + params.MarkerID + ")";
                            return url;
                        },
                        dataType: "json",
                        type: "DELETE"
                    },
                    parameterMap: function (data, operation) {
                        if (operation == "create" || operation == "update") {
                            //data.FK_SimCard = data.FK_SimCard !== "" ? data.FK_SimCard : null;
                            return JSON.stringify(data);
                        }

                        return kendo.data.transports["odata"].parameterMap(data, operation);
                    }
                },
                batch: false,
                serverPaging: false,
                serverSorting: false,
                sort: {field: "MarkerID", dir: "asc" },
                serverFiltering: true,
                filter: { field: "FK_Course", operator: "eq", value: null },
                pageSize: 5,
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
                    },
                    errors: function (data) {
                    }
                },
                change: function () {
                    viewModelContainer.set("markersArray", this.data());
                  //  adminShowItemView(actionName, courseID, viewModelContainer); // MOVED TO update
                }
            });

            /**** A. Define view model ****/
            var viewModelContainer = new kendo.observable({
                markerSource: Markers,

                dataBound: function (arg) {
                    if (lastSelectedMarkerId == null) return; // check if there was a row that was selected
                    var view = this.markerSource.view(); // get all the rows
                    for (var i = 0; i < view.length; i++) { // iterate through rows
                        if (view[i].MarkerID == lastSelectedMarkerId) { // find row with the lastSelectedProductd
                            var grid = arg.sender; // get the grid
                            grid.select(grid.table.find("tr[data-uid='" + view[i].uid + "']")); // set the selected row
                            break;
                        }
                    }
                },
                // TODO: DO WE REALLY NEED THIS??
                onChange: function (arg) {
                    var grid = arg.sender;
                    var dataItem = grid.dataItem(grid.select());
                    lastSelectedMarkerId = dataItem.MarkerID;
                },
                markersArray: [],

                // events
                previewCourse: function (e) {
                    e.preventDefault();
                    this.trigger("course:preview");
                },

                saveCourse: function (e) {
                    e.preventDefault();
                    this.trigger("course:save");
                },


                discardCourse: function (e) {
                    e.preventDefault();
                    this.trigger("course:discard");
                }

            });

            viewModelContainer.bind("course:discard", function () {
                if (confirm('Uploaded markers will be discarded and nothing will be saved! Proceed?')) {
                    $.ajax({
                        type: "DELETE",
                        url: "api/CourseApi/0",
                    });
                }
            });

            viewModelContainer.bind("course:preview", function () {
                var courseArray = [];

                for (i = 0; i < viewModelContainer.markersArray.length; i++) {
                    if(viewModelContainer.markersArray[i].Include == true)
                        courseArray.push(viewModelContainer.markersArray[i]);
                }

                cmaps.addCourse(mapID, 0, courseArray, { color: "yellow", thickness: 2 });
            });

            viewModelContainer.bind("course:save", function () {

                if (confirm('This will delete existing markers for this course! Please confirm that you want to proceed?')) {
                    $.ajax({
                        type: "DELETE",
                        url: "api/CourseApi/" + courseID,
                    });

                // Calculate elevation change
                var elevChange = 0;
                var iCnt;
                for (iCnt = 1; iCnt < viewModelContainer.markersArray.length; iCnt++) {
                    var diff = viewModelContainer.markersArray[iCnt].Altitude - viewModelContainer.markersArray[iCnt - 1].Altitude;
                    if (diff > 0)
                        elevChange = elevChange + diff;
                }

                // Adjust elevation (sloppy)
                elevChange = elevChange / 1.5;

                // obtain the course item from the grid and update
                var grid = $('#admin-courses-grid').data().kendoGrid;
                var course = grid.dataSource.get(courseID);
                course.set("Distance", viewModelContainer.markersArray[iCnt-1].Distance);
                course.set("ElevGain", elevChange);
                
                grid.dataSource.sync();

                // 1. update course markers => a) remove if "include == false" b) otherwise udpate FK_Course = courseID
                for (i = 0; i < viewModelContainer.markersArray.length; i++) {



                    if (viewModelContainer.markersArray[i].Include == false) {
                        viewModelContainer.markerSource.remove(viewModelContainer.markersArray[i]);
                        i--;
                    }
                    else
                    {

                        var item = viewModelContainer.markerSource.at(i);
                        if (item.FK_Course == null) {
                            item.set("FK_Course", courseID);
                        }
                    }

                }
               
                viewModelContainer.markerSource.sync();

                //eventDataSource.remove(modelContainer.eventItemData);
                    //eventDataSource.sync();

                } else {
                    // Do nothing!
                }

            });

            onMarkersPerMileChanged = function(arg) {
                var totalMarkers = viewModelContainer.markersArray.length;
                var newMarkers = Math.round(arg.value * viewModelContainer.markersArray[viewModelContainer.markersArray.length-1].Distance);
                    console.log(totalMarkers)
                    console.log(newMarkers);
                    console.log(arg);
                    var everyX = Math.round(totalMarkers / newMarkers);

                    var grid = $('#admin-course-result-grid').data().kendoGrid;
                    var dataArray = grid.dataSource.data();
                    for(var i = 0; i < dataArray.length; i++)
                    {
                        if(i == 0 || i == dataArray.length-1) {
                            dataArray[i].Include = true;
                        }
                        else if( i % everyX == 0)
                        {
                            dataArray[i].Include = true;
                        }
                        else {
                            dataArray[i].Include = false;
                        }
                    }
                    //$.each(grid.dataSource.data, function () {
                    //if(this['Include'] != state)
                    ///    this.dirty = true;
                    //this['Include'] = state;
                    //  console.log(this);

                    //});
                    grid.refresh();

                    // reset
            };

            $(document).bind("readyForMap", function (e, args) { // subscribe to the viewSwitchedEvent
                if (args.content == "cresult") { // check if this view was switched too
                    mapID = cmaps.createMap("admin-course-result-map");
                    cmaps.addCourse(mapID, courseID, viewModelContainer.markersArray, { color: "red", thickness: 3 });
                    cmaps.setMapViewToCourses(mapID, courseID);
                }
            });

            return {
                init: function (xcontentName, item, showViewCallback) {
                    courseID = item; // save item to module variable (revise at some point)
                    adminShowItemView = showViewCallback;
                    actionName = xcontentName;

                   

                    viewModelContainer.markerSource.fetch(function () {
                        
                     //   viewModelContainer.set("markersArray", viewModelContainer.markerSource.view());

                        // once datasource has been read, show the view
                        adminShowItemView(actionName, courseID, viewModelContainer);

                        markerCnt = viewModelContainer.markersArray.length;
                        maxMarkersPerMile = Math.round(markerCnt / viewModelContainer.markersArray[markerCnt-1].Distance);

                        // and initialize the slider
                        $("#admin-course-result-slider").kendoSlider({
                            min: 10,
                            smallStep: 5,
                            largeStep: 30,
                            orientation: "vertical",
                            value: maxMarkersPerMile,
                            max: maxMarkersPerMile,
                            change: onMarkersPerMileChanged
                        });
                    });
                },
                update: function (item) {
                    courseID = item;

                    viewModelContainer.markerSource.read();

                    adminShowItemView(actionName, courseID, viewModelContainer);
                },
                checkboxInit: function (gridRow) {

                    var include = viewModelContainer.markerSource.get(gridRow.MarkerID).Include;

                    checkedStr = include ? "checked='checked'":"";

                    var retStr = kendo.format("<input type='checkbox' {0} class='checkbox'/>", checkedStr);

                    return retStr; //("<input type='checkbox' #= include ? checked='checked':'' # class='checkbox'/>");

                    //return ("<input type='checkbox' checked='checked' class='checkbox'/>");
                }
            }
        });
}).call(this);