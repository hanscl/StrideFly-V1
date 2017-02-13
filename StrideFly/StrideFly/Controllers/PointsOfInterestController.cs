using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.OData;
using System.Web.Http.OData.Query;
using StrideFlyModel;

namespace StrideFly.Controllers
{
    public class PointsOfInterestController : EntitySetController<PointOfInterest, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<PointOfInterest> Get()
        {

            return context.PointOfInterests;
        }
    }
}
