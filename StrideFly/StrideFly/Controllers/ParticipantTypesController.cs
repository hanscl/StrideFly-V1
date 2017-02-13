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
    public class ParticipantTypesController : EntitySetController<ParticipantType, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<ParticipantType> Get()
        {

            return context.ParticipantTypes;
        }

        protected override ParticipantType GetEntityByKey(int key)
        {
            return context.ParticipantTypes.FirstOrDefault(s => s.TypeID == key);
        }
    }
}
