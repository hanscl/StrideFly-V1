(function () {
    define(["jQuery", "kendo", "text!mylibs/admin/views/admin-view-courses.html",  "mylibs/admin/admin-course-upload", "mylibs/admin/admin-course-result",  "text!mylibs/admin/views/admin-view-course-upload.html", "text!mylibs/admin/views/admin-view-course-result.html"],
        function ($, kendo, adminViewCourses,  adminCourseUpload, adminCourseResult, adminViewCourseUpload, adminViewCourseResult) {
        var coursesUrl = "/odata/courses";
        var eventsUrl = "/odata/events";
        var lastSelectedCourseId;
        var eventID;


        /**** B. Define models for data objects ****/
        // B(1) Event (simpliefied, for reference in Course table only)
        var eventModel = kendo.data.Model.define({
            id: "EventID",
            fields: {
                EventID: { type: "number", editable: false },
                Name: { type: "string", editable: false }
            }
        });

        /**** C. Define dataSource configurations ***/
        // C(1) Event datasource 
        var Events = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: function (options) {
                        return eventsUrl;
                    },
                    dataType: "json"
                }
            },
            schema: {
                model: eventModel,
                type: "json",
                data: function (data) {
                    return data.value;
                },
                total: function (data) {
                    return data["odata.count"];
                },
                errors: function (data) {
                }
            },
            change: function () {
            }
        });

        // B(2)  Course Model (Parent)
        var courseModel = kendo.data.Model.define({
            id: "CourseID",
            fields: {
                CourseID: { type: "number", editable: false },
                Name: { type: "string", editable: true },
                Distance: { type: "number", editable: true },
                ElevGain: { type: "number", editable: true },
                Order: { type: "number", editable: true },
                Description: { type: "string", editable: true },
                StrokeColor: { type: "string", editable: true },
                StrokeThickness: { type: "number", editable: true },
                StrokeDash: { type: "string", editable: true },
                FK_Event: { editable: true }
            }
        });

        // C(2) Courses Datasource
        var Courses = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: function (options) {
                        return kendo.format("{0}?$filter=FK_Event eq {1}", coursesUrl, eventID);  // Always filter by eventID
                    },
                    dataType: "json"
                },
                create: {
                    url: coursesUrl,
                    dataType: "json",
                    type: "POST"
                },
                update: {
                    url: function (params) {
                        //  delete params.guid;
                        //  delete params["odata.metadata"];
                        return coursesUrl + "(" + params.CourseID + ")";
                    },
                    dataType: "json",
                    type: "PUT",
                    //  contentType: "application/json;odata=verbose"
                },
                destroy: {
                    url: function (params) {
                        var url = coursesUrl + "(" + params.CourseID + ")";
                        return url;
                    },
                    dataType: "json",
                    type: "DELETE"
                },
                parameterMap: function (data, operation) {
                    /*   if (operation == "update") {
                           delete data.guid;
                           delete data["odata.metadata"];
                       }
                       return JSON.stringify(data);*/
                    if (operation == "create" || operation == "update") {
                        data.Distance = kendo.format("{0}", data.Distance);
                        data.ElevGain = kendo.format("{0}", Math.round(data.ElevGain));
                        data.FK_Event = data.FK_Event !== "" ? data.FK_Event : null;
                        // TRY THIS
                     //   data.StrokeThickness = kendo.format("{0}", data.StrokeThickness);
                        return JSON.stringify(data);
                    }

                    return kendo.data.transports["odata"].parameterMap(data, operation);
                }
            },
            batch: false,
            serverPaging: true,
            serverSorting: true,
            serverFiltering: true,
            pageSize: 10,
            schema: {
                model: courseModel,
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
                }
            },
            change: function (e) {
                Events.read();
            },
            sync: function (options) {
             //   console.log(options);
            }
        });

        /**** A. Define view model ****/
        var viewModelContainer = new kendo.observable({
            eventSource: Events,
            courseSource: Courses,  // initialize trackerSource reference; 

            dataBound: function (arg) {
                if (lastSelectedCourseId == null) return; // check if there was a row that was selected
                var view = this.courseSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].CourseID == lastSelectedCourseId) { // find row with the lastSelectedProductd
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
                lastSelectedCourseId = dataItem.CourseID;
            }
        });

        return {
            init: function (xEventId) {

                eventID = xEventId;

                viewModelContainer.eventSource.fetch(function () {
                    viewModelContainer.courseSource.read();
                });

                return viewModelContainer;
            },

            update: function (xEventId) {
                eventID = xEventId;

                viewModelContainer.courseSource.read();
            },
            eventEditor: function (container, options) {
                $("<input />")
                .attr("data-bind", "value:FK_Event")
                .appendTo(container)
                .kendoDropDownList({
                    dataSource: viewModelContainer.eventSource,
                    dataTextField: "Name",
                    dataValueField: "EventID",
                    optionLabel: "[None]"
                });
            },
            eventLookup: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                if (gridRow.FK_Event > 0) {
                    var eventItem = viewModelContainer.eventSource.get(gridRow.FK_Event);

                    return eventItem.Name;

                }
                else
                    return "[None]";
            },
            uploadMarkers: function (e) {
               // alert("upload markers");
                e.preventDefault();
                var tr = $(e.currentTarget).closest("tr");
                var dataItem = $("#admin-courses-grid").data("kendoGrid").dataItem(tr);
                window.app.navigate(kendo.format("#/admin/courses/{0}/cupload/{1}", eventID, dataItem.CourseID));
            },

            adminViewCourses: adminViewCourses,
            adminCourseUpload: adminCourseUpload,
            adminCourseResult: adminCourseResult,
            adminViewCourseUpload: adminViewCourseUpload,
            adminViewCourseResult: adminViewCourseResult

        }
    });
}).call(this);