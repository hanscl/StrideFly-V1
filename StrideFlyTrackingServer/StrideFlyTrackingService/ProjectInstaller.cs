using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration.Install;
using System.Linq;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Security;

namespace StrideFlyTrackingService
{
    [RunInstaller(true)]
    public partial class ProjectInstaller : System.Configuration.Install.Installer
    {
        string sLog = "StrideFly Server Event Log";
        string sSource = "StrideFly Source";

        public ProjectInstaller()
        {
            InitializeComponent();
        }

        public override void Install(IDictionary stateSaver)
        {
            

         /*   bool sourceFound = false;
            try
            {
                sourceFound = EventLog.SourceExists("MySource");
            }
            catch (SecurityException)
            {
                sourceFound = false;
            }*/

            base.Install(stateSaver);
/*
            // Create the source, if it does not already exist.
            if (!System.Diagnostics.EventLog.SourceExists(sSource))
            {
                System.Diagnostics.EventLog.CreateEventSource(sSource, sLog);
            }*/
        }

        public override void Uninstall(IDictionary savedState)
        {
            /*
            // Delete the source, if it exists.
            if (System.Diagnostics.EventLog.SourceExists(sSource))
            {
                System.Diagnostics.EventLog.DeleteEventSource(sSource);
                System.Diagnostics.EventLog.Delete(sLog);
            }
            */
            base.Uninstall(savedState);
        }
    }
}
