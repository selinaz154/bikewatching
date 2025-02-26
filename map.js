 // Set your Mapbox access token here
 
 mapboxgl.accessToken = 'pk.eyJ1Ijoic2VsaW5hejE1NCIsImEiOiJjbTdjdGd3M28wNXhrMnJvYzNwZjlxbWZpIn0.RVdE8Higg92tSd5w7Xwh-g'; 


  const svg = d3.select('#map').select('svg');
  // let stations = [];

  const map = new mapboxgl.Map({
      container: 'map', // ID of the div where the map will render
      style: 'mapbox://styles/mapbox/navigation-day-v1', // Map style
      //mapbox://styles/jin010/cm7edj53c009n01r61vmhh4dr      my style
      //mapbox://styles/mapbox/navigation-day-v1
      center: [-71.09415, 42.36027], // [longitude, latitude]
      zoom: 12, // Initial zoom level
      minZoom: 5, // Minimum allowed zoom
      maxZoom: 18 // Maximum allowed zoom
  });
  
  //Lab7 step2.1
  map.on('load', async () =>{
      //2.1-2.2
      map.addSource('boston_route', {
          type: 'geojson',
          data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
        });
  
      map.addLayer({
          id: 'bike-lanes',
          type: 'line',
          source: 'boston_route',
          paint: {
            'line-color': 'purple',
            'line-width': 3,
            'line-opacity': 0.4
          }
        });   
        
      //2.3
      map.addSource('cambridge_route', {
          type: 'geojson',
          data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
      })
      //2.3
      map.addLayer({
          id: 'walk-lanes', //need new unique name
          type: 'line',
          source: 'cambridge_route', //different source
          paint: {
            'line-color': 'red',
            'line-width': 5,
            'line-opacity': 0.4
          }
        });  
  
      //3.1
      const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json"
      let jsonData = await d3.json(jsonurl);
      let stations = jsonData.data.stations;
  
      // const circles = svg.selectAll('circle')
      //   .data(stations)
      //   .enter()
      //   .append('circle')
      //   .attr('r', 5) // Radius of the circle
      //   .attr('fill', 'steelblue')  // Circle fill color
      //   .attr('stroke', 'white')    // Circle border color
      //   .attr('stroke-width', 1)    // Circle border thickness
      //   .attr('opacity', 0.8)     // Circle opacity
  
      //         // Function to update circle positions when the map moves/zooms
      // function updatePositions() {
      //     circles
      //       .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
      //       .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
      // }
  
      //   // Initial position update when map loads
      // updatePositions();
  
      // // Reposition markers on map interactions
      // map.on('move', updatePositions);     // Update during map movement
      // map.on('zoom', updatePositions);     // Update during zooming
      // map.on('resize', updatePositions);   // Update on window resize
      // map.on('moveend', updatePositions);  // Final adjustment after movement ends
  
      const csvurl = "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv"
      let trips = await d3.csv(csvurl);

      //step 5.3
      let filteredTrips = [];
      let filteredArrivals = new Map();
      let filteredDepartures = new Map();
      let filteredStations = [];
      for (let trip of trips){
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
      }
      // console.log(trips);
      function minutesSinceMidnight(date) {
        return date.getHours() * 60 + date.getMinutes(); // Correct usage of `date` object
      }

      function filterTripsbyTime() {
        // Filter trips based on the selected time filter
        filteredTrips = timeFilter === -1
          ? trips
          : trips.filter((trip) => {
              const startedMinutes = minutesSinceMidnight(trip.started_at);
              const endedMinutes = minutesSinceMidnight(trip.ended_at);
              return (
                Math.abs(startedMinutes - timeFilter) <= 60 ||
                Math.abs(endedMinutes - timeFilter) <= 60
              );
            });
      
        // Step 3: Update filteredArrivals and filteredDepartures using `filteredTrips`
        filteredArrivals = d3.rollup(
          filteredTrips,
          (v) => v.length,   // Count the number of trips for each end_station_id
          (d) => d.end_station_id
        );
      
        filteredDepartures = d3.rollup(
          filteredTrips,
          (v) => v.length,   // Count the number of trips for each start_station_id
          (d) => d.start_station_id
        );
      
        // Step 4: Create updated station data based on filtered trips
        filteredStations = stations.map((station) => {
          // Clone the station object to avoid direct mutation
          station = { ...station };
      
          // Get the updated arrival and departure counts from the filtered data
          station.arrivals = filteredArrivals.get(station.short_name) ?? 0;
          station.departures = filteredDepartures.get(station.short_name) ?? 0;
      
          // Calculate the total traffic based on arrivals and departures
          station.totalTraffic = station.arrivals + station.departures;
      
          return station;  // Return the updated cloned station
        });
      
        // Step 5: Update map or visualization with new station data
        updateStationCircles(filteredStations);
      }
      

  
      function updateStationCircles(stations) {
        const radiusScale = d3.scaleSqrt()
          .domain([0, d3.max(stations, (d) => d.totalTraffic)])
          .range([0, 25]);
      
      let stationFlow = d3.scaleQuantize().domain([0,1]).range([0,0.5,1]);
        // Select and update circles with filtered data
        const circles = svg.selectAll('circle')
          .data(stations, (d) => d.short_name); // Use short_name as the key to track circles
      
        // Append new circles for any new data, if needed
        circles.enter()
          .append('circle')
          .attr('r', 5) // Radius of the circle
          .attr('fill', 'steelblue')  // Circle fill color
          .attr('stroke', 'white')    // Circle border color
          .attr('stroke-width', 1)    // Circle border thickness
          .attr('opacity', 0.8)      // Circle opacity
          .each(function(d) {
            d3.select(this)
              .append('title')
              .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
          });
      
        // Update existing circles
        circles
          .attr('r', (d) => radiusScale(d.totalTraffic))  // Update radius based on total traffic
          .style("--departure-ratio", d => stationFlow(d.departures / d.totalTraffic)) 
          .each(function(d) {
            d3.select(this)
              .select('title')
              .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
          });
      
        // Remove circles for any stations that are no longer in the filtered data
        circles.exit().remove();
      
        // Function to update circle positions when the map moves/zooms
        function updatePositions() {
          circles
            .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
            .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
        }
      
        // Initial position update when map loads
        updatePositions();
      
        // Reposition markers on map interactions
        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends
      }

            //lab7 step 5.2
      let timeFilter = -1;
      const timeSlider = document.getElementById('time-slider');
      const selectedTime = document.getElementById('selected-time');
      const anyTimeLabel = document.getElementById('any-time');

      function formatTime(minutes) {
        const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
        return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
      }

      function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value);  // Get slider value

        if (timeFilter === -1) {
          selectedTime.textContent = '';  // Clear time display
          anyTimeLabel.style.display = 'block';  // Show "(any time)"
        } else {
          selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
          anyTimeLabel.style.display = 'none';  // Hide "(any time)"
        }
        // Trigger filtering logic which will be implemented in the next step
      }
      timeSlider.addEventListener('input', () => {
        updateTimeDisplay();  // Update the displayed time based on slider value
        filterTripsbyTime();  // Filter trips based on time and update the station data
      });
      
    });

  
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point);  // Project to pixel coordinates
  return { cx: x, cy: y };  // Return as object for use in SVG attributes
}