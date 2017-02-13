using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.OData.Builder;
using StrideFlyModel;

namespace StrideFly
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Uncomment the following line to activate global authorization
        //    config.Filters.Add(new AuthorizeAttribute());

            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );

            // Uncomment the following line of code to enable query support for actions with an IQueryable or IQueryable<T> return type.
            // To avoid processing unexpected or malicious queries, use the validation settings on QueryableAttribute to validate incoming queries.
            // For more information, visit http://go.microsoft.com/fwlink/?LinkId=279712.
            config.EnableQuerySupport();

            ODataModelBuilder modelBuilder = new ODataConventionModelBuilder();

            modelBuilder.EntitySet<Event>("events");
            modelBuilder.EntitySet<RaceSeries>("raceseries");
            modelBuilder.EntitySet<vEvent>("vevents");
            modelBuilder.EntitySet<Tracker>("trackers");
            modelBuilder.EntitySet<SimCard>("simcards");
            modelBuilder.EntitySet<Course>("courses");
            modelBuilder.EntitySet<CourseMarker>("coursemarkers");
            modelBuilder.EntitySet<Participant>("participants");
            modelBuilder.EntitySet<TrackPoint>("trackpoints");
            modelBuilder.EntitySet<ParticipantType>("participanttypes");
            modelBuilder.EntitySet<LiveTracker>("livetrackers");
            modelBuilder.EntitySet<LiveParticipant>("liveparticipants");
            modelBuilder.EntitySet<Lap>("laps");
            modelBuilder.EntitySet<LiveLap>("livelaps");
            modelBuilder.EntitySet<CoursePoint>("coursepoints");
            modelBuilder.EntitySet<PointOfInterest>("pointsofinterest");
            
            Microsoft.Data.Edm.IEdmModel model = modelBuilder.GetEdmModel();
            config.Routes.MapODataRoute("ODataRoute", "odata", model);
        }
    }
}