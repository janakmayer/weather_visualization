function SmallMultiples() {

    var margin = {top: 30, right: 40, bottom: 40, left: 50},
        width = 1000 - margin.left - margin.right,
        height = 100;

    var monthNameFormat = d3.time.format('%B');
    var datePrintFormat = d3.time.format('%B %d');

    var circle, caption, datetext, chartdata;

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
            yScale.domain([0, Math.ceil(d3.max(data, function (d) { return d.cumprcp; }))]);

            var div = d3.select(this)
                .selectAll(".chart")
                .data([nested]);

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
                    "transform": "translate(" + xScale.range()[1] / 24 + "," + 110 + ")"
                })
                .call(xAxis);

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
                .text("Precipitation (in)");

            var sm = g.selectAll(".smallMultiples");

            sm  .data(xScale.ticks())
                .enter()
                .append("line")
                .attr({
                    "class": "vertGrid",
                    "x1": function (d) { return xScale(d) },
                    "x2": function (d) { return xScale(d) },
                    "y1": 0,
                    "y2": height
                });

            sm  .data(xScale.ticks())
                .enter()
                .append("g")
                .each(function (d, i) {

                    var x_origin = xScale(d);
                    var x_extent = x_origin + tickWidthToPixels(xScale, d, i);

                    var sm_xScale = d3.time.scale()
                        .domain(d3.extent(nested[i].values, function (d) { return d.date; }))
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

                    var sm_chart = d3.select(this);

                    sm_chart.append("path")
                        .datum(nested[i].values)
                        .attr("class", "precip_area")
                        .attr("d", area);

                    sm_chart.append("path")
                        .datum(nested[i].values)
                        .attr("class", "precip_mean")
                        .attr("d", mean_precip_line);

                    sm_chart.append("path")
                        .datum(nested[i].values)
                        .attr("class", "precip_line")
                        .attr("d", cum_precip_line);

                    circle = sm_chart.append("circle")  // the circle for the scrub value
                        .attr("r", 2.2)
                        .attr("class", "scrubcircleSM")
                        .attr("opacity", 0) // invisible until mouseover
                        .style("pointer-events", "none");

                    caption = sm_chart.append("text")  // the scrub text for the value - blank at this point
                        .attr("class", "caption")
                        .attr("text-anchor", "middle")
                        .style("pointer-events", "none")
                        .attr("dy", -8);

                    datetext = sm_chart.append("text")  // the scrub text for the date - blank at this point
                        .attr("class", "caption")
                        .attr("text-anchor", "middle")
                        .style("pointer-events", "none")
                        .attr("transform", "translate(0," + - margin.top/2 + ")")
                        .attr("dy", 0);
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
        circle.attr("opacity", 1.0);  // make the scrub circle visible
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
        circle.attr("cx", x)
            .attr("cy", y);

        caption.attr("x", x)
            .attr("y", y)
            .text(Math.round(cumPrecip*10)/10 + " in");

        datetext.attr("x", x)
            .text(formattedDate);
    }

    function mouseout() {
        circle.attr("opacity", 0);  // make the scrub circle invisible again
        caption.text(""); // delete scrub value and year text
        datetext.text("");
    }

    return chart;
}