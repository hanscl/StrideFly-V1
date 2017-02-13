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
    public class CoursesController : EntitySetController<Course, int>
    {
        private StrideFlyEntities context = new StrideFlyEntities();

        [Queryable(AllowedQueryOptions = AllowedQueryOptions.All)] // REMOVE FOR PRODUCTION => only necessary options should be allowed
        public override IQueryable<Course> Get()
        {

            return context.Courses;
        }

        protected override Course GetEntityByKey(int key)
        {
            return context.Courses.FirstOrDefault(s => s.CourseID == key);
        }

        public override void Delete([FromODataUri] int key)
        {
            Course c = context.Courses.FirstOrDefault(p => p.CourseID == key);
            if (c == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Courses.Remove(c);
            context.SaveChanges();
        }

        protected override Course UpdateEntity(int key, Course update)
        {
            if (!context.Courses.Any(p => p.CourseID == key))
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            context.Courses.Attach(update);
            context.Entry(update).State = System.Data.EntityState.Modified;
            context.SaveChanges();

            return update;
        }

        protected override Course CreateEntity(Course entity)
        {
            if (entity == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            context.Courses.Add(entity);
            context.SaveChanges();
            return entity;
        }

        protected override int GetKey(Course entity)
        {
            return entity.CourseID;
        }
    }
}
