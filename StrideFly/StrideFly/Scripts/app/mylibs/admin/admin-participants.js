(function () {
    define(["jQuery", "kendo"], function ($, kendo) {
        var participantUrl = "/odata/participants";
        var eventUrl = "/odata/events";
        var partTypeUrl = "/odata/participanttypes";
        var lastSelectedPartId;


        /**** A. Define Models for data objects ****/
        // A(1)  ParticipantType (Child) => only include fields needed for dropdown lookup
        var partTypeModel = kendo.data.Model.define({
            id: "TypeID",
            fields: {
                TypeID: { type: "number", editable: false },
                Description: { type: "string", editable: false }
            }
        });

        // A(2)  Event Model (Child) => only include fields needed for dropdown lookup
        var eventModel = kendo.data.Model.define({
            id: "EventID",
            fields: {
                EventID: { type: "number", editable: false },
                Name: { type: "string", editable: false }
            }
        });

        // A(3)  Participant Model (Parent) => include all fields
        var participantModel = kendo.data.Model.define({
            id: "PartID",
            fields: {
                PartID: { type: "number", editable: false },
                Name: { type: "string", editable: true },
                Bib: { type: "number", editable: true },
                FK_Type: { editable: true },
                Runners: { type: "number", editable: true },
                FK_Event: {  editable: true },
                // the following fields are added for testing & launch-phase to quickly edit participants in the admin tool; change later
                Lap: { type: "number", editable: true },    // for live tracking, not used here except when creating new objects
                CourseNo: { type: "number", editable: true },    // for live tracking, not used here except when creating new objects
                FK_Course: { editable: true } ,   // for live tracking, not used here except when creating new objects
                StartFinishPos: {type: "number", editable: true }
            }
        });

        /**** B. Define dataSource configurations ***/
        // B(1) Participant Type datasource 
        var PartTypes = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: partTypeUrl,
                    dataType: "json"
                }
            },
            schema: {
                model: partTypeModel,
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

        // B(2) Event source
        var Events = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: eventUrl,
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

        // B(3) Main datasource (parent): PARTICIPANTS 
        var Participants = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: participantUrl,
                    dataType: "json"
                },
                create: {
                    url: participantUrl,
                    dataType: "json",
                    type: "POST"
                },
                update: {
                    url: function (params) {
                        return participantUrl + "(" + params.PartID + ")";
                    },
                    dataType: "json",
                    type: "PUT",
                },
                destroy: {
                    url: function (params) {
                        var url = participantUrl + "(" + params.PartID + ")";
                        return url;
                    },
                    dataType: "json",
                    type: "DELETE"
                },
                parameterMap: function (data, operation) {
                    if (operation == "create" || operation == "update") {
                        data.FK_Type = data.FK_Type !== "" ? data.FK_Type : null; // if it's a string set to null, otherwise leave as is (= null or int)
                        data.FK_Event = data.FK_Event !== "" ? data.FK_Event : null; // if it's a string set to null, otherwise leave as is (= null or int)
                        data.FK_Course = data.FK_Course !== "" ? data.FK_Course : null; // if it's a string set to null, otherwise leave as is (= null or int)

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
                model: participantModel,
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
               // var grid = $('#admin-participants-grid').data().kendoGrid;
                // grid.refresh();
              //  console.log("XXXXXXXXXXXXXXX STEP THREE: Participants loaded");
            },
            sync: function (options) {
            }
        });

        /**** C. Define view model ****/
        var viewModelContainer = new kendo.observable({
            participantSource: Participants,
            partTypeSource: PartTypes,
            eventSource: Events,

            dataBound: function (arg) {
                if (lastSelectedPartId == null) return; // check if there was a row that was selected
                var view = this.participantSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].PartID == lastSelectedPartId) { // find row with the lastSelectedProductd
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
                lastSelectedPartId = dataItem.PartID;
            }
        });

        return {  // init & update function for the admin module
            init: function () {

                viewModelContainer.eventSource.fetch(function () {
                    //console.log("XXXXXXXXXXXXXXX STEP ONE: Events loaded");
                    viewModelContainer.partTypeSource.fetch(function () {
                      //  console.log("XXXXXXXXXXXXXXX STEP TWO: Types loaded");
                        viewModelContainer.participantSource.read();
                    });
                });

                return viewModelContainer;
            },

            update: function () {
                viewModelContainer.participantSource.read();
            },

            eventEditor: function (container, options) {
                $("<input />")
                .attr("data-bind", "value:FK_Event")
                 .attr("data-value-primitive", "true")
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
            partTypeEditor: function (container, options) {
                $("<input />")
                .attr("data-bind", "value:FK_Type")
                .attr("data-value-primitive", "true")
                .appendTo(container)
                .kendoDropDownList({
                    dataSource: viewModelContainer.partTypeSource,
                    dataTextField: "Description",
                    dataValueField: "TypeID",
                    optionLabel: "[None]"
                });
            },
            partTypeLookup: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                if (gridRow.FK_Type > 0) {
                    var typeItem = viewModelContainer.partTypeSource.get(gridRow.FK_Type);
                    return typeItem.Description;
                }
                else {

                }
                    return "[None]";
            },
            positionLookup: function (gridRow) {
                if (gridRow.StartFinishPos == 0)
                    return "None";
                else if (gridRow.StartFinishPos == 1)
                    return "Start";
                else if (gridRow.StartFinishPos == 2)
                    return "Finish";

                
            }
        }

    });
}).call(this);