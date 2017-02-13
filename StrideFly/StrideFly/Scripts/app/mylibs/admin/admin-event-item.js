(function () {
    define(["jQuery", "kendo"], function ($, kendo) {

        var crudServiceBaseUrl = "/odata/events";
        var eventID;
        var adminShowItemView;

        var eventItemData;
        var contentName;

        var modelContainer = new kendo.observable({
            /**** EVENT HANDLERS ****/
            saveEvent: function (e) {
                e.preventDefault();
                this.trigger("event:save");
            },
            cancelEdit: function (e) {
                e.preventDefault();
                this.trigger("event:discardChanges");
            },
            deleteEvent: function (e) {
                e.preventDefault();
                this.trigger("event:delete");
            },
            /****** DATA *****/
            eventItemData: [],
            seriesData: []
        });


        /**** Event Handlers for new/update/delete operations ***/
        modelContainer.bind("event:save", function () {
            if (eventID == 0) { // New event, add to datasource before syncing
                eventDataSource.add(modelContainer.eventItemData);
            }
            eventDataSource.sync();
        });

        modelContainer.bind("event:delete", function () {
            eventDataSource.remove(modelContainer.eventItemData);
            eventDataSource.sync();
        });

        modelContainer.bind("event:discardChanges", function () {
            window.app.navigate("#/admin/events");
        });


        /**** Series Datasource -- doesn't change here, so only read once to populat dropdown list ***/
        var seriesDataSource = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: "/odata/raceseries",
                    dataType: "json"
                }
            },
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
                    id: "SeriesID"
                }
            },
            change: function (e) {
                // NOthing here; use callback function with fetch() method since this is only read once
            },
            error: function (e) {
                var message = e.xhr.responseJSON["odata.error"].message.value;
                var innerMessage = e.xhr.responseJSON["odata.error"].innererror.message;
                alert(message + "\n\n" + innerMessage);
            }
        });

        var eventItemModel = kendo.data.Model.define({
            id: "EventID",
            fields: {
                EventID: { type: "number", editable: false },
                Name: { type: "string", editable: true },
                Location: { type: "string", editable: true },
                Start: { type: "datetime", editable: true },
                End: { type: "datetime", editable: true },
                FK_RaceSeries: { type: "number", editable: true },
                Laps: { type: "number", editable: true }
            }
        });

        /***** Event datasource returning selecting item; this is where most of the functionality sits ***/
        var eventDataSource = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: function (params) {
                        var url = crudServiceBaseUrl + "(" + eventID + ")";
                        console.log(url);
                        return url;
                    },
                    dataType: "json"
                },
                    create: {
                        url: crudServiceBaseUrl,
                        dataType: "json",
                        type: "POST"
                    },
                    update: {
                        url: function (params) {
                            delete params.guid;
                            delete params["odata.metadata"];
                            return crudServiceBaseUrl + "(" + eventID + ")";
                        },
                        dataType: "json",
                        type: "PUT",
                        contentType: "application/json;odata=verbose"
                    },
                    destroy: {
                        url: function (params) {
                            var url = crudServiceBaseUrl + "(" + eventID + ")";
                            return url;
                        },
                        dataType: "json",
                        type: "DELETE"
                    },
                    parameterMap: function (data, operation) {
                        if (operation == "update") {
                            delete data.guid;
                            delete data["odata.metadata"];
                        }
                        return JSON.stringify(data);
                    }
            },
            schema: {
                type: "json",
                data: function (data) {
                    delete data["odata.metadata"]; //ROLLBACK
                    return [data];//.value; // IMPORTANT: THIS NEEDS TO CHANGE TO data.value IF MORE THAN ONE ITEM IS TO BE RETURNED (WEIRD, NO?)
                },
                total: function (data) {
                    //return data["odata.count"];
                    return 1; // 'cause this is always returning one??
                },
                errors: function (data) {
                },
                model: eventItemModel,
                /*{
                    id: "EventID" /*, // ADDING A MODEL CREATES AN ERROR WITH "ODATA.METADA" AFTER UPDATING; NOT SURE WHY AT THIS POINT!
                    fields: {
                        Name: { type: "string", editable: true, nullable: false, validation: { required: true } },
                        Location: { type: "string", editable: true, nullable: true, validation: { required: true } },
                        Start: { type: "datetime", editable: true, nullable: true, validation: { required: true } },
                        End: { type: "datetime", editable: true, nullable: true, validation: { required: true } },
                        FK_RaceSeries: { type: "number", editable: true, nullable: false, validation: { required: true } }
                    }
                },*/
                parse: function (response) {
                    response.End = kendo.parseDate(response.End, "yyyy-MM-ddTHH:mm:ss");
                    response.Start = kendo.parseDate(response.Start, "yyyy-MM-ddTHH:mm:ss");

                    return response;
                }
            },
            sync: function (e) {
                window.app.navigate("#/admin/events");
            },
            change: function (e) {
                modelContainer.set("eventItemData", eventDataSource.get(eventID));
            },
            error: function (e) {
                var message = e.xhr.responseJSON["odata.error"].message.value;
                var innerMessage = e.xhr.responseJSON["odata.error"].innererror.message;
                alert(message + "\n\n" + innerMessage);
            }
        });

        // Handle everything that needs to be done when the view is shown
        $(document).bind("viewItemEvent", function (e, args) { // subscribe to the viewSwitchedEvent
            if (args.section == "admin" && args.view == "events") { // check if this view was switched too

                // 1. if itemID == => new event; handle later
                if (args.item == 0) {

                } else {    // read the datasource with the requested EventID
                    //     eventDataSource.read({ id: args.item });
                }
            }
        });



        return {
            init: function (xcontentName, item, showViewCallback) {

                eventID = item; // save item to module variable (revise at some point)
                adminShowItemView = showViewCallback;
                contentName = xcontentName;

                // read the datasource for the raceseries
                seriesDataSource.fetch(function () {

                    // obtain the database view and save it to our view-model
                    modelContainer.set("seriesData", seriesDataSource.view());

                    // If eventID == 0 we need to create a new event => do not fetch from datasource but create new model instance for binding
                    if (eventID == 0) {
                        modelContainer.set("eventItemData", new eventItemModel({ Start: new Date(), End: new Date(), FK_RaceSeries: "" }));
                        // Call back to the admin module
                        adminShowItemView(contentName, eventID, modelContainer);
                    } else { // Existing event, go fetch it!
                        // Now fetch the event item data and callback to the admin module to finish loading the view
                        eventDataSource.fetch(function () {
                            modelContainer.set("eventItemData", eventDataSource.get(eventID));
                            // Call back to the admin module
                            adminShowItemView(contentName, eventID, modelContainer);
                        });
                    }

                });
            },
            update: function (item) {
                eventID = item;
                if (eventID == 0) {
                    modelContainer.set("eventItemData", new eventItemModel({ Start: new Date(), End: new Date(), FK_RaceSeries: "" }));
                    console.log("initial ID:" + modelContainer.eventItemData.FK_RaceSeries);
                } else {
                    eventDataSource.read();
                }
            },
        }
    });
}).call(this);