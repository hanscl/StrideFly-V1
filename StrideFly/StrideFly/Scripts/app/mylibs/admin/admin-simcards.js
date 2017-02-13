(function () {
    define(["jQuery", "kendo"], function ($, kendo) {
        var simCardUrl = "/odata/simcards";
        var lastSelectedSimId;

       
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
                },
                create: {
                    url: simCardUrl,
                    dataType: "json",
                    type: "POST"
                },
                update: {
                    url: function (params) {
                        return simCardUrl + "(" + params.SimID + ")";
                    },
                    dataType: "json",
                    type: "PUT",
                },
                destroy: {
                    url: function (params) {
                        var url = simCardUrl + "(" + params.SimID + ")";
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
            serverPaging: true,
            serverSorting: true,
            serverFiltering: true,
            pageSize: 10,
            schema: {
                model: simCardModel,
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
            }
        });

        /**** A. Define view model ****/
        var viewModelContainer = new kendo.observable({
            simCardSource: SimCards,

            dataBound: function (arg) {
                if (lastSelectedSimId == null) return; // check if there was a row that was selected
                var view = this.simCardSource.view(); // get all the rows
                for (var i = 0; i < view.length; i++) { // iterate through rows
                    if (view[i].SimID == lastSelectedSimId) { // find row with the lastSelectedProductd
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
                lastSelectedSimId = dataItem.SimID;
            }
        });

        return {  // init & update function for the admin module
            init: function () {
                
                viewModelContainer.simCardSource.read();
                
                return viewModelContainer;
            },

            update: function () {
                viewModelContainer.simCardSource.read();
            },

            simNoFormat: function (gridRow) {
                // obtain the model instance corresponding to the FK_SimCard key
                var simCardItem = viewModelContainer.simCardSource.get(gridRow.SimID);

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
            }
        }

    });
}).call(this);