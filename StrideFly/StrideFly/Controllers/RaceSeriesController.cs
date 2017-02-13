using StrideFlyModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.OData;
using System.Web.Http.OData.Query;

namespace StrideFly.Controllers
{
    public class RaceSeriesController : EntitySetController<RaceSeries, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<RaceSeries> Get()
        {

            return context.RaceSeries1;
        }

        protected override RaceSeries GetEntityByKey(int key)
        {
            return context.RaceSeries1.FirstOrDefault(s => s.SeriesID == key);
        }
    }
}
