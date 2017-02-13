(function () {

    define(["jQuery", "kendo", "text!mylibs/layout/views/layout-main.html", "mylibs/admin/admin"], function ($, kendo, template, admin) {
        var layout;
        return layout = new kendo.Layout(template);
    });

}).call(this);