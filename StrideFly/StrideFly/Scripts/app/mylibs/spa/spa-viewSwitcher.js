define(["jQuery", "kendo", "spa-templateLoader"], function ($, kendo, spaTemplateLoader) {

    var views = {};
    var layouts = { main: null, admin: null, event: null };

    return {

        initMainLayout: function () {

            console.log("loading template");
            // Load template => calls function above
            spaTemplateLoader.loadExtTemplate("layout-main", "/content/views/layout-main.html");
            console.log("got it");
            layouts.main = new kendo.Layout($('#layout-main').html());
            layouts.main.render($("#app"));
        }
    }
});