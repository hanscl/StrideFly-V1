using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using StrideFly.Entities;
using StrideFly.Utils;
using StrideFlyModel;
using System.IO;

namespace StrideFly.Controllers
{
    public class CourseApiController : ApiController
    {
        [HttpDelete]
        public HttpResponseMessage Delete(int id)
        {
            try
            {
                StrideFlyEntities context = new StrideFlyEntities();
                string sqlStr;

                if (id == 0) // DELETE null values
                {
                    sqlStr = "DELETE FROM CourseMarkers WHERE FK_Course is null";
                }
                else
                {
                    sqlStr = String.Format("DELETE FROM CourseMarkers WHERE FK_Course = {0}", id);
                }                

                context.Database.ExecuteSqlCommand(sqlStr);

                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
            catch (Exception ex)
            {
                HttpResponseMessage message = new HttpResponseMessage(HttpStatusCode.InternalServerError);
                message.Content = new StringContent(String.Format("{0}\n{1}\n{2}", ex.Message, ex.InnerException.Message, ex.InnerException.StackTrace));
               throw new HttpResponseException(message);

           /*     string docFolder = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                string logPath = String.Format("{0}\\StrideWeBlog.txt", docFolder);

                // FileStream f = new FileStream(logPath, FileMode.Append);
                StreamWriter sw = new StreamWriter(logPath, true);
                sw.AutoFlush = true;

                sw.WriteLine(ex.Message);
                sw.WriteLine(ex.InnerException.Message);
                sw.WriteLine(ex.InnerException.StackTrace);

                sw.Close();
                */

                //return new HttpResponseException(message);
            }

        }
    }
}
