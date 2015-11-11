function SmallMultiples() {

    var margin = {top: 20, right: 25, bottom: 40, left: 25},
        width = 940 - margin.left - margin.right,
        height = 150;

    var monthNameFormat = d3.time.format('%B');
    var datePrintFormat = d3.time.format('%B %d, %Y');

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

            var nested = d3.nest()
                .key(function (d) { return d.month; })
                .sortValues(function (a, b) { return d3.ascending(a.date, b.date); })
                .entries(data);

            // Set up X and Y Scales
            xScale.domain(d3.extent(data, function (d) { return d.date; }));
            yScale.domain([0, Math.ceil(data[0].maxcumprcp)]);
            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg").data([data]);

            // Otherwise, create the skeletal chart.
            gEnter = svg.enter().append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g");


            gEnter.append("g")
                .attr({
                    "class": "x axis",
                    "transform": "translate(" + xScale.range()[1] / 24 + "," + height*1.1 + ")"
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
                .text("Precipitation (in)");

            var g = svg.select("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            g.selectAll(".smallMultiples")
                .data(nested)
                .enter()
                .append("g")
                .attr("class", "smallMultiples")
                .attr("id", function (d,i) { return "sm"+i; })  //unique id for each sm group
                .each(function (data, i) {
                    var sm_g = d3.select("#sm"+i);
                    sm_g.append("path").attr("class", "precip_area").attr("id", "precip_area"+i);
                    sm_g.append("path").attr("class", "precip_mean").attr("id", "precip_mean"+i);
                    sm_g.append("path").attr("class", "precip_line").attr("id", "precip_line"+i);

                    sm_g.append("circle")  // the circle for the scrub value
                        .attr("r", 2.2)
                        .attr("class", "scrubcircle")
                        .attr("id", "scrubcircle")
                        .attr("opacity", 0) // invisible until mouseover
                        .style("pointer-events", "none");

                    sm_g.append("text")  // the scrub text for the value - blank at this point
                        .attr("class", "caption")
                        .attr("id", "value-caption")
                        .attr("text-anchor", "middle")
                        .style("pointer-events", "none")
                        .attr("dy", -8);

                    sm_g.append("text")  // the scrub text for the date - blank at this point
                        .attr("class", "caption")
                        .attr("id", "date-caption")
                        .attr("text-anchor", "middle")
                        .style("pointer-events", "none")
                        .attr("transform", "translate(0," + - margin.top/2 + ")")
                        .attr("dy", 0);
                });

            g.selectAll(".smallMultiples")
                .data(nested)
                .enter()
                .append("line")
                .attr({
                    "class": "vertGrid",
                    "x1": function (d) { return xScale(d.values[0].date) },
                    "x2": function (d) { return xScale(d.values[0].date) },
                    "y1": 0,
                    "y2": height
                });


            g.selectAll(".smallMultiples")
                .data(nested)
                .each(function (data, i) {
                    data = data.values;
                    var x_origin = xScale(data[0].date);
                    var x_extent = x_origin + tickWidthToPixels(xScale, data[0].date, i);

                    var sm_xScale = d3.time.scale()
                        .domain(d3.extent(data, function (d) { return d.date; }))
                        .range([x_origin, x_extent]);

                    var cum_precip_line = d3.svg.line()
                        .x(function (d) { return sm_xScale(d.date); })
                        .y(function (d) { return yScale(d.cumprcp); });

                    var mean_precip_line = d3.svg.line()
                        .x(function (d) { return sm_xScale(d.date); })
                        .y(function (d) { return yScale(d.meanprcp); });

                    var area = d3.svg.area()
                        .x(function (d) { return sm_xScale(d.date); })
                        .y(function (d) { return yScale(d.cumprcp); })
                        .y0(height);

                    d3.select("#precip_area"+i)
                        .transition()
                        .duration(200)
                        .attr("d", area(data));

                    d3.select("#precip_mean"+i)
                        .transition()
                        .duration(200)
                        .attr("d", mean_precip_line(data));

                    d3.select("#precip_line"+i)
                        .transition()
                        .duration(200)
                        .attr("d", cum_precip_line(data));
                });

            gEnter.append("rect")  // invisible rectangle to capture mouse events and trigger functions
                .attr("class", "background")
                .style("pointer-events", "all")
                .attr("width", width)  // adding margin give space to mouse over final value
                .attr("height", height);

            g.selectAll(".background")
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseout", mouseout);

        });

    }
    function mouseover(){
        d3.select("#scrubcircle")
            .attr("opacity", 1.0);  // make the scrub circle visible
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
        var cumPrecip = chartdata[index].cumprcp;
        var y = yScale(cumPrecip);

        d3.select("#scrubcircle")
            .attr("cx", x)
            .attr("cy", y);

        d3.select("#value-caption")
            .attr("x", x)
            .attr("y", y)
            .text("Cum. Precip.: "+Math.round(cumPrecip*10)/10 + " in");

        d3.select("#date-caption").attr("x", x)
            .text(formattedDate);
    }

    function mouseout() {
        d3.select("#scrubcircle").attr("opacity", 0);  // make the scrub circle invisible again
        d3.select("#value-caption").text(""); // delete scrub value and year text
        d3.select("#date-caption").text("");
    }

    return chart;
}