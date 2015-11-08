function transformData(data) {
    var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse;
    var monthNameFormat = d3.time.format('%B');
    data.forEach(function (d) {
        d.date = parseDate(d.date);
        d.month = monthNameFormat(d.date);
        d.tmax = +d.tmax;
        d.tmin = +d.tmin;
        d.tmin = +d.tmin;
        d.rhigh = +d.rhigh;
        d.rlow = +d.rlow;
        d.nhigh = +d.nhigh;
        d.nlow = +d.nlow;
        d.cumprcp = +d.cumprcp;
        d.meanprcp = +d.meanprcp;
    });
    return data;
}

function plotData(selector, data, plot) { return d3.select(selector).datum(data).call(plot); }

document.addEventListener("DOMContentLoaded", function(event) {
    d3.csv("NY2003Weather.csv", function(error, data) {
        if (error) throw error;
        data = transformData(data);
        plotData("#maxmin_viz", data, MaxMinChart());
        plotData("#cumprecip_viz", data, SmallMultiples());
    });
});