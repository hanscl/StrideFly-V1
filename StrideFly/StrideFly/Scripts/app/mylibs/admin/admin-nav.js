(function () {
    define(["jQuery", "kendo", "mylibs/admin/admin-trackers"], function ($, kendo, adminTrackers) {

        var adminNavModel = kendo.observable({
            addEvent: function (e) {
                e.preventDefault();
                this.trigger("event:add");
            },
            addTracker: function (e) {
                e.preventDefault();
                this.trigger("tracker:add");
            }
        });

        adminNavModel.bind("event:add", function () {
            window.app.navigate("#/admin/events/0");
        });

        adminNavModel.bind("tracker:add", function () {
            adminTrackers.addTracker();
        });

        return {
            init: function (e) {    
                kendo.bind($("#admin-view-nav"), adminNavModel);
            }
        }

    });
}).call(this);