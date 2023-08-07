// Code based on https://gml.noaa.gov/grad/solcalc/ and https://gml.noaa.gov/grad/solcalc/calcdetails.html

function noaa_calc(year, month, day, hour, minute, second, tz, lat, lon){
  function calcTimeJulianCent(jd) {
    var T = (jd - 2451545.0)/36525.0
    return T
  }

  function calcJDFromJulianCent(t) {
    var JD = t * 36525.0 + 2451545.0
    return JD
  }

  function isLeapYear(yr) {
    return ((yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0);
  }

  function radToDeg(angleRad) {
    return (180.0 * angleRad / Math.PI);
  }

  function degToRad(angleDeg) {
    return (Math.PI * angleDeg / 180.0);
  }

  function calcGeomMeanLongSun(t) {
    var L0 = 280.46646 + t * (36000.76983 + t*(0.0003032))
    while(L0 > 360.0) {
      L0 -= 360.0
    }
    while(L0 < 0.0) {
      L0 += 360.0
    }
    return L0		// in degrees
  }

  function calcGeomMeanAnomalySun(t) {
    var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    return M;		// in degrees
  }

  function calcEccentricityEarthOrbit(t) {
    var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    return e;		// unitless
  }

  function calcSunEqOfCenter(t) {
    var m = calcGeomMeanAnomalySun(t);
    var mrad = degToRad(m);
    var sinm = Math.sin(mrad);
    var sin2m = Math.sin(mrad+mrad);
    var sin3m = Math.sin(mrad+mrad+mrad);
    var C = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m * (0.019993 - 0.000101 * t) + sin3m * 0.000289;
    return C;		// in degrees
  }

  function calcSunTrueLong(t) {
    var l0 = calcGeomMeanLongSun(t);
    var c = calcSunEqOfCenter(t);
    var O = l0 + c;
    return O;		// in degrees
  }

  function calcSunTrueAnomaly(t) {
    var m = calcGeomMeanAnomalySun(t);
    var c = calcSunEqOfCenter(t);
    var v = m + c;
    return v;		// in degrees
  }

  function calcSunRadVector(t) {
    var v = calcSunTrueAnomaly(t);
    var e = calcEccentricityEarthOrbit(t);
    var R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(degToRad(v)));
    return R;		// in AUs
  }

  function calcSunApparentLong(t) {
    var o = calcSunTrueLong(t);
    var omega = 125.04 - 1934.136 * t;
    var lambda = o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
    return lambda;		// in degrees
  }

  function calcMeanObliquityOfEcliptic(t) {
    var seconds = 21.448 - t*(46.8150 + t*(0.00059 - t*(0.001813)));
    var e0 = 23.0 + (26.0 + (seconds/60.0))/60.0;
    return e0;		// in degrees
  }

  function calcObliquityCorrection(t) {
    var e0 = calcMeanObliquityOfEcliptic(t);
    var omega = 125.04 - 1934.136 * t;
    var e = e0 + 0.00256 * Math.cos(degToRad(omega));
    return e;		// in degrees
  }

  function calcSunRtAscension(t) {
    var e = calcObliquityCorrection(t);
    var lambda = calcSunApparentLong(t);
    var tananum = (Math.cos(degToRad(e)) * Math.sin(degToRad(lambda)));
    var tanadenom = (Math.cos(degToRad(lambda)));
    var alpha = radToDeg(Math.atan2(tananum, tanadenom));
    return alpha;		// in degrees
  }

  function calcSunDeclination(t) {
    var e = calcObliquityCorrection(t);
    var lambda = calcSunApparentLong(t);
    var sint = Math.sin(degToRad(e)) * Math.sin(degToRad(lambda));
    var theta = radToDeg(Math.asin(sint));
    return theta;		// in degrees
  }

  function calcEquationOfTime(t) {
    var epsilon = calcObliquityCorrection(t);
    var l0 = calcGeomMeanLongSun(t);
    var e = calcEccentricityEarthOrbit(t);
    var m = calcGeomMeanAnomalySun(t);

    var y = Math.tan(degToRad(epsilon)/2.0);
    y *= y;

    var sin2l0 = Math.sin(2.0 * degToRad(l0));
    var sinm   = Math.sin(degToRad(m));
    var cos2l0 = Math.cos(2.0 * degToRad(l0));
    var sin4l0 = Math.sin(4.0 * degToRad(l0));
    var sin2m  = Math.sin(2.0 * degToRad(m));

    var Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
    return radToDeg(Etime)*4.0;	// in minutes of time
  }


  function getJD(year, month, day) {
    if (month <= 2) {
      year -= 1
      month += 12
    }
    var A = Math.floor(year/100)
    var B = 2 - A + Math.floor(A/4)
    var JD = Math.floor(365.25*(year + 4716)) + Math.floor(30.6001*(month+1)) + day + B - 1524.5
    return JD
  }

  function calcRefraction(elev) {

    if (elev > 85.0) {
      var correction = 0.0;
    } else {
      var te = Math.tan(degToRad(elev));
      if (elev > 5.0) {
        var correction = 58.1 / te - 0.07 / (te*te*te) + 0.000086 / (te*te*te*te*te);
      } else if (elev > -0.575) {
        var correction = 1735.0 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711) ) );
      } else {
        var correction = -20.774 / te;
      }
      correction = correction / 3600.0;
    }

    return correction
  }

  function calcAzEl(T, localtime, latitude, longitude, zone) {

    var eqTime = calcEquationOfTime(T)
    var theta  = calcSunDeclination(T)

    var solarTimeFix = eqTime + 4.0 * longitude - 60.0 * zone
    var earthRadVec = calcSunRadVector(T)
    var trueSolarTime = localtime + solarTimeFix
    while (trueSolarTime > 1440) {
      trueSolarTime -= 1440
    }
    var hourAngle = trueSolarTime / 4.0 - 180.0;
    if (hourAngle < -180) {
      hourAngle += 360.0
    }
    var haRad = degToRad(hourAngle)
    var csz = Math.sin(degToRad(latitude)) * Math.sin(degToRad(theta)) + Math.cos(degToRad(latitude)) * Math.cos(degToRad(theta)) * Math.cos(haRad)
    if (csz > 1.0) {
      csz = 1.0
    } else if (csz < -1.0) { 
      csz = -1.0
    }
    var zenith = radToDeg(Math.acos(csz))
    var azDenom = ( Math.cos(degToRad(latitude)) * Math.sin(degToRad(zenith)) )
    if (Math.abs(azDenom) > 0.001) {
      var azRad = (( Math.sin(degToRad(latitude)) * Math.cos(degToRad(zenith)) ) - Math.sin(degToRad(theta))) / azDenom
      if (Math.abs(azRad) > 1.0) {
        if (azRad < 0) {
          azRad = -1.0
        } else {
          azRad = 1.0
        }
      }
      var azimuth = 180.0 - radToDeg(Math.acos(azRad))
      if (hourAngle > 0.0) {
        azimuth = -azimuth
      }
    } else {
      if (latitude > 0.0) {
        var azimuth = 180.0
      } else { 
        var azimuth = 0.0
      }
    }
    if (azimuth < 0.0) {
      azimuth += 360.0
    }
    var exoatmElevation = 90.0 - zenith

    // Atmospheric Refraction correction
    var refractionCorrection = calcRefraction(exoatmElevation)

    var solarZen = zenith - refractionCorrection;
    var elevation = 90.0 - solarZen

    return {"azimuth": azimuth, "elevation": elevation}
  }
  /*************************************************************/
  /* end calculation functions */
  /*************************************************************/
  var jday = getJD(year, month, day);
  var time_local_mins = hour*60 + minute + second/60.0;
  var total = jday + time_local_mins/1440.0 - tz/24.0;
  var T = calcTimeJulianCent(total);
  return calcAzEl(T, time_local_mins, lat, lon, tz);
}