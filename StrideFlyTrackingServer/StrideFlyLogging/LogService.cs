
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace StrideFlyLogging
{
    public class LogService
    {
        StreamWriter swLog;

        public LogService() 
        {
            InitializeLogFile();
        }

        public void InitializeLogFile() 
        {
            // Write to the MyDocumentsFolder
            // string docFolder = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            
            // Write to C:\StrideFly
            string docFolder = @"C:\StrideFly";

            string logPath = "";
            string fileExt = ".log";
            string logFileExExt = String.Format("StrideFlyLog_{0}", DateTime.Now.ToString("yyyyMMdd-HHmmss"));
            string logPathExExt = String.Format("{0}\\{1}", docFolder, logFileExExt);
            string modLogPathExExt = logPathExExt;
            int i = 0;
            while (File.Exists(modLogPathExExt + fileExt))
            {
                modLogPathExExt = String.Format("{0}_{1}", logPathExExt, ++i);
            }

            logPath = modLogPathExExt + fileExt;

            swLog = new StreamWriter(logPath, true);
            swLog.AutoFlush = true;
        }


        public void EndLogging() 
        {
            swLog.Close();
        }

        public void WriteMessage(string sectionID, LogType type, string message, string detail = "", bool lineBreak = false) 
        {
            try
            {

                string sType = (type == LogType.Info) ? "Info" : "ERROR";

                string log = String.Format("[{0}] - {1} - ({2}): {3} ({4})", DateTime.Now.ToString("s"), sType, sectionID, message, detail);

                log = lineBreak ? Environment.NewLine + log : log;

                swLog.WriteLine(log);
            }
            catch (Exception ex)
            {
                // Do nothing cause all we can't do is logging
            }
        }

    }

    public enum LogType
    {
        Info = 1,
        Error = 2
    }
}
