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
    
    public partial class Event
    {
        public Event()
        {
            this.Courses = new HashSet<Course>();
            this.Laps1 = new HashSet<Lap>();
            this.Participants = new HashSet<Participant>();
        }
    
        public int EventID { get; set; }
        public string Name { get; set; }
        public Nullable<System.DateTime> Start { get; set; }
        public Nullable<System.DateTime> End { get; set; }
        public Nullable<int> TimeDiffPT { get; set; }
        public Nullable<int> FK_RaceSeries { get; set; }
        public string Location { get; set; }
        public Nullable<int> Laps { get; set; }
        public Nullable<bool> Active { get; set; }
        public Nullable<int> RefreshInterval { get; set; }
        public Nullable<int> CycleInterval { get; set; }
    
        public virtual ICollection<Course> Courses { get; set; }
        public virtual RaceSeries RaceSery { get; set; }
        public virtual ICollection<Lap> Laps1 { get; set; }
        public virtual ICollection<Participant> Participants { get; set; }
    }
}