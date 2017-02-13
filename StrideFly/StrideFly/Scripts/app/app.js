define(["jQuery", "kendo", "mylibs/unbounce/unbounce", "mylibs/admin/admin",  "mylibs/live/live" ,"mylibs/layout/layout-main", "mylibs/index/index", "mylibs/util/util-session-storage"], function ($, kendo, unbounce, admin, live, layoutMain, index, utilSessionStorage) {

    var app, container;
    container = "#layout-main";

    app = new kendo.Router({
        init: function () {
            return layoutMain.render("#application");
        }
    });

    return {
        init: function () {
            // add routes below
            app.route("/", function () {
                return layoutMain.showIn(container, unbounce.init());
            });

            app.route("/admin/courses/:eventid(/:action)(/:courseid)", function (eventid, action, courseid) {
                return layoutMain.showIn(container, admin.init("courses", eventid, action, courseid));
            });

            app.route("/admin(/:content)(/:id)", function (content, id) {
                return layoutMain.showIn(container, admin.init(content, id));
            });

            app.route("/live(/:content)(/:id)", function (content, id) {
                    return layoutMain.showIn(container, live.init(content, id));
            });

            return app.start();
        },

        navigate: function (route) {
            return app.navigate(route);
        },

        admin: admin,
        live: live
    }
});

