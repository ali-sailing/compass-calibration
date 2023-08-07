const ROW_COUNT = 8;


function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function fixdeg(deg) {
  deg = parseFloat(deg);
  if (deg >= 360) {
    return deg - 360;
  }
  else if (deg < 0) {
    return deg + 360;
  }
  return deg;
}

function rrb_to_rb(rrb) {
  return fixdeg(parseInt(rrb) + 180);
}

function get_hrb(rrb, h) {
  return fixdeg(rrb_to_rb(rrb) + parseInt(h));
}

function true_to_mag(d) {
  return parseFloat(d) + parseFloat(el('inputVariation').value);
}

function to_utc(time) {
  var hour = parseInt(time.substring(0, 2));
  var minute = parseInt(time.substring(2, 4));
  var second = parseInt(time.substring(4, 6));
  var year = parseInt(el('inputYear').value);
  var month = parseInt(el('inputMonth').value);
  var day = parseInt(el('inputDay').value);
  var tz = parseFloat(el('inputZone').value);

  var utc = luxon.DateTime.utc(year, month, day, hour, minute, second);
  if(!utc.isValid){
    return null;
  }
  utc = utc.minus({ hours: tz });
  return utc;
}

function dm_to_dd(d, m) {
  var mult = d < 0 ? -1.0 : 1.0;
  var res = parseFloat(Math.abs(d)) + parseFloat(Math.abs(m)) / 60.0;
  return mult * res;
}

// Return degrees part of decimal degrees
function dd_deg(dd){
  return Math.floor(dd);
}

// Return decimal minutes part of decimal degrees
function dd_dm(dd){
  var val = Math.abs(dd);
  val -= Math.floor(val);
  return r2(val * 60);
}

function azimuth(year, month, day, hour, minute, second, tz, lat, lon) {
  var azel = noaa_calc(year, month, day, hour, minute, second, tz, lat, lon);
  return azel.azimuth;

}
function r0(v) {
  return Math.round(v);
}
function r1(v) {
  return Math.round(v * 10.0) / 10.0;
}
function r2(v) {
  return Math.round(v * 100.0) / 100.0;
}
function get_deviation(az_mag, hrb, text = true) {
  var dev = hrb - Math.round(az_mag);
  if (!text) {
    return dev;
  }
  if (dev == 0) {
    return "0";
  }
  var suffix = dev > 0 ? "W" : "E";
  return Math.abs(dev) + suffix;
}

function c_to_m(item) {
  var dev = this.get_deviation(item, false);
  return this.fixdeg(item.h - dev);
}

function el(s) {
  return document.getElementById(s);
}

function calc_all() {
  el('errorDate').style.display = "none";
  data = [];
  for (var i = 0; i < ROW_COUNT; i++) {
    d = calc_row(i);
    if(!d){
      return;
    }
    data.push(d);
    update_row(d, i)
  }
  plot(data);
}


function el_change(event){
  calc_all();
}

function plot(data) {
  var ctx = document.getElementById("myChart");
  var devs = [];
  for (var i = 0; i < ROW_COUNT; i++) {
    devs.push({ x: data[i].h, y: data[i].dev_val});
  }
  devs.push({ x: 360, y: data[0].dev_val});
  if(myChart){
    myChart.destroy();
  }


  myChart = new Chart(ctx, {
    type: "scatter",

    data: {
      labels: ["000", "045", "090", "135", "180", "225", "270", "315", "360"],
      datasets: [
        {
          label: "Deviation",
          data: devs,
          borderColor: "#222",
          pointRadius: "4",
          pointBorderColor: "#000",
          pointBackgroundColor: "#000",
          showLine: true
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          display: false
        }
      },
      events: [],
      scales: {
        x: {
          title: {
            display: true,
            text: "Boat Heading",
            color: "#000"
          },
          ticks: {
            color: "#000",
            stepSize: 22.5,
            callback: function (value, index, ticks) {
              if ( value % 45 != 0) return ''; // do not label in-between points
              if (value == 0) return '000';
              if (value < 100) return '0' + value;
              return value;
            }
          },
          grid: {
            color: "#000"
          }
        },
        y: {
          title: {
            display: true,
            text: "Deviation",
            color: "#000"
          },
          ticks: {
            stepSize: 1,
            color: "#000",
            beginAtZero: true,
            callback: function (value, index, ticks) {
              if (value == 0) return 0;
              return Math.abs(value) + (value < 0 ? "E" : "W");
            }
          },
          grid: {
            color: "#000"
          }
        }
      }
    }
  });

}


function update_row(d, i) {
  el(i + "_utc").innerText = d.utc.toLocaleString(luxon.DateTime.TIME_24_WITH_SECONDS);
  el(i + "_rb").innerText = d.rb;
  el(i + "_hrb").innerText = d.hrb;
  el(i + "_azt").innerText = r1(d.az);// + " | " + r2(d.az2)
  el(i + "_azm").innerText = r1(d.azmag);
  el(i + "_dev").innerText = d.dev;

  el("d" + i + "_d").innerText = d.dev;
  el("d" + i + "_hm").innerText = pad(fixdeg(d.h - d.dev_val, true), 3);
  if (i == 0) { // do 360 for 0
    el("d" + ROW_COUNT + "_d").innerText = d.dev;
    el("d" + ROW_COUNT + "_hm").innerText = pad(fixdeg(d.h - d.dev_val, true), 3);
  }
}


function calc_row(i) {
  var data = {};
  data.time = el(i + "_time").value;
  data.utc = to_utc(data.time);
  if(!data.utc){
    el('errorDate').style.display = "block";
    return null;
  }
  data.h = parseInt(el(i + "_h").innerText);
  data.rrb = el(i + "_rrb").value;
  data.rb = rrb_to_rb(data.rrb);
  data.hrb = get_hrb(data.rrb, data.h);
  ///
  data.year = parseInt(el('inputYear').value);
  data.month = parseInt(el('inputMonth').value);
  data.day = parseInt(el('inputDay').value);
  data.hour = parseInt(data.time.substring(0, 2));
  data.minute = parseInt(data.time.substring(2, 4));
  data.second = parseInt(data.time.substring(4, 6));
  data.tz = parseFloat(el('inputZone').value);
  data.lat = dm_to_dd(el('inputLatDeg').value, el('inputLatMin').value);
  data.lon = dm_to_dd(el('inputLonDeg').value, el('inputLonMin').value);

  data.az = azimuth(data.year, data.month, data.day, data.hour, data.minute, data.second, data.tz, data.lat, data.lon);
  //sc = SunCalc.getPosition(data.utc.toJSDate(), data.lat, data.lon);
  //data.az2 =   (180.0 * sc.azimuth / Math.PI) + 180;
  data.azmag = true_to_mag(data.az);
  data.dev = get_deviation(data.azmag, data.hrb);
  data.dev_val = get_deviation(data.azmag, data.hrb, false);

  return data;

}

function capture_time_loc(){

  function capture_date_time() {
    const now = new Date();
    const hms = pad(now.getHours(),2) + pad(now.getMinutes(),2) + pad(now.getSeconds(),2);
    el('inputYear').value = now.getFullYear();
    el('inputMonth').value = String(now.getMonth() + 1).padStart(2, '0');
    el('inputDay').value = String(now.getDate()).padStart(2, '0');
  
    // Set all times
    for (var i = 0; i < ROW_COUNT; i++) {
      el(i + "_time").value = hms;
    }
  
    //The number of minutes returned by getTimezoneOffset() is positive if the local time zone is behind UTC
    el('inputZone').value = now.getTimezoneOffset() / -60.0; 
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  };

  function success(pos) {
    const crd = pos.coords;
    capture_date_time();
    el('inputLatDeg').value = dd_deg(crd.latitude);
    el('inputLatMin').value = dd_dm(crd.latitude);
    el('inputLonDeg').value = dd_deg(crd.longitude);
    el('inputLonMin').value = dd_dm(crd.longitude);

    // Calculate variation
    const mv = new MagVar();
    el('inputVariation').value = r1(-1 * mv.get(crd.latitude, crd.longitude)); // We use West positive, model uses West negative
    el_change(); // data has changed, run event

    const accuracy = r0(3.28084 * crd.accuracy);
    alert(`Location has been captured with accuracy of ${accuracy} feet. Additionally, magnetic variation has been set based on WMM2020, valid from 2020-2025. Please double check all values.`);
  }
  
  function error(err) {
    capture_date_time();
    el_change(); // data has changed, run event
    alert("Unable to obtain current location, date and time have been set");
  }

  // Try to get location
  navigator.geolocation.getCurrentPosition(success, error, options);
}

function show_hide_details(){
  var detail_cols = document.getElementsByClassName('detail-col');
  for(i = 0; i < detail_cols.length; i++) {
    detail_cols[i].style.display = el('show_details').checked ? '' : 'none';
  }
}

myChart = null;


(function() {
  'use strict';
  window.addEventListener('load', function() {
    // fetch all the forms we want to apply custom style
    var inputs = document.getElementsByClassName('form-control')

    // loop over each input and watch blur event
    var validation = Array.prototype.filter.call(inputs, function(input) {

      input.addEventListener('input', function(event) {
        // reset
        input.classList.remove('is-invalid')
        input.classList.remove('is-valid')

        if (input.checkValidity() === false) {
            input.classList.add('is-invalid')
        }
        else {
            //input.classList.add('is-valid')
        }
      }, false);
    });
  }, false);
})()

// Handle Chart Printing
window.addEventListener('beforeprint', () => {
  myChart.resize(800, 600);
});
window.addEventListener('afterprint', () => {
  myChart.resize();
});