define(["jQuery", "kendo", "text!mylibs/index/views/index-event-menu.html"], function ($, kendo, menuTemplate) {

    var crudServiceBaseUrl = "/odata/events";
  
    var indexViewModel = kendo.observable({
        items: [{ id: 1, name: "Event One" }, {id: 2, name: "Event 2" }],
        ignoreMenuDefault: function (e) {
            e.preventDefault();
        },
        dataSource: dataSource = new kendo.data.DataSource({
            type: "odata",
            transport: {
                read: {
                    url: crudServiceBaseUrl,
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
                }
            },
            success: function(options) {
                console.log(options);

            },
            serverFiltering: true,
            filter: {field: "Active", operator: "eq", value:true},
            error: function (e) {
                var message = e.xhr.responseJSON["odata.error"].message.value;
                var innerMessage = e.xhr.responseJSON["odata.error"].innererror.message;
                alert(message + "\n\n" + innerMessage);
            }         
        })
    });

    if ($("#index-event-menu").length === 0) {
        $(document.body).append(menuTemplate);
    }

    kendo.bind($("#header"), indexViewModel);

});
