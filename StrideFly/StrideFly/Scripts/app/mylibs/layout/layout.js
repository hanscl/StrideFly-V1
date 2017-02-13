(function () {

    define(["jQuery", "kendo", "text!mylibs/layout/views/layout-admin.html", "mylibs/admin/admin"], function ($, kendo, template, admin) {

        $(document).bind("layoutSwitchedEvent", function (e, args) { // subscribe to the layoutSwitchedEvent
            if (args.name == "layoutContent") { // check if this layout was switched too
                args.loadView(args.viewreq, args.itemreq, args.action, args.subid);
            }
        });

    });

    

}).call(this);