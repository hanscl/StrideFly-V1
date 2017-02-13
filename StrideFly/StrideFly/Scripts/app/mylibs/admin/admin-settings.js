(function () {
    define(["jQuery", "kendo"], function ($, kendo) {

        var crudServiceBaseUrl = "/odata/events";

        var eventModel = kendo.data.Model.define({
            id: "EventID",
            fields: {
                EventID: { type: "number", editable: false },
                Name: { type: "string", editable: false },
                Active: { type: "number", editable: true },
                RefreshInterval: { type: "number", editable: true }
            }
        }); 
        
        var Events = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: crudServiceBaseUrl,
                    dataType: "json"
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: false,
            schema: {
                data: function (data) {
                    return data.value;
                },
                total: function (data) {
                    return data["odata.count"];
                },
                errors: function (data) {
                },
                model: eventModel,
                parse: function (response) { // Parse the data to convert the date time string from SQL into a proper format
                    return response;
                }
            },
            error: function (e) {
                var message = e.xhr.responseJSON["odata.error"].message.value;
                var innerMessage = e.xhr.responseJSON["odata.error"].innererror.message;
                alert(message + "\n\n" + innerMessage);
            },
            change: function (e) {
                // eventsModel.set("data", this.view());   // save the data to the observable object so we can bind to regular HTML elements as well => NEEDED FOR GRID???
            }
        });

        var viewModelContainer = kendo.observable({
            eventSource: Events,
            selectedEvent: {},
            // events
            onSelect: function (e) {
               // alert("clicked");
                //e.preventDefault();
                var dataItem = this.eventSource.at(e.item.index());
                this.trigger("event:select", { data: dataItem });
            },
        });

        /**** Event Handlers for new/update/delete operations ***/
        viewModelContainer.bind("event:select", function (data) {
           // alert(data.data.Name);
            if (eventID == 0) { // New event, add to datasource before syncing
                eventDataSource.add(modelContainer.eventItemData);
            }
            eventDataSource.sync();
        });

        return {
            init: function () {
                return viewModelContainer;
            },

            update: function () {
              //  eventsModel.dataSource.read();
            }
        }
    });
}).call(this);
