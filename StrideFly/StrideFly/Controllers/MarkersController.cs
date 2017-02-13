using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using System.Xml.Linq;
using StrideFly.Entities;
using StrideFly.Utils;
using StrideFlyModel;

namespace StrideFly.Controllers
{
    public class MarkersController : ApiController
    {
        public async Task<HttpResponseMessage> Post()
        {
            try
            {
                StrideFlyEntities context = new StrideFlyEntities();
                /* if (ConfigurationManager.AppSettings["enableEdits"] == "false")
                     return ControllerContext.Request.CreateResponse(HttpStatusCode.Created, Path.Combine(IMAGE_BASE_PATH, "Uploaded.png").Replace('\\', '/'));
                 */
                if (!Request.Content.IsMimeMultipartContent("form-data"))
                {
                    throw new HttpResponseException(new HttpResponseMessage(HttpStatusCode.UnsupportedMediaType));
                }
                await Request.Content.LoadIntoBufferAsync();
                var task = Request.Content.ReadAsMultipartAsync();
                var result = await task;
                var contents = result.Contents;
                HttpContent httpContent = contents.First();
                string uploadedFileMediaType = httpContent.Headers.ContentType.MediaType;

                /*    if (!mediaTypeExtensionMap.Keys.Contains(uploadedFileMediaType))
                    {
                        throw new HttpResponseException(new HttpResponseMessage(HttpStatusCode.UnsupportedMediaType));
                    }
                    */
                Stream xml = httpContent.ReadAsStreamAsync().Result;

                if (xml.CanRead)
                {
                    XDocument xCourse = XDocument.Load(xml);

                    var trkPts = from gpxElem in xCourse.Descendants()
                                 where gpxElem.Name.LocalName.Equals("trkpt")
                                 select new CourseMarker
                                 {
                                     Longitude = Convert.ToDouble(gpxElem.Attribute("lon").Value),
                                     Latitude = Convert.ToDouble(gpxElem.Attribute("lat").Value),
                                     Altitude = Convert.ToDouble((from alt in gpxElem.Descendants() where alt.Name.LocalName.Equals("ele") select alt).FirstOrDefault().Value)
                                 };


                    List<CourseMarker> course = trkPts.ToList();

                    double totalDist = 0;

                    for (int i = 1; i < course.Count; i++)
                    {
                        // Calculate Distance
                        totalDist += GeoCalc.Exact(course[i - 1].Latitude, course[i - 1].Longitude, course[i].Latitude, course[i].Longitude);
                        course[i].Distance = totalDist;
                        // Bearing
                        course[i - 1].Bearing = GeoCalc.InitialBearing(course[i - 1].Latitude, course[i - 1].Longitude, course[i].Latitude, course[i].Longitude);
                        // Convert altitude to feet
                        course[i-1].Altitude = GeoCalc.ToFeet(course[i-1].Altitude);
                    }
                    // one more altitude conversion because the loop started at 1 !!
                    course[course.Count - 1].Altitude = GeoCalc.ToFeet(course[course.Count - 1].Altitude);


                    int lastElem = course.Count - 1;

                    // Get the final bearing for the last point
                    course[lastElem].Bearing = GeoCalc.FinalBearing(course[lastElem - 1].Latitude, course[lastElem - 1].Longitude, course[lastElem].Latitude, course[lastElem].Longitude);

                    // Save to DB
                    //context.Configuration.AutoDetectChangesEnabled = false;  // speed things up a bit :-)
                    foreach (CourseMarker cm in course)
                    {
                        context.CourseMarkers.Add(cm);
                    }
                    // Save changes when everything is done
                    context.SaveChanges();

                    // return total distance back via HTTP
                    return ControllerContext.Request.CreateResponse(HttpStatusCode.Created, totalDist);

                    //  return new HttpResponseMessage(HttpStatusCode.OK);
                }

                return new HttpResponseMessage(HttpStatusCode.BadRequest);
            }
            catch (Exception ex)
            {
                return new HttpResponseMessage(HttpStatusCode.InternalServerError);
            }
        }

    }
}
