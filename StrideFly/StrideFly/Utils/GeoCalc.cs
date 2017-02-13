using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace StrideFly.Utils
{
    /*** edited by macbook pc ***/
    public static class GeoCalc
    {
        private static double EarthRadius = 3956.0;
        private static double MeterInFeet = 3.28084;

        private static double ToRadian(double v)
        {
            return v * (Math.PI / 180);
        }

        private static double ToDegrees(double v)
        {
            return v * (180 / Math.PI);
        }

        public static double ToFeet(double meters)
        {
            return Math.Round(meters * MeterInFeet, 1);
        }

        private static double DiffRadian(double v1, double v2)
        {
            return ToRadian(v2) - ToRadian(v1);
        }

        public static double Exact(double Lat1, double Lng1, double Lat2, double Lng2)
        {
         

            return EarthRadius * 2 * Math.Asin(Math.Min(1, Math.Sqrt(
                                    (Math.Pow(Math.Sin((DiffRadian(Lat1, Lat2)) / 2.0), 2.0) +
                                    Math.Cos(ToRadian(Lat1)) * Math.Cos(ToRadian(Lat2)) *
                                    Math.Pow(Math.Sin((DiffRadian(Lng1, Lng2)) / 2.0), 2.0)))));
        }

        public static double Appr(double xLat1, double Lng1, double xLat2, double Lng2)
        {

            double lat1 = ToRadian(xLat1);
            double lat2 = ToRadian(xLat2);

            double x = (ToRadian(Lng2) - ToRadian(Lng1)) * Math.Cos((lat1 + lat2) / 2);
            double y = (lat2 - lat1);
            double dist = Math.Sqrt(x * x + y * y) * EarthRadius;

            return dist;
        }

        public static double InitialBearing(double Lat1, double Lng1, double Lat2, double Lng2)
        {
            double y = Math.Sin(Lng2 - Lng1) * Math.Cos(Lat2);
            double x = Math.Cos(Lat1) * Math.Sin(Lat2) - Math.Sin(Lat1) * Math.Cos(Lat2) * Math.Cos(Lng2 - Lng1);
            // Calculate bearing +180/-180
            double brng = ToDegrees(Math.Atan2(y, x));
            //Normalize to 0-360
            return ((brng + 360) % 360);
        }

        public static double FinalBearing(double Lat1, double Lng1, double Lat2, double Lng2)
        {
            // get bearing from end to start point
            double brng = InitialBearing(Lat2, Lng2, Lat1, Lng1);
            // .... and reverse to get final bearing
            return ((brng + 180) % 360);
        }
    }
}