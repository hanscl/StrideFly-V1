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
    
    public partial class CourseMarker
    {
        public CourseMarker()
        {
            this.Include = true;
            this.TrackPoints = new HashSet<TrackPoint>();
        }
    
        public int MarkerID { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Altitude { get; set; }
        public double Distance { get; set; }
        public double Bearing { get; set; }
        public Nullable<int> FK_Course { get; set; }
        public Nullable<bool> Include { get; set; }
    
        public virtual Course Cours { get; set; }
        public virtual ICollection<TrackPoint> TrackPoints { get; set; }
    }
}