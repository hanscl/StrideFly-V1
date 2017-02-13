(function () {
    define(["jQuery", "kendo", "mylibs/admin/admin-event-item"], function ($, kendo, adminEventItem) {

        var lastSelectedEventId;
        var crudServiceBaseUrl = "/odata/vevents";
        var eventItemModel;

        var eventsModel = kendo.observable({
            data: [],
            dataSource: dataSource = new kendo.data.DataSource({
                type: "odata",
                transport: {
                    read: {
                        url: crudServiceBaseUrl,
                        dataType: "json"
                    }
                },
                batch: false,
                serverPaging: true,
                serverSorting: true,
                serverFiltering: true,
                pageSize: 10,
                schema: {
                    data: function (data) {
                        return data.value;
                    },
                    total: function (data) {
                        return data["odata.count"];
                    },
                    errors: function (data) {
                    },
                    model: {
                        id: "EventID",
                        fields: {
                            EventID: { type: "number", editable: false },
                            Name: { type: "string", editable: false, nullable: false, validation: { required: true } },
                            Location: { type: "string", editable: false, nullable: true, validation: { required: true } },
                            Start: { type: "datetime", editable: false, nullable: true, validation: { required: true } },
                            End: { type: "datetime", editable: false, nullable: true, validation: { required: true } },
                            SeriesName: { type: "string", editable: false, nullable: false, validation: { required: true } },
                            SeriesType: { type: "string", editable: false, nullable: false, validation: { required: true } },
                            Laps: { type: "number", editable: false, nullable: true, validation: { required: true } }
                        }
                    },
                    parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                        for (var i = 0; i < response.value.length; i++) {
                            response.value[i].End = kendo.parseDate(response.value[i].End, "yyyy-MM-ddTHH:mm:ss");
                            response.value[i].Start = kendo.parseDate(response.value[i].Start, "yyyy-MM-ddTHH:mm:ss");
                        }
                        return response;
                    }
                },
                error: function (e) {
                    var message = e.xhr.responseJSON["odata.error"].message.value;
                    var innerMessage = e.xhr.responseJSON["odata.error"].innererror.message;
                    alert(message + "\n\n" + innerMessage);
                },
                change: function (e) {
                    eventsModel.set("data", this.view());   // save the data to the observable object so we can bind to regular HTML elements as well => NEEDED FOR GRID???
                }
            }),

            dataBound: function (arg) {
                if (lastSelectedEventId == null) return; // check if there was a row that was selected
                var view = this.dataSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].EventID == lastSelectedEventId) { // find row with the lastSelectedProductd
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
                lastSelectedEventId = dataItem.EventID;

                if (eventItemModel == null) {
                    eventItemModel = kendo.observable({
                        event: dataItem
                    });
                } else {
                    eventItemModel.set("event", dataItem);
                }
            }
        });

        // Bind the view to the model when it's loaded // TODO: SHouldn't have to be done everytime
        $(document).bind("viewSwitchedEvent", function (e, args) { // subscribe to the viewSwitchedEvent
            if (args.section == "admin" && args.view == "events") { // check if this view was switched too
                //    kendo.bind($("#admin-event-form"), eventsModel); // bind the view to the model // TODO: Should this be called from the amdin.js module (like event-item)?? YES!!

                // Load (or Hide) item view
                //     args.loadItemView(args.view, args.item);  // CALL FROM ADMIN

            } else {// view already been loaded in cache
                // eventsModel.dataSource.read(); // refresh grid // MOVED TO update() function
            }
        });

        return {
            init: function () {
                return eventsModel;
            },

            update: function () {
                eventsModel.dataSource.read();
            },

            editEvent: function (e) {
                //  alert("edit event");
                e.preventDefault();
                var tr = $(e.currentTarget).closest("tr");
                var dataItem = $("#admin-event-grid").data("kendoGrid").dataItem(tr);
                window.app.navigate("#/admin/events/" + dataItem.EventID);
            },
            editCourses: function (e) {
               //  alert("edit courses");
                e.preventDefault();
                var tr = $(e.currentTarget).closest("tr");
                var dataItem = $("#admin-event-grid").data("kendoGrid").dataItem(tr);
                window.app.navigate("#/admin/courses/" + dataItem.EventID);
            },
            adminEventItem: adminEventItem
        }
    });
}).call(this);
