(function () {
    define(["jQuery", "kendo"],
        function ($, kendo) {

            var courseID;
            var eventID;
            var adminShowItemView;
            var actionName;

            var viewModel = kendo.observable({
                data: []
            });

            $(document).bind("itemViewReady", function (e, args) { 
                if (args.name == "cupload") { // check if this view was switched too
                    $("#course-upload-file").kendoUpload({
                        multiple: false,
                        showFileList: false,
                        async: {
                            saveUrl: "api/Markers",
                            autoUpload: true
                        },
                        success: function (e) {
                            console.log("file upload complete; this is the response");
                            console.log(e.response);
                            window.app.navigate(kendo.format("#/admin/courses/{0}/cresult/{1}", eventID, courseID));
                        }
                    });
                }
            });

            return {
                init: function (xcontentName, item, showViewCallback, parent) {
                    courseID = item; // save item to module variable (revise at some point)
                    adminShowItemView = showViewCallback;
                    actionName = xcontentName;
                    eventID = parent;

                    showViewCallback(actionName, courseID, viewModel)
                },

                update: function(item, parent) {
                    courseID = item;
                    eventID = parent;
                }
            
            }
        });
}).call(this);