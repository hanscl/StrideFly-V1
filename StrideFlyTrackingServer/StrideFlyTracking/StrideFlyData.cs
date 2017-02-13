using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StrideFlyModel;
using System.Diagnostics;
using StrideFlyLogging;

namespace StrideFlyTracking
{
    public class StrideFlyData
    {
        private LogService sfLogger;

        private List<TEvent> events;
        private List<int> activeTrackers;

      //  private StrideFlyEntities context = new StrideFlyEntities();

        // Constants for calculating course Positions // DEPRECATED
    //    private static double regularMarkerDist = 0.015;
     //   private static double startFinishMarkerDist = 0.01;
        // minimum distance required to use runner pace for projections
        private static double requiredRunnerDistance = 0.25;



        public StrideFlyData(LogService xLogger)
        {
            sfLogger = xLogger;
            activeTrackers = new List<int>();
            InitFromDB();
            DetermineMaxDist();
        }

        public void InitFromDB()
        {
            try
            {
                using (new UnitOfWorkScope(false, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    sfLogger.WriteMessage("SFTRACKING - InitFromDB", LogType.Info, "BEGIN", "Read Database");
                    // Refresh data from database
                    events = (from e in scopeContext.Events where e.Active == true select new TEvent() { EventID = e.EventID, Laps = e.Laps }).ToList();

                    foreach (TEvent tEvent in events)
                    {
                        tEvent.Courses = (from c in scopeContext.Courses where c.FK_Event == tEvent.EventID select new TCourse() { CourseOrder = c.Order, CourseID = c.CourseID, Distance = c.Distance }).ToList();
                        foreach (TCourse tCourse in tEvent.Courses)
                        {
                            tCourse.CourseMarkers = (from m in scopeContext.CourseMarkers where m.FK_Course == tCourse.CourseID orderby m.Distance ascending select new TCourseMarker() { MarkerID = m.MarkerID, Latitude = m.Latitude, Longitude = m.Longitude, Distance = m.Distance, Bearing = m.Bearing }).ToList();
                            // Detect start finish area for course
                            DetectStartFinish(tCourse.CourseMarkers, tEvent);
                        }
                        //tEvent.Participants = (from p in scopeContext.Participants where p.FK_Event == tEvent.EventID select new TParticipant() { PartID = p.PartID, CourseID = p.FK_Course, Lap = p.Lap, StartFinishPos = (StartFinishPosition)p.StartFinishPos, Runners = p.Runners }).ToList();
                        // UPDATE THE LINE ABOVE TO READ ADDIITONAL FIELDS FROM DATABASE TO ENABLE RECOVERY FROM SERVER CRASH DURING RACE EVENT
                        tEvent.Participants = (from p in scopeContext.Participants
                                               where p.FK_Event == tEvent.EventID
                                               select new TParticipant()
                                                   {
                                                       PartID = p.PartID,
                                                       CourseID = p.FK_Course,
                                                       Lap = p.Lap,
                                                       CourseNo = p.CourseNo,
                                                       StartFinishPos = (StartFinishPosition)p.StartFinishPos,
                                                       Runners = p.Runners,
                                                       TimeElapsed = p.TimeElapsed,
                                                       TimeRemaining = p.TimeRemaining,
                                                       DistanceTotal = p.DistanceTotal,
                                                       DistanceCompleted = p.DistanceCompleted,
                                                       AvgPace = p.AvgPace,
                                                       CurrPace = p.CurrPace,
                                                       StartTime = (p.StartTime == null) ? DateTime.MinValue : (DateTime)p.StartTime,
                                                       EndTime = (p.EndTime == null) ? DateTime.MinValue : (DateTime)p.EndTime,
                                                   }).ToList();
                        foreach (TParticipant tParticipant in tEvent.Participants)
                        {
                            tParticipant.TrackerID = (from t in scopeContext.Trackers where t.FK_Participant == tParticipant.PartID select t.TrackerID).FirstOrDefault();
                            // save to a separate list so we can check for active event trackers without going through the participants
                            activeTrackers.Add(tParticipant.TrackerID);
                            tEvent.evTrackers.Add(tParticipant.TrackerID);

                            // if race is active (Lap & CourseID are both != null), then the server has been restarted during an active race. 
                            // Read Laps and CourseMarkers from the Database and attach to the participant object. Oh happy day :-)
                            if (tParticipant.Lap != null && tParticipant.CourseID != null)
                            {
                                tParticipant.trackPoints = (from tp in scopeContext.TrackPoints
                                                            where tp.FK_Participant == tParticipant.PartID && tp.FK_Course != null
                                                            orderby tp.DateTime ascending
                                                            select new TTrackPoint()
                                                                {
                                                                    Altitude = tp.Altitude,
                                                                    Battery = tp.BatteryPct,
                                                                    DistanceOnCourse = tp.DistanceOnCourse,
                                                                    dtStamp = tp.DateTime,
                                                                    FK_Course = tp.FK_Course,
                                                                    FK_Marker = tp.FK_Marker,
                                                                    FK_Participant = tp.FK_Participant,
                                                                    Latitude = tp.Latitude,
                                                                    Longitude = tp.Longitude,
                                                                    TrackerID = tp.FK_Tracker
                                                                }).ToList();

                                tParticipant.Laps = (from lps in scopeContext.Laps
                                                     where lps.FK_Participant == tParticipant.PartID && lps.FK_Event == tEvent.EventID
                                                     orderby lps.LapNo ascending
                                                     select new TLap()

                               {
                                   DistanceCompleted = lps.DistanceCompleted,
                                   DistanceTotal = lps.DistanceTotal,
                                   EndTime = (lps.EndTime == null) ? DateTime.MinValue : (DateTime)lps.EndTime,
                                   FK_Course = lps.FK_Course,
                                   FK_Event = lps.FK_Event,
                                   FK_Participant = lps.FK_Participant,
                                   LapNo = lps.LapNo,
                                   LapPace = lps.LapPace,
                                   ProjEndTime = (lps.ProjEndTime == null) ? DateTime.MinValue : (DateTime)lps.ProjEndTime,
                                   ProjStartTime = (lps.ProjStartTime == null) ? DateTime.MinValue : (DateTime)lps.ProjStartTime,
                                   ProjTotalTime = lps.ProjTotalTime,
                                   RunnerNo = lps.RunnerNo,
                                   StartTime = (lps.StartTime == null) ? DateTime.MinValue : (DateTime)lps.StartTime,
                                   Status = (LapStatus)lps.Status,
                                   TimeElapsed = lps.TimeElapsed,
                                   TimeRemaining = lps.TimeRemaining
                               }).ToList();
                            }

                        }
                    }
                } // End using UnityOfWorkScope
                 sfLogger.WriteMessage("SFTRACKING - InitFromDB", LogType.Info, "Done reading from DB");
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - InitFromDB", LogType.Error, ex.Message);
            }
        }

        private void DetermineMaxDist()
        {
            double meanDistance;
            double markerMidPoint;

            double maxDiversionFromCourse = 0.015; // ~24 meters (10 meters diversion + 14 meters GPS inaccuracy)
            double hypetonuse;

            double courseDistances;

            foreach(TEvent tEvent in events) 
            {
                courseDistances = 0;

                foreach(TCourse tCourse in tEvent.Courses) 
                {
                    meanDistance = 0;

                    // save distances between each set of markers
                    for(int mrkCtr = 1; mrkCtr < tCourse.CourseMarkers.Count; mrkCtr++)
                    {
                        meanDistance += (tCourse.CourseMarkers[mrkCtr].Distance - tCourse.CourseMarkers[mrkCtr - 1].Distance);
                    }

                    // ... and calculate average
                    meanDistance = meanDistance / (tCourse.CourseMarkers.Count - 1);
                    markerMidPoint = meanDistance / 2;

                    hypetonuse = Math.Sqrt(Math.Pow(markerMidPoint, 2) + Math.Pow(maxDiversionFromCourse, 2));

                    tCourse.maxDistFromMarker = Math.Max(hypetonuse, markerMidPoint);
                    courseDistances += tCourse.maxDistFromMarker;

                    sfLogger.WriteMessage("DETERMINE MAX DIST", LogType.Info, String.Format("Max distance from marker is {0}", tCourse.maxDistFromMarker), String.Format("CourseID: {0}",tCourse.CourseID));
                }

                // now save the distance for the start finish line to the event object
                tEvent.maxDistFromStartFinish = (courseDistances / tEvent.Courses.Count);
            }
        }

        private void DetectStartFinish(List<TCourseMarker> tMarkers, TEvent tEvent)
        {
            // Add start points (+0.25 miles from the start)
            for (int i = 0; i < tMarkers.Count; i++)
            {
                if (tMarkers[i].Distance > 0.25)
                    break;

                tEvent.startArea.Add(new TStartFinish() { Latitude = tMarkers[i].Latitude, Longitude = tMarkers[i].Longitude, RelativeDistance = tMarkers[i].Distance });

            }

            double finishDistance = 0.0;
            double totalDistance = tMarkers.Last().Distance;

            // now go backwards to get finish area (-0.25 miles from the start)
            for (int i = tMarkers.Count - 1; i >= 0; i--)
            {
                finishDistance = tMarkers[i].Distance - totalDistance;

                if (finishDistance == 0)
                    continue;

                if (finishDistance < -0.25)
                    break;

                tEvent.finishArea.Add(new TStartFinish() { Latitude = tMarkers[i].Latitude, Longitude = tMarkers[i].Longitude, RelativeDistance = finishDistance});
            }
        }

        public void ProcessTrackingData(string trackerMsg)
        {

            TTrackPoint trackPoint = null;


            try
            {
                //List<string> trackLines = new List<string>(trackData.Split(new string[] {  "\r\n", "\n"  }, StringSplitOptions.None));
                // Discard invalid lines
                // for (int i = 0; i < trackLines.Count; i++)

                if (trackerMsg.Contains("REFRESH300327"))
                {
                    // initialize data structure from database
                    InitFromDB();
                }
                else if (trackerMsg.Contains("GPRMC")) // It's tracking data
                {
                    trackPoint = new TTrackPoint();

                    ParseTrackString(trackerMsg, trackPoint);

                    // check if tracker is active
                    if (!activeTrackers.Contains(trackPoint.TrackerID))
                    {
                        sfLogger.WriteMessage("PROCESS TRACKING DATA", LogType.Info, String.Format("Tracker is not active. Adding to DB."));
                        AddTrackPointToDB(trackPoint);
                    }
                    else
                    {
                        // Get the right event if there's more than one
                        TEvent activeEvent = (from e in events where e.evTrackers.Contains(trackPoint.TrackerID) select e).FirstOrDefault();

                        // Get The participant
                        TParticipant activePart = (from p in activeEvent.Participants where p.TrackerID == trackPoint.TrackerID select p).FirstOrDefault();

                        // Here goes the meat! Process the data (determine laps, course, position on course etc etc etc)
                        ProcessActiveTrackPoint(trackPoint, activeEvent, activePart);
                        

                    }
                }
                // any other string => discard and return
            }
            catch (Exception ex)
            {

            }
            



        }

        /****************** Processing of track point for an activ event **************/
        /* This method contains the logic for determining the a) status of the race and b) the position of the runner 
         * STATUS OF THE RACE
         * 1) NOT STARTED [CourseID == null AND Laps == null]
         * 2) IN PROGRESS [CourseID != null AND Laps != null]
         * 3) ENDED [CourseID == null AND Laps != null]
         * 
         * RUNNER POSITION (IF status of race is IN PROGRESS)
         * 1)CROSSED FINISH LINE [current = start AND previous = finish]
         * 2)OTHER POSITION [current = none OR current = finish OR (current = start AND previous != start]
         *      a) On Course (within given distance of a course marker)
         *      b) Off Course [outside of min distance to any course marker)
         */
        private void ProcessActiveTrackPoint(TTrackPoint trackPoint, TEvent activeEvent, TParticipant activePart)
        {
            try
            {
                /**** STOPWATCH FOR PERFORMANCE TEST ONLY ****/
                Stopwatch sw = new Stopwatch();
                sw.Start();

                StartFinishPosition runnerPos = StartFinishPosition.None;

                // This track point is for an active event & assigned to a participant 
                // => save participant ID to trackpoint regardless of runner position and if race has not started yet or ended already
                trackPoint.FK_Participant = activePart.PartID;

                sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "BEGIN", "Process Track Point");

                // if course = null => race hasn't started => check if this point is in the start area (first 0.25 of course)
                if (activePart.CourseID == null)    // Race is not in progress
                {
                    sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Race not in progress", "CourseID still NULL");
                    // 1. If Lap == null, the race hasn't started yet => check if we are in the start area (i.e. if the race just started)
                    // 2. If Lap != null, the race if finished => do nothing 
                    if (activePart.Lap == null)
                    {
                        sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Race has not started yet", "Lap still NULL");
                        sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Determine if runner is in start or finish area ...");

                        runnerPos = CourseCalc.FindRunnerPosition(trackPoint, activeEvent.startArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeEvent.finishArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeEvent.maxDistFromStartFinish, sfLogger);

                        sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner is in area =>", runnerPos.ToString());
                        
                        // DETERMINE IF RUNNER IS IN START OR FINISH AREA // NOW ONE METHOD; SEE ABOVE (CODE BELOW IS DEPRECATED)
                        /*if (CourseCalc.PointOnCourse(trackPoint, activeEvent.startArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), startFinishMarkerDist, false) != null)
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner is in START area");
                            runnerPos = StartFinishPosition.Start;
                        }
                        else if (CourseCalc.PointOnCourse(trackPoint, activeEvent.finishArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), startFinishMarkerDist, false) != null)
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner is in FINISH area");
                            runnerPos = StartFinishPosition.Finish;
                        }
                        else
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner is NOT in start or finish area");
                            runnerPos = StartFinishPosition.None;
                        }*/

                        // Now see if the runner crossed the finish line
                        if (runnerPos == StartFinishPosition.Start && activePart.StartFinishPos == StartFinishPosition.Finish)
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Check if the runner crossed the finish line");
                            // Race Started: Reset the participant data, just in case!!
                            ResetParticipantStats(activePart);

                            // Race started. Initialize the Laps Data structure and save to DB
                            InitializeParticipantLaps(trackPoint, activeEvent, activePart);

                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Race has started", "Runner has crossed the finish line");
                            activePart.StartFinishPos = runnerPos;  // Remember the runner's current position

                            TCourse activeCourse = NewParticipantLap(activeEvent, activePart);  // "Increase" lap & find the course for this (first) lap
                            if (activeCourse == null) // There was no course #1 => invalid course configuration; cannot process
                                throw new Exception("Invalid course configuration", new Exception("A course with order number 1 is required for this race"));

                            // Find the closest point on the active course
                            TCourseMarker gMarker = (TCourseMarker)CourseCalc.PointOnCourse(trackPoint, activeCourse.CourseMarkers.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeCourse.maxDistFromMarker, true);

                            UpdateInRaceTrackPoint(trackPoint, gMarker, activePart, activeEvent);    // Update the tracking point
                        }
                        else
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner did not cross finish line", "Remember runner position");

                            if (activePart.StartFinishPos == StartFinishPosition.Finish && runnerPos == StartFinishPosition.None)
                            {
                                sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner was on finish, now he's nowhere", "We ignore 'cause it may be a tracker error");

                            }
                            else
                            {
                                sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, String.Format("Save Runner Position as: {0}", runnerPos));
                                activePart.StartFinishPos = runnerPos;  // Remember the runner's current position
                                UpdateParticipantToDB(activePart); // TODO -> see if this can be done at the END
                            }
                        }

                    }
                }
                else // Race is IN PROGRESS
                {

                    sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Race is now in PROGRESS");
                    // RUNNER CROSSED FINISH LINE (POSITION: start WITH PREVIOUS: finish)
                   /* if (CourseCalc.PointOnCourse(trackPoint, activeEvent.startArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), startFinishMarkerDist, false) != null &&
                        activePart.StartFinishPos == StartFinishPosition.Finish)*/
                    if (CourseCalc.FindRunnerPosition(trackPoint, activeEvent.startArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeEvent.finishArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeEvent.maxDistFromStartFinish, sfLogger) == StartFinishPosition.Start &&
                        activePart.StartFinishPos == StartFinishPosition.Finish)
                    {
                        sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner crossed finish line", "Current position = startArea, previous was finishArea");
                        // Participant has just crossed the finish line => increase lap & and change course
                        TCourse activeCourse = NewParticipantLap(activeEvent, activePart);  // will return zero if it was the last lap

                        if (activeCourse != null) // Not the last lap; carry on
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Not the last lap. Carry on ...");
                            // Find the closest point on the current course
                            TCourseMarker gMarker = (TCourseMarker)CourseCalc.PointOnCourse(trackPoint, activeCourse.CourseMarkers.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeCourse.maxDistFromMarker, true);
                            activePart.StartFinishPos = StartFinishPosition.Start;  // Remember the runner's current position
                            UpdateParticipantToDB(activePart); // TODO -> see if this can be done at the END

                            // Update Tracking point (if on Course) 
                            // How can we be off course when we were in the start area, the start area could have been on a different
                            // route, but need to monitor frequency of points (should probably be the same for all courses)
                            // and sensitivities of distance parameter
                            if (gMarker != null)
                                UpdateInRaceTrackPoint(trackPoint, gMarker, activePart, activeEvent);  // Update Tracking point
                            else
                                activePart.trackPoints.Add(trackPoint); // Still Save trackPoints even though participant is off course
                        }
                    }
                    else  // RUNNER POSITION: finish OR none OR (start WITH PREVIOUS <> finish)
                    {
                        sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner did not cross finish line. Get course and see if runner is on course.");
                        // Find the closest point on that course
                        TCourse activeCourse = activeEvent.Courses.FirstOrDefault(s => s.CourseOrder == activePart.CourseNo);
                        TCourseMarker gMarker = (TCourseMarker)CourseCalc.PointOnCourse(trackPoint, activeCourse.CourseMarkers.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeCourse.maxDistFromMarker, true);

                        // Update Tracking point (if on Course)
                        if (gMarker != null)
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner is on course. update track point");
                            UpdateInRaceTrackPoint(trackPoint, gMarker, activePart, activeEvent);  // Update Tracking point

                            // Remember the runner's current position                          
                            // activePart.StartFinishPos = ((CourseCalc.PointOnCourse(trackPoint, activeEvent.finishArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), startFinishMarkerDist, false) == null) ? StartFinishPosition.None : StartFinishPosition.Finish);
                            activePart.StartFinishPos = CourseCalc.FindRunnerPosition(trackPoint, activeEvent.startArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeEvent.finishArea.OfType<IGeoLocation>().ToList<IGeoLocation>(), activeEvent.maxDistFromStartFinish, sfLogger);
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, String.Format("Runner positions is {0}", activePart.StartFinishPos.ToString()));
                            UpdateParticipantToDB(activePart); // TODO -> see if this can be done at the END
                        }
                        else
                        {
                            sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, "Runner is OFF course. Just save track point");
                            // Still Save trackPoints even though participant is off course
                            // Save the CourseID the runner is supposed to be on
                            trackPoint.FK_Course = activePart.CourseID;
                            activePart.trackPoints.Add(trackPoint);
                        }
                    }
                }

                AddTrackPointToDB(trackPoint);  // Save modified trackPoint to DB

                /*********** Stopwatch for performance measurement only **********/
                sw.Stop();
                sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Info, String.Format("Checking if point in Start Area took: {0} ms or {1} nanoseconds", sw.ElapsedMilliseconds, sw.ElapsedTicks * 342));
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - ProcessActiveTrackPoint", LogType.Error, ex.Message);
            }
        }

        private void ResetParticipantStats(TParticipant tPart)
        {
            try
            {

                sfLogger.WriteMessage("SFTRACKING - ResetParticipantStats", LogType.Info, "BEGIN");


                using (new UnitOfWorkScope(true, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    Participant part = scopeContext.Participants.FirstOrDefault(s => s.PartID == tPart.PartID);

                    part.TimeElapsed = null;
                    part.TimeRemaining = null;
                    part.TimeTotal = null;
                    part.DistanceTotal = null;
                    part.DistanceCompleted = null;
                    part.DistanceRemaining = null;
                    part.AvgPace = null;
                    part.StartTime = null;
                    part.EndTime = null;
                    part.CurrPace = null;

                    scopeContext.Participants.Attach(part);
                    scopeContext.Entry(part).State = System.Data.EntityState.Modified;

                    scopeContext.SaveChanges();
                }

            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - ResetParticipantStats", LogType.Error, ex.Message);
            }
        }

        private void InitializeParticipantLaps(TTrackPoint trackPoint, TEvent activeEvent, TParticipant activePart)
        {
            string sqlStr;
            int runnerNo;
            int courseNo;
            TCourse nextCourse;
            Lap lap;
            Nullable<double> eventDistance = 0;

            try
            {
                // First delete all laps for this participant & event combo

                using (new UnitOfWorkScope(true, sfLogger))
                {
                    sqlStr = String.Format("DELETE FROM Laps WHERE FK_Participant = {0} AND FK_Event = {1}", activePart.PartID, activeEvent.EventID);
                    UnitOfWorkScope.CurrentStrideFlyContext.Database.ExecuteSqlCommand(sqlStr);
                }

                using (new UnitOfWorkScope(false, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    // then create the object structure 
                    activePart.Laps = new List<TLap>();
                    runnerNo = 1;
                    courseNo = 1;
                    for (int lapNo = 1; lapNo <= activeEvent.Laps; lapNo++)
                    {
                        // Find the next course
                        nextCourse = activeEvent.Courses.FirstOrDefault(s => s.CourseOrder == courseNo);
                        if (nextCourse == null) // courseNo doesn't exist => revert to first course for this lap
                        {
                            courseNo = 1;
                            nextCourse = activeEvent.Courses.FirstOrDefault(s => s.CourseOrder == courseNo);
                        }

                        // Check to see if the runnerNo is still valid; if not then reset to #1
                        if (runnerNo > activePart.Runners)
                            runnerNo = 1;

                        TLap tLap = new TLap();
                        tLap.Init(activePart.PartID, activeEvent.EventID, lapNo, runnerNo, nextCourse.CourseID, nextCourse.Distance);
                        activePart.Laps.Add(tLap);
                        // create and add DB Lap
                        lap = new Lap();
                        lap.FK_Participant = tLap.FK_Participant;
                        lap.FK_Event = tLap.FK_Event;
                        lap.LapNo = tLap.LapNo;
                        lap.RunnerNo = tLap.RunnerNo;
                        lap.FK_Course = tLap.FK_Course;
                        lap.DistanceTotal = tLap.DistanceTotal;
                        lap.DistanceCompleted = 0;
                        scopeContext.Laps.Add(lap);

                        // add to event distance
                        eventDistance += tLap.DistanceTotal;

                        // Increase my counters
                        runnerNo++;
                        courseNo++;
                    }

                    // Finally save lap changes to DB
                    scopeContext.SaveChanges();
                }
                
                // And update participant
                activePart.DistanceTotal = eventDistance;
                UpdateParticipantToDB(activePart);

            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - InitializeParticipantLaps", LogType.Error, ex.Message);
            }
           
        }

        private void UpdateInRaceTrackPoint(TTrackPoint point, TCourseMarker marker, TParticipant part, TEvent activeEvent)
        {
            sfLogger.WriteMessage("SFTRACKING - UpdateInRaceTrackPoint", LogType.Info, String.Format("UPIRTP: Update In Race Track Point. FK_Course = {0}. FK_Marker = {1}", part.CourseID, marker.MarkerID));
            // Update Tracking point
            point.FK_Course = part.CourseID;
            point.FK_Marker = marker.MarkerID;
            point.DistanceOnCourse = marker.Distance;

            // Save track point to participant 
            part.trackPoints.Add(point);

            // Save all the stats to the lap
            SaveLapData(point, marker, part, activeEvent);
        }

        private void SaveLapData(TTrackPoint tPoint, TCourseMarker tMarker, TParticipant tPart, TEvent tEvent)
        {
            TLap tLap;
            Lap dbLap;
            bool mustCorrectStartTime = false;

            try
            {
                using (new UnitOfWorkScope(true, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    // Obtain both the local object and the DB object
                    tLap = tPart.Laps.FirstOrDefault(s => s.LapNo == tPart.Lap);
                    // get the DB record
                    dbLap = scopeContext.Laps.FirstOrDefault(s => s.FK_Event == tLap.FK_Event && s.FK_Participant == tLap.FK_Participant && s.LapNo == tLap.LapNo);

                    // NOW SAVE ALL RELEVANT DATA
                    // 1. Time: First time (when StartTime == null) we save startTime, afterwards we overwrite the EndTime
                    if (tLap.StartTime == DateTime.MinValue)
                    {
                        tLap.StartTime = tPoint.dtStamp;
                        dbLap.StartTime = tPoint.dtStamp;
                    }
                    else
                    {
                        if (tLap.EndTime == DateTime.MinValue)
                            mustCorrectStartTime = true;

                        tLap.EndTime = tPoint.dtStamp;
                        dbLap.EndTime = tPoint.dtStamp;
                    }

                    // 2. DISTANCE COMPLETED
                    tLap.DistanceCompleted = tMarker.Distance;
                    dbLap.DistanceCompleted = tMarker.Distance;

                    // Calculate Lap Stats
                    if (tLap.EndTime != DateTime.MinValue) // Only call this after we have at least two track points for the lap
                        CalculateLapStats(tLap, mustCorrectStartTime, tPart);

                    // SAVE LAP STATS BEFORE CONTINUING
                    // Update dbLap
                    if (mustCorrectStartTime) // we updated the start time, so fix in DB as well
                        dbLap.StartTime = tLap.StartTime;

                    // dbLap.DistanceRemaining = tLap.DistanceRemaining; // ITS CALCUALTED
                    dbLap.TimeElapsed = tLap.TimeElapsed;
                    dbLap.LapPace = tLap.LapPace;
                    dbLap.TimeRemaining = tLap.TimeRemaining;
                    if (tLap.ProjEndTime == DateTime.MinValue)
                        dbLap.ProjEndTime = null;
                    else
                        dbLap.ProjEndTime = tLap.ProjEndTime;

                    // Modify entry in scopeContext
                    scopeContext.Laps.Attach(dbLap);
                    scopeContext.Entry(dbLap).State = System.Data.EntityState.Modified;

                    // OPTIMIZE THIS
                    // ... and save back to DB
                    scopeContext.SaveChanges();
                
                } // End of using UnitOfWorkScope

                // Now run projections
                if (tLap.EndTime != DateTime.MinValue) // Only call this after we have at least two track points for the lap
                    RunLapProjections(tPart);

                // Calculate overall participant stats
                CalculateParticipantStats(tPart, tLap, (tLap.EndTime != DateTime.MinValue), mustCorrectStartTime);                
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - SaveLapData", LogType.Error, ex.Message);
            }
        }

        private void RunLapProjections(TParticipant tPart)
        {
            sfLogger.WriteMessage("SFTRACKING - RunLapProjections", LogType.Info, "BEGIN");


            try
            {

                List<RunnerPace> runnerPaceList = new List<RunnerPace>();
                //... and initialize runnerPaceList
                for (int i = 1; i <= tPart.Runners; i++)
                {
                    runnerPaceList.Add(new RunnerPace(i));
                }

                PaceData teamPace = new PaceData();
                DateTime lastLapEndTime = DateTime.MinValue;

                foreach (TLap tLap in tPart.Laps)
                {
                    RunnerPace currRunner = runnerPaceList.FirstOrDefault(s => s.RunnerNo == tLap.RunnerNo);

                    if (tLap.Status == LapStatus.Completed || tLap.Status == LapStatus.InProgress) // get actual data here
                    {
                        // Always add to overall team pace
                        teamPace.Distance += tLap.DistanceCompleted;
                        teamPace.Time += tLap.TimeElapsed;

                        currRunner.Distance += tLap.DistanceCompleted;
                        currRunner.Time += tLap.TimeElapsed;
                    }
                    else // These are the ones we need to project
                    {
                        tLap.ProjStartTime = lastLapEndTime;

                        if (currRunner.Pace == 0 || currRunner.Distance < requiredRunnerDistance) // not enough runner data - use team pace
                            tLap.ProjTotalTime = Convert.ToInt32(Convert.ToDouble(teamPace.Pace) * tLap.DistanceTotal);
                        else  // use runner Pace 
                            tLap.ProjTotalTime = Convert.ToInt32(Convert.ToDouble(currRunner.Pace) * tLap.DistanceTotal);

                        tLap.ProjEndTime = tLap.ProjStartTime.AddSeconds(Convert.ToDouble(tLap.ProjTotalTime));
                    }

                    // save EndTime for next Lap
                    lastLapEndTime = tLap.ProjEndTime;
                }

                using (new UnitOfWorkScope(true, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    // Lap Objects have been updated, now do the DB work (this is not ideal :-( )
                    foreach (TLap tLap in tPart.Laps)
                    {
                        if (tLap.Status != LapStatus.NotStarted) // Laps that are in progress or have been completed were not modified here
                            continue;

                        // get the DB record
                        Lap lap = scopeContext.Laps.FirstOrDefault(s => s.FK_Event == tLap.FK_Event && s.FK_Participant == tLap.FK_Participant && s.LapNo == tLap.LapNo);

                        // Update relevant fields
                        lap.ProjStartTime = tLap.ProjStartTime;
                        lap.ProjTotalTime = tLap.ProjTotalTime;
                        lap.ProjEndTime = tLap.ProjEndTime;

                        // modify scopeContext
                        scopeContext.Laps.Attach(lap);
                        scopeContext.Entry(lap).State = System.Data.EntityState.Modified;
                    }

                    // Save scopeContext changes to DB
                    scopeContext.SaveChanges();
                } // End UnityOfWorkScope

                sfLogger.WriteMessage("SFTRACKING - RunLapProjections", LogType.Info, "END");
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - RunLapProjections", LogType.Error, ex.Message);
            }
        }

        private void CalculateLapStats(TLap tLap, bool mustCorrectStartTime, TParticipant tPart)
        {
            // Always calculate remaining lap distance
            //tLap.DistanceRemaining = tLap.DistanceTotal - tLap.DistanceCompleted;

            // THIS IS NOW CHECKED IN THE CALLING METHOD
            // if there's no end time (i.e. the first point on a new lap, we cannot do anything else) :-(
          //  if (tLap.EndTime == DateTime.MinValue)
          //      return;

            if (mustCorrectStartTime) // This is the first end point => calculate the pace
            {
                // Select the trackpoints for this course where FK_Marker has been set (i.e. it wasn't of course). Sorted by DateTime in descending order,
                // the top two TPs are the two points on this lap. Grab the first one and use it to adjust the start time
                List<TTrackPoint> firstPoints = tPart.trackPoints.Where(s => s.FK_Marker != null && s.FK_Course == tLap.FK_Course).OrderByDescending(x => x.dtStamp).ToList();
               Nullable<double> DistAtLastPoint = firstPoints.ElementAt(1).DistanceOnCourse;
                // Calculate the pace between last point and current point
                int lastPace = Convert.ToInt32(((tLap.EndTime - tLap.StartTime).TotalSeconds) / (tLap.DistanceCompleted - DistAtLastPoint));
                // ... then fix the start time
                int timeToSubtract = Convert.ToInt32(DistAtLastPoint * Convert.ToDouble(lastPace)) * -1;
                tLap.StartTime = tLap.StartTime.AddSeconds(timeToSubtract);
            }

            // Continue with calculations here ...
            TimeSpan elapsed = tLap.EndTime - tLap.StartTime;
            tLap.TimeElapsed = Convert.ToInt32(elapsed.TotalSeconds);
            // lap pace in seconds/mile
            tLap.LapPace = Convert.ToInt32(Convert.ToDouble(tLap.TimeElapsed) / tLap.DistanceCompleted);

            // ...and the estimated time 
            tLap.TimeRemaining = Convert.ToInt32(Convert.ToDouble(tLap.LapPace) * tLap.DistanceRemaining);

            // Update the projected end time (in local race time)
            tLap.ProjEndTime = tLap.EndTime.AddSeconds(Convert.ToDouble(tLap.TimeRemaining));

        }

        private void CalculateParticipantStats(TParticipant activePart, TLap activeLap, bool calcAllStats, bool fixStartTime)
        {
            Nullable<Int32> timeElapsed = 0;
            Nullable<Int32> timeRemaining = 0;
            Nullable<double> distanceCompleted = 0;

            // If we don't have a start time yet, save the timestamp from the track point, otherwise ignore (end time is a projection and calculated below)
            if (activePart.StartTime == DateTime.MinValue)
                activePart.StartTime = activeLap.StartTime;

            if(fixStartTime == true && activeLap.LapNo == 1) // re-save the start time once it's been fixed (for Lap 1 only)
                activePart.StartTime = activeLap.StartTime;

            foreach(TLap lap in activePart.Laps) 
            {
                if(lap.Status == LapStatus.NotStarted) // Status = 0
                {
                    timeRemaining += lap.ProjTotalTime; // Use projection here
                }
                else if (lap.Status == LapStatus.InProgress) // Status = 1
                {
                    timeElapsed += lap.TimeElapsed;
                    distanceCompleted += lap.DistanceCompleted;

                    timeRemaining += lap.TimeRemaining;
                    
                }
                else if(lap.Status == LapStatus.Completed) // Status = 2
                {
                    timeElapsed += lap.TimeElapsed;
                    distanceCompleted += lap.DistanceCompleted;

                }
            }

            // Always Save distance
            activePart.DistanceCompleted = distanceCompleted;

            // The rest we only update if we have an endtime for the lap 
            // This is mainmly needed for lap 1, but won't hurt later on
            if (calcAllStats)
            {
                // Assign to participant object
                activePart.TimeElapsed = timeElapsed;
                activePart.TimeRemaining = timeRemaining;
                // Calculations off above 
                activePart.AvgPace = Convert.ToInt32(Convert.ToDouble(timeElapsed) / distanceCompleted);
                activePart.EndTime = activePart.StartTime.AddSeconds(Convert.ToDouble(activePart.TimeTotal));
            }

            // Update Current Pace IF: we have at least 3 trackpoints on this course. 
            // It's better to take a longer distance to avoid spikes in the pace AND we do not want to deal with crossing the start/finish line
            if (activePart.trackPoints.Count >= 3) 
            {
                TTrackPoint tpRecent = activePart.trackPoints.Last();
                TTrackPoint tpMinusTwo = activePart.trackPoints.ElementAt(activePart.trackPoints.Count - 3);

                if (tpRecent.FK_Course != null && tpRecent.FK_Course == tpMinusTwo.FK_Course)
                {
                    activePart.CurrPace = Convert.ToInt32(Convert.ToDouble((tpRecent.dtStamp - tpMinusTwo.dtStamp).TotalSeconds) / (tpRecent.DistanceOnCourse - tpMinusTwo.DistanceOnCourse));
                }
                else // Set CurrPace back to null otherwise!? TODO
                {

                }
            }

            // Update Participant in DB
            UpdateParticipantToDB(activePart);
        }

        private TCourse NewParticipantLap(TEvent activeEvent, TParticipant activePart)
        {
            TCourse activeCourse;

            if (activePart.CourseID == null) // Race Start
            {
                sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, "Race is starting", "Lap=1, CourseNo=1");   
                activePart.Lap = 1;
                activePart.CourseNo = 1;
                // ONLY Change the status of this lap ...
                UpdateLapStatus(activePart.Laps.FirstOrDefault(s => s.LapNo == activePart.Lap), LapStatus.InProgress, activePart);

            }
            else // next lap & course => need to calculate
            {
                sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, "NextLap");   
                if (activePart.Lap == activeEvent.Laps) // this was the last lap, race is over 
                {
                    sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, "PartLap = EventLaps => Race over", "Resetting CourseID & CourseNo to NULL");
                    activePart.CourseID = null;
                    activePart.CourseNo = null;
                    // ONLY Change the status of the last lap
                    UpdateLapStatus(activePart.Laps.FirstOrDefault(s => s.LapNo == activePart.Lap), LapStatus.Completed, activePart);
                    // Update DB
                    UpdateParticipantToDB(activePart);
                    // Just return null 'cause we're done? // TODO
                    return null;
                }
                else
                {
                    sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, "Increasing ParticipantLap");
                    // CHANGE both previous and current lap ...
                    UpdateLapStatus(activePart.Laps.FirstOrDefault(s => s.LapNo == activePart.Lap), LapStatus.Completed, activePart);
                    activePart.Lap++;  // now increase the lap # and activate the new lap next
                    UpdateLapStatus(activePart.Laps.FirstOrDefault(s => s.LapNo == activePart.Lap), LapStatus.InProgress, activePart);

                    // Determine next course no! => get all highest course number
                    int? maxCourseNo = (from c in activeEvent.Courses orderby c.CourseOrder descending select c.CourseOrder).FirstOrDefault();
                    activePart.CourseNo = ((activePart.CourseNo == maxCourseNo) ? 1 : ++activePart.CourseNo);
                    sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, String.Format("New Course No is: {0}", activePart.CourseNo));
                }
            }
            sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, String.Format("Finding Active course using course no of: {0}", activePart.CourseNo));
            activeCourse = activeEvent.Courses.FirstOrDefault(s => s.CourseOrder == activePart.CourseNo);
            if (activeCourse != null)
            {
                activePart.CourseID = activeCourse.CourseID;
                sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, String.Format("New Course is: {0}", activeCourse.CourseID));
            }
            else
            {
                sfLogger.WriteMessage("SFTRACKING - NewParticipantLap", LogType.Info, "No Course found");
            }
            
            // Update DB
            UpdateParticipantToDB(activePart); // THIS SHOULD BE MOVED UP

            return activeCourse;
        }

        private void UpdateLapStatus(TLap tLap, LapStatus status, TParticipant activePart)
        {

            sfLogger.WriteMessage("SFTRACKING - UpdateLapStatus", LogType.Info, "BEGIN");

            try
            {
                using (new UnitOfWorkScope(true, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;
                    // save to object
                    tLap.Status = status;

                    // get the DB record
                    Lap lap = scopeContext.Laps.FirstOrDefault(s => s.FK_Event == tLap.FK_Event && s.FK_Participant == tLap.FK_Participant && s.LapNo == tLap.LapNo);

                    // One more step for completed laps. We need to fix (or finish) the lap. Because the last point we recorded will have been 
                    // somewhere before the finish line. We will use the participant's current pace to finish out the lap
                    if (status == LapStatus.Completed)
                    {
                        int addTime = Convert.ToInt32(tLap.DistanceRemaining * Convert.ToDouble(activePart.CurrPace));
                        tLap.TimeElapsed += addTime; // Calculate elapsed time;
                        tLap.TimeRemaining = 0; // No more time remaining
                        tLap.DistanceCompleted = tLap.DistanceTotal; // No more distance either
                        // Fix the lap pace 
                        tLap.LapPace = Convert.ToInt32(Convert.ToDouble(tLap.TimeElapsed) / tLap.DistanceCompleted);
                        // ... and the end time
                        tLap.EndTime = tLap.EndTime.AddSeconds(Convert.ToDouble(addTime));

                        // now modify the DB object
                        lap.TimeElapsed = tLap.TimeElapsed;
                        lap.TimeRemaining = tLap.TimeRemaining;
                        lap.DistanceCompleted = tLap.DistanceCompleted;
                        lap.LapPace = tLap.LapPace;
                        lap.EndTime = tLap.EndTime;

                        // ALSO finish up the PARTICIPANT in the same manner
                        activePart.TimeElapsed += addTime;
                        activePart.TimeRemaining = 0;
                        activePart.DistanceCompleted = activePart.DistanceTotal;
                        // recalculate the avg pace & set curr pace = 0
                        activePart.CurrPace = 0;
                        activePart.AvgPace = Convert.ToInt32(Convert.ToDouble(activePart.TimeTotal) / activePart.DistanceTotal);
                        // ... and save the endtime
                        activePart.EndTime = tLap.EndTime;

                        // SAVE PARTICIPANT TO DB
                        UpdateParticipantToDB(activePart);

                    }

                    // always change the status
                    lap.Status = Convert.ToInt32(status);

                    // modify in Database
                    scopeContext.Laps.Attach(lap);
                    scopeContext.Entry(lap).State = System.Data.EntityState.Modified;

                    // Always save changes when we're done with one business operation
                    scopeContext.SaveChanges();
                } // End using

                sfLogger.WriteMessage("SFTRACKING - UpdateLapStatus", LogType.Info, "END");
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - UpdateLapStatus", LogType.Error, ex.Message);
            }
        }

        private void AddTrackPointToDB(TTrackPoint point) 
        {
            sfLogger.WriteMessage("SFTRACKING - AddTrackPointToDB", LogType.Info, "BEGIN");

            try {
            
                using (new UnitOfWorkScope(false,sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    // Create new StrideFly.TrackPoint and update from local TTrackPoint
                    TrackPoint tp = new TrackPoint();
                    tp.Altitude = point.Altitude;
                    tp.DateTime = point.dtStamp;
                    tp.Latitude = point.Latitude;
                    tp.Longitude = point.Longitude;
                    tp.FK_Tracker = point.TrackerID;
                    tp.FK_Course = point.FK_Course;
                    tp.FK_Participant = point.FK_Participant;
                    tp.FK_Marker = point.FK_Marker;
                    tp.BatteryPct = point.Battery;
                    tp.DistanceOnCourse = point.DistanceOnCourse;

                    // also save battery pct to tracker itself (to make it easy for now)
                    UpdateTrackerBattery(point.TrackerID, point.Battery, scopeContext); 
              
                    sfLogger.WriteMessage("SFTRACKING - AddTrackPointToDB", LogType.Info, "Initializing DB Changes");
                    scopeContext.TrackPoints.Add(tp);
                    int ret = scopeContext.SaveChanges();
                    sfLogger.WriteMessage("SFTRACKING - AddTrackPointToDB", LogType.Info, "Context.saveChanges() returned =>", ret.ToString());
                }
            }
            catch (Exception ex)
            {
                string detailMsg;

                if (ex.InnerException == null)
                    detailMsg = "";
                else
                    detailMsg = ex.InnerException.Message;

                sfLogger.WriteMessage("SFTRACKING - AddTrackPointToDB", LogType.Error, ex.Message, detailMsg);
            }
        }

        private void UpdateTrackerBattery(int id, Nullable<double> pct, StrideFlyEntities scopeContext)
        {
            sfLogger.WriteMessage("UPDATETRACKERBATTERY", LogType.Info, String.Format("Updating battery status for {0}", pct));

            try {

              
                 
                    
                    Tracker dbTracker = scopeContext.Trackers.FirstOrDefault(s => s.TrackerID == id);

                    dbTracker.BatteryPct = pct;

                    scopeContext.Trackers.Attach(dbTracker);
                    scopeContext.Entry(dbTracker).State = System.Data.EntityState.Modified;
                    scopeContext.SaveChanges();

            }
            catch(Exception ex)
            {
                  string detailMsg;

                if (ex.InnerException == null)
                    detailMsg = "";
                else
                    detailMsg = ex.InnerException.Message;

                sfLogger.WriteMessage("UPDATETRACKERBATTERY", LogType.Error, ex.Message, detailMsg);

            }
        }

        private void UpdateParticipantToDB(TParticipant activePart)
        {
            sfLogger.WriteMessage("SFTRACKING - UpdateParticipantToDB", LogType.Info, "BEGIN", "Updating Participant to DB");

            try
            {

                using (new UnitOfWorkScope(true, sfLogger))
                {
                    StrideFlyEntities scopeContext = UnitOfWorkScope.CurrentStrideFlyContext;

                    Participant part = scopeContext.Participants.FirstOrDefault(s => s.PartID == activePart.PartID);

                    // update relevant values
                    part.Lap = activePart.Lap;
                    part.FK_Course = activePart.CourseID;
                    part.StartFinishPos = (int)activePart.StartFinishPos;
                    // All the stats have been added below
                    part.TimeElapsed = activePart.TimeElapsed;
                    part.TimeRemaining = activePart.TimeRemaining;
                    part.DistanceTotal = activePart.DistanceTotal;
                    part.DistanceCompleted = activePart.DistanceCompleted;
                    part.AvgPace = activePart.AvgPace;
                    part.CurrPace = activePart.CurrPace;
                    part.CourseNo = activePart.CourseNo;

                    if (activePart.StartTime == DateTime.MinValue)
                        part.StartTime = null;
                    else
                        part.StartTime = activePart.StartTime;

                    if (activePart.EndTime == DateTime.MinValue)
                        part.EndTime = null;
                    else
                        part.EndTime = activePart.EndTime;

                    // Update DB
                    scopeContext.Participants.Attach(part);
                    scopeContext.Entry(part).State = System.Data.EntityState.Modified;
                    scopeContext.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                sfLogger.WriteMessage("SFTRACKING - UpdateParticipantToDB", LogType.Error, ex.Message);
            }
        }

        private void ParseTrackString(String data , TTrackPoint tPoint) //CHANGE
        {
            List<string> trackElems = new List<string>(data.Split(new string[] { "," }, StringSplitOptions.None));

            tPoint.TrackerID = Convert.ToInt32(trackElems[1]);
            
            // DateTime Parsing
            string date = trackElems[11];
            string time = trackElems[3];
            DateTime utcStamp = new DateTime(Convert.ToInt32(String.Format("20{0}", date.Substring(4, 2))),
                                            Convert.ToInt32(date.Substring(2, 2)),
                                            Convert.ToInt32(date.Substring(0, 2)),
                                            Convert.ToInt32(time.Substring(0, 2)),
                                            Convert.ToInt32(time.Substring(2, 2)),
                                            Convert.ToInt32(time.Substring(4, 2)));
            tPoint.dtStamp = utcStamp.AddHours(-7.0);

            // Latitude & Longitude
            tPoint.Latitude = GeoCalc.LetterToSignedDesignation(GeoCalc.DecimalMinutesToDecimalDegrees(trackElems[5]), trackElems[6]);
            tPoint.Longitude = GeoCalc.LetterToSignedDesignation(GeoCalc.DecimalMinutesToDecimalDegrees(trackElems[7]), trackElems[8]);

            // Altitude
            tPoint.Altitude = GeoCalc.ToFeet(Convert.ToDouble(trackElems[19]));

            // Others - IMEI, Satellites & Battery
            tPoint.IMEI = trackElems[17].Substring(trackElems[17].IndexOf(":") + 1);
            tPoint.Satellites = Convert.ToInt32(trackElems[18]);
            string battString = trackElems[20];
            int equalPos = battString.IndexOf("=") + 1;
            tPoint.Battery = Convert.ToDouble(battString.Substring(equalPos, battString.IndexOf("%") - equalPos)) / 100;
        }
    }

    public class TrackData
    {
        public int TrackerID { get; set; }
        public DateTime dtStamp { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string IMEI  { get; set; }
        public int Satellites { get; set; }
        public double Altitude { get; set; }
        public double Battery { get; set; }
    }



    class TEvent
    {
        public TEvent()
        {
            startArea = new List<TStartFinish>();
            finishArea = new List<TStartFinish>();
            evTrackers = new List<int>();
        }
        public int EventID { get; set; }
        public List<TCourse> Courses { get; set; }
        public List<TParticipant> Participants { get; set; }
        public Nullable<Int32> Laps { get; set; }


        public List<TStartFinish> startArea {get; set;}
        public List<TStartFinish> finishArea { get; set; }
        public List<int> evTrackers { get; set; }

        public double maxDistFromStartFinish { get; set; } // keep 'em separate, just in case!!
    }

    public interface IGeoLocation
    {
         double Latitude { get; set; }
         double Longitude{ get; set; }
    }

    class TStartFinish : IGeoLocation
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double RelativeDistance { get; set; }
    }

    class TCourse
    {
        public int CourseID { get; set; }
        public Nullable<Int32> CourseOrder { get; set; }
        public List<TCourseMarker> CourseMarkers { get; set; }
        public Nullable<double> Distance {get; set;}

        // max distance for "onCourse" calculations
        public double maxDistFromMarker { get; set; }

    }

    class TCourseMarker : IGeoLocation
    {
        public int MarkerID { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Distance { get; set; }
        public double Bearing { get; set; }
    }

    class TParticipant
    {
        public TParticipant()
        {
            trackPoints = new List<TTrackPoint>();
        }
        // DB
        public int PartID { get; set; }
        public Nullable<Int32> Lap { get; set; }
        public Nullable<Int32> CourseNo { get; set; }
        public Nullable<Int32> Runners { get; set; }
        // Non-DB
        public Nullable<Int32> CourseID { get; set; }
        public int TrackerID { get; set; }
        public List<TTrackPoint> trackPoints { get; set; }

        // Additional Data
        public StartFinishPosition StartFinishPos {get; set;}
        
        // Overall Participant Statistics
        // TIME
        public Nullable<Int32> TimeElapsed { get; set; }
        public Nullable<Int32> TimeRemaining { get; set; }
        public Nullable<Int32> TimeTotal { get { return TimeElapsed + TimeRemaining; } }
        // DISTANCE
        public Nullable<Double> DistanceTotal { get; set; }
        public Nullable<Double> DistanceCompleted { get; set; }
        public Nullable<Double> DistanceRemaining { get { return DistanceTotal - DistanceCompleted; } }
        // PACE
        public Nullable<Int32> AvgPace { get; set; }
        public Nullable<Int32> CurrPace { get; set; }
        // DATETIME
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        // Laps
        public List<TLap> Laps { get; set; }
    }

    class TLap
    {
        public TLap() 
        {
        }

        public void Init(int xFK_Participant, int xFK_Event, int xLapNo, Nullable<Int32> xRunnerNo, int xFK_Course, Nullable<double> xDistanceTotal)
        {
            FK_Participant = xFK_Participant;
            FK_Event = xFK_Event;
            LapNo = xLapNo;
            RunnerNo = xRunnerNo;
            FK_Course = xFK_Course;
            DistanceTotal = xDistanceTotal;
            Status = LapStatus.NotStarted;
        }

        // These 3 are our true primary key (although database uses a surrogate = LapID)
        public int FK_Participant { get; set; }
        public int FK_Event { get; set; }
        public Nullable<int> LapNo { get; set; }

        // Initialized
        public Nullable<Int32> RunnerNo { get; set; }
        public int FK_Course { get; set; }
        public Nullable<double> DistanceTotal { get; set; }

        // Data logging
        public LapStatus Status { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public Nullable<double> DistanceCompleted { get; set; }
        
        // Calculated by server
        public Nullable<Int32> TimeElapsed { get; set; }
        public Nullable<Int32> TimeRemaining { get; set; }
       
        public Nullable<Int32> LapPace { get; set; }

        // Projections
        public Nullable<Int32> ProjTotalTime { get; set; } // DO NOT TOUCH WHEN LAP HAS BEEN STARTED
        public DateTime ProjStartTime { get; set; } // ... same here although it's not relevant
        public DateTime ProjEndTime { get; set; } // This one will change once the lap is live

        // Calculated upon request
        public Nullable<Int32> TimeTotal { get { return TimeElapsed + TimeRemaining; } }
        public Nullable<double> DistanceRemaining { get { return DistanceTotal - DistanceCompleted; } }
    }

    class TTrackPoint : IGeoLocation
    {
        public TTrackPoint()
        {
            FK_Course = null;
            FK_Participant = null;
            FK_Marker = null;
        }

        // generic point fields
        public int TrackerID { get; set; }
        public DateTime dtStamp { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string IMEI { get; set; }
        public int Satellites { get; set; }
        public double Altitude { get; set; }
        public Nullable<double> Battery { get; set; }
        
        // Additional fields for active events (foreign keys to course, marker and participant)
        public Nullable<Int32> FK_Course { get; set; }
        public Nullable<Int32> FK_Participant { get; set; }
        public Nullable<Int32> FK_Marker { get; set; }

        // Non-DB field: Save the distance for calculation of current pace
        public Nullable<double> DistanceOnCourse { get; set; }


    }

    class PaceData
    {
        public PaceData()
        {
            Distance = 0;
            Time = 0;
        }

        public Nullable<double> Distance {get;set;}
        public Nullable<Int32> Time {get; set;}



        public Nullable<Int32> Pace
        {
            get
            {
                if(Distance == 0)
                    return 0;

                return Convert.ToInt32(Convert.ToDouble(Time) / Distance);
            }
        }
    }

    class RunnerPace : PaceData
    {
        public RunnerPace(Nullable<int> rNo) : base()
        {
            _runnerNo = rNo;
        }

        private Nullable<int> _runnerNo;

        public Nullable<Int32> RunnerNo { get { return _runnerNo; } }
    }

    enum StartFinishPosition 
    {
        None = 0,
        Start = 1,
        Finish = 2
        
    }

    enum LapStatus
    {
        NotStarted = 0,
        InProgress = 1,
        Completed = 2
    }
}
