function MaxMinChart(){

    var margin = {top: 40, right: 40, bottom: 25, left: 50},
        width = 1000 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom,
        markerWidth = 15, markerHeight = 1.5;

    var monthNameFormat = d3.time.format('%B');
    var datePrintFormat = d3.time.format('%B %d');

    var topMarker, bottomMarker, topCaption, bottomCaption, datetext, chartdata;

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


            var div = d3.select(this)
                .selectAll(".chart")
                .data([data]);

            div.enter()
                .append("div")
                .attr("class", "chart")
                .append("svg")
                .append("g");

            var svg = div.select("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);

            var g = svg.select("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            g.append("g")
                .attr({
                    "class": "x axis",
                    "transform": "translate(" + xScale.range()[1] / 24 + "," + -20 + ")"
                })
                .call(xAxis);

            g.selectAll(".record_range")
                .data(data)
                .enter()
                .append("rect")
                .attr({
                    "class": "record_range",
                    "x": function (d) { return xScale(d.date); },
                    "width": width / data.length,
                    "y": function (d) { return yScale(d.rhigh); },
                    "height": function (d) { return yScale(d.rlow) - yScale(d.rhigh); }
                });

            g.selectAll(".norm_range")
                .data(data)
                .enter()
                .append("rect")
                .attr({
                    "class": "norm_range",
                    "x": function (d) { return xScale(d.date); },
                    "width": width / data.length,
                    "y": function (d) { return yScale(d.nhigh); },
                    "height": function (d) { return yScale(d.nlow) - yScale(d.nhigh); }
                });

            g.selectAll(".max_min")
                .data(data)
                .enter()
                .append("rect")
                .attr({
                    "class": "max_min",
                    "x": function (d) { return xScale(d.date); },
                    "width": width / data.length,
                    "y": function (d) { return yScale(d.tmax); },
                    "height": function (d) { return yScale(d.tmin) - yScale(d.tmax); }
                });

            topMarker = g.append("rect")  // the circle for the scrub value
                .attr("width", markerWidth)
                .attr("height", markerHeight)
                .attr("class", "scrubMarker")
                .attr("opacity", 0) // invisible until mouseover
                .style("pointer-events", "none");

            bottomMarker = g.append("rect")  // the circle for the scrub value
                .attr("width", markerWidth)
                .attr("height", markerHeight)
                .attr("class", "scrubMarker")
                .attr("opacity", 0) // invisible until mouseover
                .style("pointer-events", "none");

            topCaption = g.append("text")  // the scrub text for the value - blank at this point
                .attr("class", "caption")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("dy", -8);

            bottomCaption = g.append("text")  // the scrub text for the value - blank at this point
                .attr("class", "caption")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("dy", -8);

            datetext = g.append("text")  // the scrub text for the date - blank at this point
                .attr("class", "caption")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("dy", height + margin.bottom - 5);

            g.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr({
                    "transform": "rotate(-90)",
                    "y": 6,
                    "dy": ".71em",
                    "text-anchor": "end"
                })
                .style()
                .text("Temperature (Deg F)");

            g.selectAll(".vertGrid")
                .data(xScale.ticks())
                .enter()
                .append("line")
                .attr({
                    "class":"vertGrid",
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
        });

    }

    function mouseover(){
        topMarker.attr("opacity", 1.0);  // make the scrub circle visible
        bottomMarker.attr("opacity", 1.0);  // make the scrub circle visible
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
        var rhigh = chartdata[index].rhigh;
        var rlow = chartdata[index].rlow;
        topMarker.attr("x", x - markerWidth/2)
            .attr("y", yScale(tmax));
        bottomMarker.attr("x", x - markerWidth/2)
            .attr("y", yScale(tmin));

        topCaption.attr("x", x)
            .attr("y", yScale(rhigh))
            .text(Math.round(tmax*10)/10 + "\xB0F");

        bottomCaption.attr("x", x)
            .attr("y", yScale(rlow) + 25)
            .text(Math.round(tmin*10)/10 + "\xB0F");

        datetext.attr("x", x)
            .text(formattedDate);
    }

    function mouseout() {
        topMarker.attr("opacity", 0);  // make the scrub circle invisible again
        bottomMarker.attr("opacity", 0);  // make the scrub circle invisible again

        topCaption.text(""); // delete scrub value and year text
        bottomCaption.text("");

        datetext.text("");
    }

    return chart;
}