using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace StrideFly.Entities
{
    public class CourseMarkerModel
    {
        public CourseMarkerModel()
        {
            Alt = 0;
            Dist = 0;
          //  Include = true;
        }

        public double Lng {get; set;}
        public double Lat {get; set;}
        public double Alt {get; set;}
        public double Dist {get; set;}
        public double Bearing { get; set; }
    //    public bool Include { get; set; }
    }
}