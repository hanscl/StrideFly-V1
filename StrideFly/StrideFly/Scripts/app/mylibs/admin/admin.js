(function () {
    define(["jQuery", "kendo", "mylibs/layout/layout", "mylibs/admin/admin-event-grid", "mylibs/admin/admin-nav", "mylibs/admin/admin-trackers", "mylibs/admin/admin-simcards", "mylibs/admin/admin-participants", "mylibs/admin/admin-courses", "mylibs/admin/admin-settings", "text!mylibs/layout/views/layout-admin.html", "text!mylibs/admin/views/admin-view-nav.html", "text!mylibs/admin/views/admin-view-event-grid.html", "text!mylibs/admin/views/admin-view-trackers.html", "text!mylibs/admin/views/admin-view-simcards.html", "text!mylibs/admin/views/admin-view-participants.html", "text!mylibs/admin/views/admin-view-event-item.html", "text!mylibs/admin/views/admin-view-settings.html"],
        function (jQuery, kendo, layoutContent, adminEvent, adminNav, adminTrackers, adminSimcards, adminParticipants, adminCourses, adminSettings, layoutAdminView, adminViewNav, adminViewEvent, adminViewTrackers, adminViewSimcards, adminViewParticipants, adminViewEventItem, adminViewSettings) {

            var layout = null;
            var views = { nav: null, events: null, trackers: null, simcards: null, settings: null, courses: null, participants: null };
            var templates = { events: adminViewEvent, trackers: adminViewTrackers, simcards: adminViewSimcards, courses:adminCourses.adminViewCourses, settings: adminViewSettings , participants:adminViewParticipants};
            var itemViews = { events: null, settings: null,  cupload: null };
            var itemTemplates = { events: adminViewEventItem,  cupload: adminCourses.adminViewCourseUpload, cresult: adminCourses.adminViewCourseResult };
            var models = { events: adminEvent, trackers: adminTrackers, simcards: adminSimcards, settings: adminSettings, courses: adminCourses, participants: adminParticipants };
            var itemModels = { events: adminEvent.adminEventItem, settings: null, cedit: adminCourses.adminCourseEdit, cupload: adminCourses.adminCourseUpload, cresult: adminCourses.adminCourseResult };

            var showItemView = function (contentName, itemID, viewModel) {
                // if viewModel is not defined, this is the first time, otherwise only show view
                if (typeof viewModel !== "undefined") {
                    // Create & bind the item view
                    itemViews[contentName] = new kendo.View(itemTemplates[contentName], { model: viewModel });
                }
                // Always show the view
                layout.showIn("#admin-content-lower", itemViews[contentName]);

                // Make sure the item view is loaded before displaying map
                $(document).trigger("readyForMap", { content: contentName});

            }

            var loadItemView = function (contentName, itemID, parentID) {

                // do we need to show an item?
                if (typeof itemID !== "undefined") {
                    if (itemViews[contentName] == null) { // check if content has been previously loaded
                        itemModels[contentName].init(contentName, itemID, showItemView, parentID);
                    }
                    else {
                        // Update the eventItem with the new ID
                        itemModels[contentName].update(itemID, parentID);
                        // Make sure it's shown (in case it was navigated away from previously)
                        layout.showIn("#admin-content-lower", itemViews[contentName]);

                        showItemView(contentName, itemID);
                    }
                } 
                else // no item requested, hide the item view
                {
                    layout.showIn("#admin-content-lower", new kendo.View("<section id='blank'></section>"));
                }

                // Trigger viewSwitchedEvent
                $(document).trigger("itemViewReady", { name: contentName});
           //     $(document).trigger("viewItemEvent", { section: "admin", view: contentName, item: itemID});
            }
            
            /* Load the main admin view requested */
            var loadView = function (contentName, itemID, action, subid) {

                if (typeof contentName !== "undefined") {
                    // check if content name provided, otherwise default
                    contentName = typeof contentName !== "undefined" ? contentName : "events";


                    if (views[contentName] == null) { // check if content has been previously loaded
                        views[contentName] = new kendo.View(templates[contentName], { model: models[contentName].init(itemID) });
                    }
                    else {
                        // Read the database in case it changed
                        models[contentName].update(itemID);
                    }

                    // Always show the view
                    layout.showIn("#admin-content-upper", views[contentName]);

                    // INSTEAD OF USING EVENT INSIDE EVENT-GRID.JS
                    if (contentName == "courses") {
                        loadItemView(action, subid, itemID);
                    } else {
                        loadItemView(contentName, itemID);
                    }

                }
                  
                // FIX
                // show the views
                layout.showIn("#admin-column-nav", views.nav); // TODO: NAV VIEW NEED NOT BE SHOWN EVERYTIME

                // let the views know that they may be up ....
                $(document).trigger("viewSwitchedEvent", { section: "admin", view: contentName, item: itemID, loadItemView: loadItemView });
            }

            return {
                
                init: function (content, id, action, subid) {

                    if (layout == null) { 
                        // load layout & all views
                        layout = new kendo.Layout(layoutAdminView);
                        views.nav = new kendo.View(adminViewNav);
                    }
                        
                    // bind the nav view ot it's model
                    adminNav.init();

                    // build jquery selector string
                    var allNavs = "div.btn-group-admin-nav a";
                    $(allNavs).toggleClass("active", false);

                    var selector = "#admin-nav-btn-" + content;
                    $(selector).toggleClass("active");


                    // Trigger layoutSwitchedEvent
                    $(document).trigger("layoutSwitchedEvent", { name: "layoutContent", viewreq: content, itemreq: id, loadView: loadView, action: action, subid: subid });
                    return layout;
                },

                adminEvent: adminEvent,
                adminTrackers: adminTrackers,
                adminSimcards: adminSimcards,
                adminCourses: adminCourses,
                adminParticipants: adminParticipants
            }

        });
}).call(this);