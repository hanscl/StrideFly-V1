//------------------------------------------------------------------------------
// <auto-generated>
//    This code was generated from a template.
//
//    Manual changes to this file may cause unexpected behavior in your application.
//    Manual changes to this file will be overwritten if the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace StrideFlyModel
{
    using System;
    using System.Collections.Generic;
    
    public partial class TrackPoint
    {
        public int PointID { get; set; }
        public System.DateTime DateTime { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Altitude { get; set; }
        public Nullable<double> Speed { get; set; }
        public Nullable<double> Bearing { get; set; }
        public int FK_Tracker { get; set; }
        public Nullable<int> FK_Course { get; set; }
        public Nullable<int> FK_Participant { get; set; }
        public Nullable<int> FK_Marker { get; set; }
        public Nullable<double> BatteryPct { get; set; }
        public Nullable<double> DistanceOnCourse { get; set; }
    
        public virtual CourseMarker CourseMarker { get; set; }
        public virtual Course Cours { get; set; }
        public virtual Participant Participant { get; set; }
        public virtual Tracker Tracker { get; set; }
    }
}
