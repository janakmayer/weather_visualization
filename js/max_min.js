function MaxMinChart(){

    var margin = {top: 40, right: 25, bottom: 25, left: 25},
        width = 940 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom,
        markerWidth = 15, markerHeight = 1.5;

    var monthNameFormat = d3.time.format('%B');
    var datePrintFormat = d3.time.format('%b %d, %Y');

    var chartdata;

    var xScale = d3.time.scale()
        .range([0, width]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .tickFormat(monthNameFormat)
        .orient("bottom")
        .tickSize(0);

    var yScale = d3.scale.linear()
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    // calculate the pixel-width of the timeScale tick marks
    function tickWidthToPixels(scale, d, i) {
        var next = i == scale.ticks().length - 1 ? scale.range()[1] : scale(scale.ticks()[i + 1]);
        return next - scale(d)
    }

    function chart(selection){
        selection.each(function(data){

            chartdata = data;

            // Set up X and Y Scales
            xScale.domain(d3.extent(data, function(d) { return d.date; }));
            yScale.domain([d3.min(data, function(d) { return d.rlow; }),d3.max(data, function(d) { return d.rhigh; })]);



            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg").data([data]);

            // Otherwise, create the skeletal chart.
            var gEnter = svg.enter().append("svg").append("g");

            // Update the outer dimensions.
            svg .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)

            // Update the inner dimensions.
            var g = svg.select("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            g.selectAll(".record_range")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "record_range");

            g.selectAll(".record_range")

                .attr({
                    "x": function (d) { return xScale(d.date); },
                    "width": width / data.length,
                    "y": function (d) { return yScale(d.rhigh); },
                    "height": function (d) { return yScale(d.rlow) - yScale(d.rhigh); }
                });

            g.selectAll(".norm_range")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "norm_range");

            g.selectAll(".norm_range")
                .attr({
                    "x": function (d) { return xScale(d.date); },
                    "width": width / data.length,
                    "y": function (d) { return yScale(d.nhigh); },
                    "height": function (d) { return yScale(d.nlow) - yScale(d.nhigh); }
                });

            g.selectAll(".max_min")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "max_min");

            g.selectAll(".max_min")
                //.transition()
                //.duration(200)
                .attr({
                    "x": function (d) { return xScale(d.date); },
                    "width": width / data.length,
                    "y": function (d) { return yScale(d.tmax); },
                    "height": function (d) {
                        if (d.tmin==null || d.tmax==null){
                                console.log(d);
                            }
                        return yScale(d.tmin) - yScale(d.tmax); }
                });

            g.append("rect")  // the top marker for the scrub value
                .attr("width", markerWidth)
                .attr("height", markerHeight)
                .attr("id", "topMarker")
                .attr("class", "scrubMarker")
                .attr("opacity", 0) // invisible until mouseover
                .style("pointer-events", "none");

            g.append("rect")  // the bottom marker for the scrub value
                .attr("width", markerWidth)
                .attr("height", markerHeight)
                .attr("id", "bottomMarker")
                .attr("class", "scrubMarker")
                .attr("opacity", 0) // invisible until mouseover
                .style("pointer-events", "none");

            g.append("text")  // the scrub text for the value - blank at this point
                .attr("class", "caption")
                .attr("id", "topCaption")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("dy", -15);

            g.append("text")  // the scrub text for the value - blank at this point
                .attr("class", "caption")
                .attr("id", "bottomCaption")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("dy", +30);

            g.append("text")  // the scrub text for the date - blank at this point
                .attr("class", "caption")
                .attr("id", "datetext")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("dy", height + margin.bottom - 5);


            g.selectAll(".vertGrid")
                .data(xScale.ticks())
                .enter()
                .append("line")
                .attr("class", "vertGrid");
            g.selectAll(".vertGrid")
                .attr({
                    "x1" : function(d){ return xScale(d) },
                    "x2" : function(d){ return xScale(d) },
                    "y1" : 0,
                    "y2" : height
                });

            g.append("rect")  // invisible rectangle to capture mouse events and trigger functions
                .attr("class", "background")
                .style("pointer-events", "all")
                .attr("width", width)  // adding margin give space to mouse over final value
                .attr("height", height)
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseout", mouseout);

            gEnter.append("g")
                .attr({
                    "class": "x axis",
                    "transform": "translate(" + xScale.range()[1] / 24 + "," + -20 + ")"
                })
                .call(xAxis);

            gEnter.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr({
                    "transform": "rotate(-90)",
                    "y": 6,
                    "dy": ".71em",
                    "text-anchor": "end"
                })
                .text("Temperature (Deg F)");


        });

    }

    function mouseover(){
        d3.select("#topMarker").attr("opacity", 1.0);  // make the scrub circle visible
        d3.select("#bottomMarker").attr("opacity", 1.0);  // make the scrub circle visible
        mousemove.call(this);
    }

    function mousemove(){
        var x = d3.mouse(this)[0];
        var date = xScale.invert(x); // invert scale to translate x from mouse (x,y) to date
        var day = date.getDate();
        var month = date.getMonth()+1;
        var year = date.getFullYear();
        date = d3.time.format("%Y-%m-%d").parse(''+year+'-'+month+'-'+day);  // Round to nearest day

        var bisect = d3.bisector(function(d) { return d.date; }).left;
        var index = bisect(chartdata, date, 0, chartdata.length - 1);
        var formattedDate = datePrintFormat(chartdata[index].date);
        var tmax = chartdata[index].tmax;
        var tmin = chartdata[index].tmin;
        var nhigh = Math.max(chartdata[index].nhigh+10, tmax);
        var nlow = Math.min(chartdata[index].nlow-10, tmin);
        d3.select("#topMarker").attr("x", x - markerWidth/2)
            .attr("y", yScale(tmax));
        d3.select("#bottomMarker").attr("x", x - markerWidth/2)
            .attr("y", yScale(tmin));

        d3.select("#topCaption").attr("x", x)
            .attr("y", yScale(nhigh))
            .text("High: " + Math.round(tmax*10)/10 + "\xB0F");

        d3.select("#bottomCaption").attr("x", x)
            .attr("y", yScale(nlow))
            .text("Low: " + Math.round(tmin*10)/10 + "\xB0F");

        d3.select("#datetext").attr("x", x)
            .text(formattedDate);
    }

    function mouseout() {
        d3.select("#topMarker").attr("opacity", 0);  // make the scrub circle invisible again
        d3.select("#bottomMarker").attr("opacity", 0);  // make the scrub circle invisible again

        d3.select("#topCaption").text(""); // delete scrub value and year text
        d3.select("#bottomCaption").text("");

        d3.select("#datetext").text("");
    }

    return chart;
}