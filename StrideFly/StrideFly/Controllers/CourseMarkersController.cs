using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using StrideFlyModel;
using System.Web.Http.OData;
using System.Web.Http.OData.Query;

namespace StrideFly.Controllers
{
    public class CourseMarkersController : EntitySetController<CourseMarker, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<CourseMarker> Get()
        {

            return context.CourseMarkers;
        }

        protected override CourseMarker GetEntityByKey(int key)
        {
            return context.CourseMarkers.FirstOrDefault(s => s.MarkerID == key);
        }

        public override void Delete([FromODataUri] int key)
        {
            CourseMarker cm = context.CourseMarkers.FirstOrDefault(p => p.MarkerID == key);
            if (cm == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.CourseMarkers.Remove(cm);
            context.SaveChanges();
        }

        protected override CourseMarker UpdateEntity(int key, CourseMarker update)
        {
            if (!context.CourseMarkers.Any(p => p.MarkerID == key))
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            context.CourseMarkers.Attach(update);
            context.Entry(update).State = System.Data.EntityState.Modified;
            context.SaveChanges();

            return update;
        }

        protected override CourseMarker CreateEntity(CourseMarker entity)
        {
            if (entity == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.CourseMarkers.Add(entity);
            context.SaveChanges();
            return entity;
        }

        protected override int GetKey(CourseMarker entity)
        {
            return entity.MarkerID;
        }
    }
}
