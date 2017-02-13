using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StrideFlyLogging;

namespace StrideFlyTracking
{
    class CourseCalc
    {
        public static IGeoLocation PointOnCourse(IGeoLocation point, List<IGeoLocation> course, double maxDist, bool findClosest)
        {
          //  Console.WriteLine("PointOnCourse Check");

            foreach (IGeoLocation marker in course)
            {
                double dist = GeoCalc.Exact(point.Latitude, point.Longitude, marker.Latitude, marker.Longitude);
                if (dist < maxDist)  // Is the point close enough to the course?
                    return (findClosest ? (ClosestPointOnCourse(point, course, course.IndexOf(marker), dist)) : marker);    // do we need to continue to find the best match?
            }

            return null;
        }

        public static IGeoLocation ClosestPointOnCourse(IGeoLocation point, List<IGeoLocation> course, int startIdx, double minDistance) 
        {
            IGeoLocation closestMarker = course[startIdx];

            for (int i = startIdx + 1; i < course.Count; i++)
            {
                double dist = GeoCalc.Exact(point.Latitude, point.Longitude, course[i].Latitude, course[i].Longitude);
                if (dist < minDistance)
                {
                    minDistance = dist;
                    closestMarker = course[i];
                }
            }

            return closestMarker;
        }

        public static StartFinishPosition FindRunnerPosition(IGeoLocation point, List<IGeoLocation> startArea, List<IGeoLocation> finishArea, double maxDist, LogService sfLogger)
        {
            double distFromStart = Double.MaxValue;
            double distFromFinish = Double.MaxValue;

            sfLogger.WriteMessage("COURSE CALC", LogType.Info, "Calculating runner position");

            // Find smallest distance to any start marker
            foreach (IGeoLocation marker in startArea)
            {
                double dist = GeoCalc.Exact(point.Latitude, point.Longitude, marker.Latitude, marker.Longitude);
                if (dist < distFromStart)  // Is the point closer than the last
                    distFromStart = dist;
            }

            sfLogger.WriteMessage("COURSE CALC", LogType.Info, "Found min distance from start marker", String.Format("{0}",distFromStart));

            // Find smallest distance to any finish marker
            foreach (IGeoLocation marker in finishArea)
            {
                double dist = GeoCalc.Exact(point.Latitude, point.Longitude, marker.Latitude, marker.Longitude);
                if (dist < distFromFinish)  // Is the point closer than the last
                    distFromFinish = dist;
            }

            sfLogger.WriteMessage("COURSE CALC", LogType.Info, "Found min distance from finish marker", String.Format("{0}",distFromFinish));

            // Are we even close to either one?
            if (distFromStart > maxDist && distFromFinish > maxDist)
                return StartFinishPosition.None;

            // We are, so return where we are closest to
            StartFinishPosition runnerPos = (distFromStart < distFromFinish) ? StartFinishPosition.Start : StartFinishPosition.Finish;
            sfLogger.WriteMessage("COURSE CALC", LogType.Info, "Runner is in start finish area =>", runnerPos.ToString());
            return runnerPos;
        }
    }
}
