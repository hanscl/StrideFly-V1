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
    
    public partial class Tracker
    {
        public Tracker()
        {
            this.TrackPoints = new HashSet<TrackPoint>();
        }
    
        public int TrackerID { get; set; }
        public string SerialNo { get; set; }
        public string IMEI { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public Nullable<int> FK_SimCard { get; set; }
        public Nullable<int> FK_Participant { get; set; }
        public Nullable<double> BatteryPct { get; set; }
    
        public virtual SimCard SimCard { get; set; }
        public virtual Participant Participant { get; set; }
        public virtual ICollection<TrackPoint> TrackPoints { get; set; }
    }
}