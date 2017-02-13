(function () {

    define(["jQuery", "kendo", "text!mylibs/unbounce/views/unbounce.html"], function ($, kendo, template) {
        var view = null;

        return {
            init: function () {
                if (view == null) {
                    return view = new kendo.View(template);
                }
                else {
                    return view;
                }
            }
        }
        
    });
}).call(this);1