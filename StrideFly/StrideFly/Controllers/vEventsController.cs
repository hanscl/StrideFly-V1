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
    public class vEventsController : EntitySetController<vEvent, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<vEvent> Get()
        {

            return context.vEvents;
        }

        protected override vEvent GetEntityByKey(int key)
        {
            return context.vEvents.FirstOrDefault(s => s.EventID == key);
        }
    }
}
