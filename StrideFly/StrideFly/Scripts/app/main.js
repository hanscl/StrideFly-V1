var app;

(function () {

    require.config({
        waitSeconds: 60,
        paths: {
            jQuery: "/Scripts/jquery-2.0.2.min",
            kendo: "../kendo/2013.2.716/kendo.all",
            bootstrap: "../bootstrap.min",
            text: "/Scripts/text"
        },
        shim: {
            kendo: {
                deps: ["jQuery"],
                exports: "kendo"
            },
            bootstrap: {
                deps: ["jQuery"]
            },
            jQuery: {
                deps: ["text"],
                exports: "jQuery"
            }
        }
    });

    require(["jQuery", "kendo", "bootstrap", "app", "domReady"], function ($, kendo, bootstrap, application, domReady) {
        $(function () {
            app = application;
            application.init();
        });


        // this will be called when the DOM is ready
        domReady(function () {

            // Main content resize & scrollbar stuff
            $(function () {

                $(window).resize(function () {
                    console.log("resizing window");
                    console.log($(window).width());
                    if ($(window).width() < 1000) {
                        console.log("collapsing your stuff");   
                        $(".my-collapse").hide();
                    }
                    else {
                        $(".my-collapse").show();
                    }
                    // $("#content-main").css({ "max-height": (($(window).height()) - 150) + "px" });
                });
            });
        });
    });
}).call(this);