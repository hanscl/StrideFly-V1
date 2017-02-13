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
    public class ParticipantsController : EntitySetController<Participant, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<Participant> Get()
        {

            return context.Participants;
        }

        protected override Participant GetEntityByKey(int key)
        {
            return context.Participants.FirstOrDefault(s => s.PartID == key);
        }

        public override void Delete([FromODataUri] int key)
        {
            Participant pc = context.Participants.FirstOrDefault(p => p.PartID == key);
            if (pc == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Participants.Remove(pc);
            context.SaveChanges();
        }

        protected override Participant UpdateEntity(int key, Participant update)
        {
            if (!context.Participants.Any(p => p.PartID == key))
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            context.Participants.Attach(update);
            context.Entry(update).State = System.Data.EntityState.Modified;
            context.SaveChanges();

            return update;


            // return base.UpdateEntity(key, update);
        }

        // CREATE OPERATION (POST)
        protected override Participant CreateEntity(Participant entity)
        {
            if (entity == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Participants.Add(entity);
            context.SaveChanges();
            return entity;
        }

        protected override int GetKey(Participant entity)
        {
            return entity.PartID;
        }
    }
}
