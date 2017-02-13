using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;
using System.IO;
using System.Threading;
using StrideFlyServer;
using StrideFlyLogging;
using StrideFlyTracking;

namespace StrideFlyTrackingService
{
    public partial class TrackingService : ServiceBase
    {
        public TrackingService()
        {
            InitializeComponent();
        }

        protected override void OnStart(string[] args)
        {
            int servPort = 7777;

            TcpListener listener = null;
            StrideFlyServerThread serverThread;
            StrideFlyData trackingModule = null;

            LogService sfLogger = new LogService();
            try
            {
                sfLogger.WriteMessage("SERVICE", LogType.Info, "Creating TRacking Module");
                trackingModule = new StrideFlyData(sfLogger);


                sfLogger.WriteMessage("SERVICE", LogType.Info, "Starting TCP Listener");
                listener = new TcpListener(IPAddress.Any, servPort);
                listener.Start();
            }
          /*  catch (SocketException se)
            {
                sfLogger.WriteMessage("SERVICE", LogType.Error, se.ErrorCode.ToString(), se.Message);
                sfLogger.EndLogging();
                Environment.Exit(se.ErrorCode);
            }*/
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SERVICE", LogType.Error, ex.Message, ex.InnerException.Message);
            }

            TcpClient client = null;


                try
                {
                    sfLogger.WriteMessage("SERVICE", LogType.Info, "Waiting for connections");
                    client = listener.AcceptTcpClient(); // Accept incoming connection
                    serverThread = new StrideFlyServerThread(client, trackingModule, sfLogger); // spawn off new thread for this connection
                    new Thread(new ThreadStart(serverThread.readfromTracker)).Start();
                }
                catch (Exception ex)
                {
                    sfLogger.WriteMessage("SERVICE", LogType.Error, ex.Message, ex.InnerException.Message);
                }
        }

        protected override void OnStop()
        {
        }
    }
}
