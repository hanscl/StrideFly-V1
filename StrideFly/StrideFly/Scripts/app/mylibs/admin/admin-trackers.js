(function () {
    define(["jQuery", "kendo"], function ($, kendo) {
        var trackersUrl = "/odata/trackers";
        var simCardUrl = "/odata/simcards";
        var participantUrl = "/odata/participants";
        var lastSelectedTrackerId;

       
        /**** B. Define models for data objects ****/
        // B(1)  SimCard Model (Child)
        var simCardModel = kendo.data.Model.define({
            id: "SimID",
            fields: {
                SimID: { type: "number", editable: false },
                SimNo: { type: "string", editable: true },
                PhoneNo: { type: "string", editable: true },
                Provider: { type: "string", editable: true },
                PlanDesc: { type: "string", editable: true }
            }
        });

        // B(2)  Participant Model (Child)
        var participantModel = kendo.data.Model.define({
            id: "PartID",
            fields: {
                PartID: { type: "number", editable: false },
                Name: { type: "string", editable: false }
            }
        });

        /**** C. Define dataSource configurations ***/
        // C(1) SimCard datasource 
        var SimCards = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: function (options) {
                        return simCardUrl;
                    },
                    dataType: "json"
                }
            },
            schema: {
                model: simCardModel,
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

        // C(1) Participant source
        var Participants = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: { 
                    url: participantUrl,
                    dataType: "json"
                }
            },
            schema: {
                model: participantModel,
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

        // B(2)  Tracker Model (Parent)
       var trackerModel = kendo.data.Model.define({
            id: "TrackerID",
            fields: {
                TrackerID: { type: "number", editable: false },
                SerialNo: { type: "string", editable: true },
                IMEI: { type: "string", editable: true },
                Brand: { type: "string", editable: true },
                Model: { type: "string", editable: true },
                FK_SimCard: { editable: true },
                FK_Participant: { editable: true}
            }
        });

        // C(2) Tracker is parent and thus actual datasource 
        var Trackers = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: trackersUrl,
                    dataType: "json"
                },
                create: {
                    url: trackersUrl,
                    dataType: "json",
                    type: "POST"
                },
                update: {
                    url: function (params) {
                      //  delete params.guid;
                      //  delete params["odata.metadata"];
                        return trackersUrl + "(" + params.TrackerID + ")";
                    },
                    dataType: "json",
                    type: "PUT",
                  //  contentType: "application/json;odata=verbose"
                },
                destroy: {
                    url: function (params) {
                        var url = trackersUrl + "(" + params.TrackerID + ")";
                        return url;
                    },
                    dataType: "json",
                    type: "DELETE"
                },
                parameterMap: function (data, operation) {
                    if (operation == "create" || operation == "update") {
                            data.FK_SimCard = data.FK_SimCard !== "" ? data.FK_SimCard : null; // if it's a string set to null, otherwise leave as is (= null or int)
                            data.FK_Participant = data.FK_Participant !== "" ? data.FK_Participant : null; // if it's a string set to null, otherwise leave as is (= null or int)

                        // Return JSON data
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
                model: trackerModel,
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
               // SimCards.read(); CHECK
                // Participants.read();
            },
            sync: function(options) {
                // console.log(options);
           //     alert("sync complete");
           //     var grid = $('#admin-trackers-grid').data().kendoGrid;
           //     grid.refresh();
            }
        });

        /**** A. Define view model ****/
        var viewModelContainer = new kendo.observable({
            simCardSource: SimCards,
            participantSource: Participants,
            trackerSource: Trackers,  // initialize trackerSource reference; 

            dataBound: function (arg) {
                if (lastSelectedTrackerId == null) return; // check if there was a row that was selected
                var view = this.trackerSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].TrackerID == lastSelectedTrackerId) { // find row with the lastSelectedProductd
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
                lastSelectedTrackerId = dataItem.TrackerID;
            }
        });

        return {  // init & update function for the admin module
            init: function () {
                
                viewModelContainer.simCardSource.fetch(function () {
                    viewModelContainer.participantSource.fetch(function () {
                        viewModelContainer.trackerSource.read();
                    });
                });
                
                return viewModelContainer;
            },

            update: function () {
                viewModelContainer.trackerSource.read();
            },

            simCardEditor: function (container, options) {
                $("<input />")
                .attr("data-bind", "value:FK_SimCard")
                 .attr("data-value-primitive", "true")
                .appendTo(container)
                .kendoDropDownList({
                    dataSource: viewModelContainer.simCardSource,
                    dataTextField: "PhoneNo",
                    dataValueField: "SimID",
                    optionLabel: "[None]"
                });
            },
            simCardLookup: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                if (gridRow.FK_SimCard > 0) {
                    var simCardItem = viewModelContainer.simCardSource.get(gridRow.FK_SimCard);

                    var phone = {area: "", prefix:"", extension:""};
                    var digits = simCardItem.PhoneNo.split("");
                    for (i = 0; i < 3; i++) {
                        phone.area = phone.area + digits[i];
                    }
                    for (i = 3; i < 6; i++) {
                        phone.prefix = phone.prefix + digits[i];
                    }
                    for (i = 6; i < 10; i++) {
                        phone.extension = phone.extension + digits[i];
                    }

                    return kendo.format("({0}) {1}-{2}", phone.area, phone.prefix, phone.extension);

                    //return simCardItem.PhoneNo;
                }
                else
                    return "[None]";
            },
            participantEditor: function (container, options) {
                $("<input />")
                .attr("data-bind", "value:FK_Participant")
                .attr("data-value-primitive", "true")
                .appendTo(container)
                .kendoDropDownList({
                    dataSource: viewModelContainer.participantSource,
                    dataTextField: "Name",
                    dataValueField: "PartID",
                    optionLabel: "[None]"
                });
            },
            participantLookup: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                if (gridRow.FK_Participant > 0) {
                    var partItem = viewModelContainer.participantSource.get(gridRow.FK_Participant);
                    return partItem.Name;
                }
                else
                    return "[None]";
            } ,
            addTracker: function () {
                console.log("addingTrackerFunction");
                viewModelContainer.trackerSource.add(new trackerModel());
                viewModelContainer.trackerSource.sync();
            }
        }

    });
}).call(this);