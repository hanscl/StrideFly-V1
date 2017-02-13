(function () {
    define(["jQuery", "kendo","mylibs/live/live-event", "mylibs/live/live-trackers", "text!mylibs/layout/views/layout-live.html","text!mylibs/live/views/live-event-bigmap.html", "text!mylibs/live/views/live-event-smallmap.html", "text!mylibs/live/views/live-event-layout.html","text!mylibs/live/views/live-event-details.html","text!mylibs/live/views/live-event-currentlap.html","text!mylibs/live/views/live-event-laptable.html", "text!mylibs/live/views/live-trackers-map.html","text!mylibs/live/views/live-trackers-info.html","text!mylibs/live/views/live-trackers-third.html" ], 
        function ($, kendo, liveEvent, liveTrackers, layoutViewLive, liveViewEventBigmap, liveViewEventSmallmap, liveViewEventLayout, liveViewEventDetails, liveViewEventCurrentLap, liveViewEventLapTable, liveViewTrackersMap, liveViewTrackersInfo, liveViewTrackersThird) {

            var layoutTemplate = layoutViewLive; // The layout template for the live section => only one for everything
            var layoutModels = { event: liveEvent, trackers: liveTrackers };  // The models for the live pages (they contain the view model)
            var layoutViews = { event: null, trackers: null }; // once the kendo View has been created from the templates & bound to the model            
            var layoutContainerDivs = ["#live-main-map", "#live-secondary-upper", "#live-secondary-lower"] // where to put the element Views
           

            // Dealing with the sublayouts -- this is way complicated
            var subLayoutStatus = { event: true, trackers: false }; // i don't think this matters
            var subLayoutTemplates = { event: liveViewEventLayout };
            var subLayoutViews = {event: null };
            var subLayoutIndices = { event: 2 };
            var subLayoutContainerDivs = { event: ["#live-event-top", "#live-event-middle", "#live-event-bottom"] };

            // Where do the element views go?
            var elementIndices = { 
                event: { 
                    bigmap: {index: 0, initial: true},
                    smallmap: {index: 1, initial: false},
                },
                trackers: {
                    info: {index:1,initial:true}, 
                    map: {index:0, initial:true}, 
                    third: {index:2, inital:false}
                } 
            };
            var elementSubIndices = {
                event: {
                    details: {index:0, initial: false},
                    currentlap: {index: 1, initial: false},
                    laptable: {index: 2, initial: false}
                }
            };

            // note that there are no separate models for the elemens, they use the same one 
            var elementViews = { event: [null,null,null], trackers: [null,null,null] };  // the kendo view objects ...
            var elementTemplates = {event: [liveViewEventBigmap, liveViewEventSmallmap], trackers: [ liveViewTrackersMap, liveViewTrackersInfo, liveViewTrackersThird] };  // element HTML templates

            // and here go the subviews & templates; still same model for all
            var elementSubViews = {event: [null,null,null]};
            var elementSubTemplates = {event: [liveViewEventDetails, liveViewEventCurrentLap, liveViewEventLapTable]};

            var blankView = new kendo.View("<div></div>");
            var detailInfoIndex = 2; // this should go 

            var detailInfoView = function (content, show) {
                if (show == true)
                    layoutViews[content].showIn(layoutContainerDivs[detailInfoIndex], elementViews[content][detailInfoIndex]);
                else
                    layoutViews[content].showIn(layoutContainerDivs[detailInfoIndex], blankView);
            };

            var showHideView = function (content, viewName, show) {
                // Check if this is subelement
                var subElem = (typeof elementSubIndices[content] == "undefined" || typeof elementSubIndices[content][viewName] == "undefined") ? false : true;

                // assign the correct objects
                if (subElem == true) {
                    indices = elementSubIndices;
                    layouts = subLayoutViews;
                    divs = subLayoutContainerDivs;
                    views = elementSubViews;

                } else {    
                    indices = elementIndices;
                    layouts = layoutViews;
                    divs = layoutContainerDivs;
                    views = elementViews;
                }

                var elemIndex = indices[content][viewName].index;


                // Show or hide
                if (show == true) {
                    if (subElem == true) {
                        layouts[content].showIn(divs[content][elemIndex], views[content][elemIndex]);
                    }
                    else {
                        layouts[content].showIn(divs[elemIndex], views[content][elemIndex]);
                    }
                }
                else {
                    if (subElem == true) {
                        layouts[content].showIn(divs[content][elemIndex], blankView);
                    }
                    else {
                        layouts[content].showIn(divs[elemIndex], blankView);
                    }

                }
            };

            var loadViews = function (content, views, templates, divs, indices,layouts, sub) {
                var showView; 

                for (i = 0; i < views[content].length; i++) {
                    
                    // first check if this position is a sub template instead of a view
                    if (sub == false && subLayoutIndices[content] == i) {
                        // load & show the relevant sublayout, then call the LoadView function recursively to load the views into the sublayout
                        subLayoutViews[content] = new kendo.Layout(subLayoutTemplates[content], { model: layoutModels[content].viewModel() });
                        // hope the show doesn't cause any problems at this point, though it shouldn't
                        layouts[content].showIn(divs[i], subLayoutViews[content]);

                        // Load the views inside the layout for this content (recursive function call)
                        loadViews(content, elementSubViews, elementSubTemplates, subLayoutContainerDivs[content], elementSubIndices, subLayoutViews, true);

                        // don't load views for this index, continue with next
                        continue;
                    }
                    

                    // Always load the view!
                    views[content][i] = new kendo.View(templates[content][i], { model: layoutModels[content].viewModel() });

                    // find the view and check should be show initially
                    showView = false; // initial as false
                    if (typeof indices[content] != "undefined") {
                        for (x  in indices[content]) {
                            if (indices[content][x].index == i && indices[content][x].initial == true) {
                                showView = true;
                                break; // we're done
                            }
                        }
                    }
                    
                    if(showView == true) 
                        layouts[content].showIn(divs[i], views[content][i]); // change layout view, make parameter in function
                    else
                        layouts[content].showIn(divs[i], blankView);

                }
            };

            return {
                init: function (content, id, action, subid) {

                    // Check if layout has been previous loaded and bound
                    if (layoutViews[content] != null) {
                        return; // we've done this before; do not reload layout & views
                    }

                    // Create main (live) layout view and bind to the view-Model
                    layoutViews[content] = new kendo.Layout(layoutViewLive, { model: layoutModels[content].init(id, showHideView) });

                    // Load the views inside the layout for this content
                    loadViews(content, elementViews, elementTemplates, layoutContainerDivs, elementIndices, layoutViews, false);

                    // check that all the views have been previously loaded and shown(?)
           /*         for (i = 0; i < elementViews[content].length; i++) {
                        if (elementViews[content][i] == null) {
                            elementViews[content][i] = new kendo.View(elementTemplates[content][i],{ model: layoutModels[content].viewModel() });
                            // show the view in the template (=> THIS MAY NOT WORK UNTIL LAYOUT IS VISIBLE)
                            if(i == 2)  // Do not show detail info view initially
                                layoutViews[content].showIn(layoutContainerDivs[i], blankView);
                            else
                                layoutViews[content].showIn(layoutContainerDivs[i], elementViews[content][i]);
                        }
                    }
                    */
                    return layoutViews[content];
                },

                


                liveEvent: liveEvent,
                liveTrackers: liveTrackers
            }
        });
}).call(this);