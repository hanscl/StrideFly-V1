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
    public class TrackersController : EntitySetController<Tracker, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<Tracker> Get()
        {

            return context.Trackers;
        }

        protected override Tracker GetEntityByKey(int key)
        {
            return context.Trackers.FirstOrDefault(s => s.TrackerID == key);
        }

        public override void Delete([FromODataUri] int key)
        {
            Tracker tr = context.Trackers.FirstOrDefault(p => p.TrackerID == key);
            if (tr == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Trackers.Remove(tr);
            context.SaveChanges();
        }

        protected override Tracker UpdateEntity(int key, Tracker update)
        {
            if (!context.Trackers.Any(p => p.TrackerID == key))
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            context.Trackers.Attach(update);
            context.Entry(update).State = System.Data.EntityState.Modified;
            context.SaveChanges();

            return update;


            // return base.UpdateEntity(key, update);
        }

        // CREATE OPERATION (POST)
        protected override Tracker CreateEntity(Tracker entity)
        {
            if (entity == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Trackers.Add(entity);
            context.SaveChanges();
            return entity;
        }

        protected override int GetKey(Tracker entity)
        {
            return entity.TrackerID;
        }
    }
}
