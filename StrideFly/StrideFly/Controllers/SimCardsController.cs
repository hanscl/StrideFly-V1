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
    public class SimCardsController : EntitySetController<SimCard, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<SimCard> Get()
        {

            return context.SimCards;
        }

        protected override SimCard GetEntityByKey(int key)
        {
            return context.SimCards.FirstOrDefault(s => s.SimID == key);
        }

        public override void Delete([FromODataUri] int key)
        {
            SimCard sc = context.SimCards.FirstOrDefault(p => p.SimID == key);
            if (sc == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.SimCards.Remove(sc);
            context.SaveChanges();
        }

        protected override SimCard UpdateEntity(int key, SimCard update)
        {
            if (!context.SimCards.Any(p => p.SimID == key))
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            context.SimCards.Attach(update);
            context.Entry(update).State = System.Data.EntityState.Modified;
            context.SaveChanges();

            return update;


            // return base.UpdateEntity(key, update);
        }

        // CREATE OPERATION (POST)
        protected override SimCard CreateEntity(SimCard entity)
        {
            if (entity == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.SimCards.Add(entity);
            context.SaveChanges();
            return entity;
        }

        protected override int GetKey(SimCard entity)
        {
            return entity.SimID;
        }
    }
}
