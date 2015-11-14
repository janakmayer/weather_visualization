
function deepCopy(obj) {
    if (Object.prototype.toString.call(obj) === '[object Array]') {
        var out = [], i = 0, len = obj.length;
        for ( ; i < len; i++ ) {
            out[i] = arguments.callee(obj[i]);
        }
        return out;
    }
    if (typeof obj === 'object') {
        var out = {}, i;
        for ( i in obj ) {
            out[i] = arguments.callee(obj[i]);
        }
        return out;
    }
    return obj;
}

function transformData(data) {
    var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse;
    var monthNameFormat = d3.time.format('%B');
    data = deepCopy(data); //operate on a deep copy of the array, not the original, otherwise problems on repeat
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
        d.maxcumprcp = +d.maxcumprcp;
    });
    return data;
}

function plotData(selector, data, plot) { return d3.select(selector).datum(data).call(plot); }


function plotYear(year, data){
    var subset = transformData(data[year]);
    plotData("#maxmin_viz", subset, MaxMinChart());
    plotData("#cumprecip_viz", subset, SmallMultiples());
}

document.addEventListener("DOMContentLoaded", function(event) {
    d3.csv("data/NYCWeather.csv", function(error, data) {
        if (error) throw error;
        var nested = d3.nest()
            .key(function (d) { return d.year; })
            .map(data); //returns an object of the dataset for each year, keyed by year

        var Year = 2003;
        d3.select('#sliderText').text(Year)
        plotYear(Year, nested);

        var slider = d3.slider().axis(true)
            .min(d3.min(data, function(d) { return d.year; }))
            .max(d3.max(data, function(d) { return d.year; }))
            .step(1)
            .value(Year)
            .on("slide", function(evt, value) {
                Year = value;
                d3.select('#sliderText').text(Year);
                plotYear(Year, nested);
            });
        d3.select('#yearSlider').call(slider);

        d3.select("#previousYear")
            .on("click", function() {
                if (slider.value()>slider.min()){
                    Year -= 1;
                    slider.value(Year);
                }
            });

        d3.select("#nextYear")
            .on("click", function() {
                if (slider.value()<slider.max()){
                    Year += 1;
                    slider.value(Year);
                }
            });
    });
});