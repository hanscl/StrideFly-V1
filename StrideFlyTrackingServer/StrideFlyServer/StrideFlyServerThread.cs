using StrideFlyTracking;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using StrideFlyLogging;

namespace StrideFlyServer
{
    public class StrideFlyServerThread
    {
        private const int BUFSIZE = 32;

        TcpClient tracker = null;
        StrideFlyData strideFly = null;
        NetworkStream trStream = null;
        LogService sfLogger = null;

        public StrideFlyServerThread(TcpClient client, StrideFlyData trackingModule, LogService xLogger)
        {
            this.tracker = client;
            this.strideFly = trackingModule;
            this.sfLogger = xLogger;
        }

        public void readfromTracker()
        {
            byte[] rcvBuffer = new byte[BUFSIZE];
            int bytesRcvd;
            string trackData = "";

            try
            {
                trStream = tracker.GetStream();
                
                // LOG
                sfLogger.WriteMessage("SERVERTHREAD", LogType.Info, "Handling tracker connection ...", tracker.Client.RemoteEndPoint.ToString(), true);

                // Receive until client closes connection, indicated by 0 return value
                int totalBytesEchoed = 0;

                while ((bytesRcvd = trStream.Read(rcvBuffer, 0, rcvBuffer.Length)) > 0)
                {
                    trackData = String.Format("{0}{1}", trackData, System.Text.Encoding.UTF8.GetString(rcvBuffer, 0, bytesRcvd).ToString());
                    totalBytesEchoed += bytesRcvd;
                    //Console.WriteLine("Read {0} bytes into buffer", bytesRcvd);
                    if (trackData.Contains("\r\n") || trackData.Contains("\n"))
                    {
                        
                        // Logging and other debug stuff
                        string trackDataNoLineBreak = trackData.Replace("\r\n", "").Replace("\n", "");
                        sfLogger.WriteMessage("SERVERTHREAD", LogType.Info, "Tracker Message", trackDataNoLineBreak, true);
                        
                        //Process data
                        strideFly.ProcessTrackingData(trackData); //CHANGE

                        //Console.WriteLine(trackData);
                        //Console.WriteLine("read {0} bytes total for processing.", totalBytesEchoed);
                        
                        // Reset string & counter
                        trackData = "";
                        totalBytesEchoed = 0;
                    }
                }

                sfLogger.WriteMessage("SERVERTHREAD", LogType.Info, "Connection closed by client");


                // Close the streamn and socket. done with this client.
                trStream.Close();
                tracker.Close();
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SERVERTHREAD", LogType.Error, ex.Message, ex.InnerException.Message);
                trStream.Close();
            }

        }
    }
}
