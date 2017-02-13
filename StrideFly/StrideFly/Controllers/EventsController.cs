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
    public class EventsController : EntitySetController<Event, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions=AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<Event> Get()  
        {
            
            return context.Events;
        }

        protected override Event GetEntityByKey(int key)
        {
            return context.Events.FirstOrDefault(s=> s.EventID == key);
        }

        public override void Delete([FromODataUri] int key)
        {
            Event ev = context.Events.FirstOrDefault(p => p.EventID == key);
            if (ev == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Events.Remove(ev);
            context.SaveChanges();
        }

        protected override Event UpdateEntity(int key, Event update)
        {
            if (!context.Events.Any(p => p.EventID == key))
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            context.Events.Attach(update);
            context.Entry(update).State = System.Data.EntityState.Modified;
            context.SaveChanges();

            return update;


           // return base.UpdateEntity(key, update);
        }

        // CREATE OPERATION (POST)
        protected override Event CreateEntity(Event entity)
        {
            if (entity == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            if (entity.TimeDiffPT == null)
                entity.TimeDiffPT = 0;

            context.Events.Add(entity);
            context.SaveChanges();
            return entity;
        }

        protected override int GetKey(Event entity)
        {
            return entity.EventID;
        }
    }
}
