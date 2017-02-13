using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;
using System.IO;
using System.Threading;
using StrideFlyTracking;
using StrideFlyServer;
using StrideFlyLogging;

namespace StrideFlyTrackingServer
{
    class ServerProgram
    {
        static void Main(string[] args)
        {
            int servPort = 7777;

            TcpListener listener = null;
            StrideFlyServerThread serverThread;

            LogService sfLogger = new LogService();
           // StrideFlyData trackingModule = new StrideFlyData(sfLogger);

            sfLogger.WriteMessage("MAIN", LogType.Info, "Launching StrideFly TrackingServer", "Version 0.93 - Final UAT Test (Production)");


            try
            {
                listener = new TcpListener(IPAddress.Any, servPort);
                listener.Start();
            }
            catch (SocketException se)
            {
                sfLogger.WriteMessage("MAIN", LogType.Error, se.ErrorCode.ToString(), se.Message);
                sfLogger.EndLogging();
                Environment.Exit(se.ErrorCode);
            }

            for (;;)  // Run forever 
            {
                TcpClient client = null;

                try
                {
                    client = listener.AcceptTcpClient(); // Accept incoming connection
                    serverThread = new StrideFlyServerThread(client, new StrideFlyData(sfLogger), sfLogger); // spawn off new thread for this connection
                    new Thread(new ThreadStart(serverThread.readfromTracker)).Start();
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }
        }
    }
}
