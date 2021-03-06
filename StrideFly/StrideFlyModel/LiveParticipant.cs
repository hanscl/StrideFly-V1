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
    
    public partial class LiveParticipant
    {
        public int PartID { get; set; }
        public int EventID { get; set; }
        public string ParticipantName { get; set; }
        public Nullable<int> Bib { get; set; }
        public Nullable<int> CurrentLap { get; set; }
        public Nullable<int> CurrentCourse { get; set; }
        public Nullable<int> Runners { get; set; }
        public Nullable<int> TimeElapsed { get; set; }
        public Nullable<int> TimeRemaining { get; set; }
        public Nullable<int> TimeTotal { get; set; }
        public Nullable<double> DistanceTotal { get; set; }
        public Nullable<double> DistanceCompleted { get; set; }
        public Nullable<double> DistanceRemaining { get; set; }
        public Nullable<int> AvgPace { get; set; }
        public Nullable<int> CurrPace { get; set; }
        public Nullable<int> TotalPace { get; set; }
        public Nullable<System.DateTime> StartTime { get; set; }
        public Nullable<System.DateTime> EndTime { get; set; }
        public int TrackerID { get; set; }
        public System.DateTime TrackPointDT { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Altitude { get; set; }
        public Nullable<double> BatteryPct { get; set; }
        public Nullable<long> rk { get; set; }
    }
}
