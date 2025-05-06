(function () {
    let map, route, stops, mapCenter, currentStop = 1, tourLength = 0, active = false, played = [], firstLocate = true, locationMarker, circle;
    // splash screen modal variables
    let splash = document.getElementById('splash-modal'),
        splashModal = new bootstrap.Modal(splash);
    splashModal.show();

    // add listener for the about button
    document.querySelector(".about").addEventListener("click", function () {
        splashModal.show();
    });

    // modal variables for stops
    let stop = document.getElementById('stop-modal'),
        stopModal = new bootstrap.Modal(stop);

    // add listeners for closing the stop modal
    document.querySelectorAll(".close").forEach(function (elem) {
        elem.addEventListener("click", function () {
            if (elem.id == "next") {
                currentStop = currentStop + 1;
            }
            if (elem.id == "prev") {
                currentStop = currentStop - 1 < 1 ? 1 : currentStop - 1;
            }
            if (elem.id == "x") {
                currentStop = currentStop;
            }
            updateStopColor();
            updateRouteColor();
        });
    });

    function createMap() {
        resizeMap();
    
        map = L.map("map", {
            center: L.latLng(43.087, -89.420), // Updated to your actual site area
            zoom: 16,
            maxZoom: 18,
            minZoom: 12
        });
    
        const url = document.querySelector("#map").dataset.basemap;
        const attribution = document.querySelector("#map").dataset.attribution;
    
        L.tileLayer(url, {
            maxZoom: 20,
            attribution: attribution
        }).addTo(map);
    
        document.querySelector(".location-button").addEventListener("click", getLocation);
    
        // Add stop and route data
        addRoute();
        addStops();
    
        // --- Custom Icons ---
    
        // Bathroom Icon
        const bathroomIcon = L.icon({
            iconUrl: 'img/bathroom_icon.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28]
        });
    
        L.marker([43.08715524550469, -89.42004117964764], { icon: bathroomIcon })
            .addTo(map)
            .bindPopup("<strong>Male/Female Pit Toilets</strong>");
    
        L.marker([43.086493635475705, -89.43341226854596], { icon: bathroomIcon })
            .addTo(map)
            .bindPopup("<strong>Accessible Portable Toilet</strong>");
    
        // Bus Stop Icon
        const busIcon = L.icon({
            iconUrl: 'img/bus_icon.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28]
        });
    
        L.marker([43.08644720241637, -89.4337756062254], { icon: busIcon })
            .addTo(map)
            .bindPopup("<strong>Lake Mendota at Eagle Heights</strong><br>63 &nbsp;&nbsp;80 &nbsp;&nbsp;84");
        L.marker([43.08422574890911, -89.42908973662088], { icon: busIcon })
            .addTo(map)
            .bindPopup("<strong>University Bay at Picnic Point</strong><br>&nbsp;80 &nbsp;&nbsp;84");
       
        // eBike Icon
        const ebikeIcon = L.icon({
            iconUrl: 'img/ebike_icon.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28]
        });
    
        L.marker([43.08428650173397, -89.42869244644531], { icon: ebikeIcon })
            .addTo(map)
            .bindPopup("<strong>BCycle Electric Bike Stand</strong>");
        L.marker([43.086283427334756, -89.43384852944389], { icon: ebikeIcon })
            .addTo(map)
            .bindPopup("<strong>BCycle Electric Bike Stand</strong>");
    }
    
    // location services
    function getLocation() {
        map.locate({ setView: true, watch: true, enableHighAccuracy: true });

        function onLocationFound(e) {
            let radius = e.accuracy / 2;
            console.log(e.accuracy);
            if (locationMarker) {
                map.removeLayer(circle);
                map.removeLayer(locationMarker);
            }
            if (e.accuracy < 90) {
                circle = L.circle(e.latlng, { radius: radius, interactive: false }).addTo(map);
                locationMarker = L.marker(e.latlng, { interactive: false }).addTo(map);
            }
            if (e.accuracy < 40) {
                let count = 0;
                map.stopLocate();
                count++;
            }
        }

        map.on('locationfound', onLocationFound);

        window.setInterval(function () {
            map.locate({
                setView: false,
                enableHighAccuracy: true
            });
        }, 2500);
    }

    // add tour route to the map
    function addRoute() {
        fetch("assets/route.geojson")
            .then(res => res.json())
            .then(data => {
                route = L.geoJson(data, {
                    style: function (feature) {
                        return {
                            className: "route-" + feature.properties.id,
                            weight: 6
                        };
                    }
                }).addTo(map);
                updateRouteColor();
            });
    }

    function routeClass(props) {
        let elem = document.querySelector(".route-" + props.id);
        elem.classList.remove("inactive-route");

        if (Number(props.id) < currentStop)
            elem.classList.add("active-route");
        else
            elem.classList.add("inactive-route");
    }

    function updateRouteColor() {
        route.eachLayer(function (layer) {
            routeClass(layer.feature.properties);
        });
    }

    // add tour stops to map
    function addStops() {
        fetch("assets/stops.csv")
            .then(res => res.text())
            .then(data => {
                // parse csv
                data = Papa.parse(data, {
                    header: true
                }).data;

                // create geojson
                let geojson = {
                    type: "FeatureCollection",
                    name: "Sites",
                    features: []
                };

                // populate geojson
                data.forEach(function (feature, i) {
                    if (feature.hidden == "FALSE") tourLength++;
                    let obj = {};
                    obj.type = "Feature";
                    obj.geometry = {
                        type: "Point",
                        coordinates: [Number(feature.lon), Number(feature.lat)]
                    };
                    obj.properties = feature;
                    geojson.features.push(obj);
                });

                // add geojson to map
                stops = L.geoJson(geojson, {
                    pointToLayer: function (feature, latlng) {
                        let options = {
                            radius: 12,
                            className: "stop-" + feature.properties.id,
                            opacity: 1,
                            fillOpacity: 1,
                            weight: 5,
                            pane: "markerPane"
                        };
                        return L.circleMarker(latlng, options);
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function () {
                            if (feature.properties.hidden != "true") {
                                openModal(feature.properties);
                            }
                        });
                        if (feature.properties.id == 1) {
                            let coordinates = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
                            map.setView(coordinates);
                        }
                        if (feature.properties.name) {
                            let point = feature.properties.id + ". ";
                            let menuStop = document.createElement("p");
                            menuStop.innerHTML = point + feature.properties.name;
                            menuStop.className = "dropdown-item";

                            menuStop.addEventListener("click", function () {
                                currentStop = feature.properties.id;
                                openModal(feature.properties);
                            });

                            let listItem = document.createElement("li");
                            listItem.insertAdjacentElement("beforeend", menuStop);

                            document.querySelector(".dropdown-menu").insertAdjacentElement("beforeend", listItem);
                        }
                    }
                }).addTo(map);

                updateStopColor();
            });
    }

    function stopClass(props) {
        let elem = document.querySelector(".stop-" + props.id);
        elem.classList.remove("inactive-stop");

        if (Number(props.id) <= currentStop)
            elem.classList.add("active-stop");
        else
            elem.classList.add("inactive-stop");
    }

    function updateStopColor() {
        stops.eachLayer(function (layer) {
            stopClass(layer.feature.properties);
            if (layer.feature.properties.id == currentStop) {
                let latlng = new L.LatLng(layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]);
                map.flyTo(latlng);
                if (layer.feature.properties.direction) {
                    var popup = L.popup()
                        .setLatLng(latlng)
                        .setContent('<p>' + layer.feature.properties.direction + '</p>')
                        .openOn(map);
                }
            }
        });
    }

    function openModal(props) {
        currentStop = Number(props.id);

        document.querySelector("#stop-body").innerHTML = "";
        document.querySelector("#title-container").innerHTML = "";

        if (props.name) {
            let title = "<h1 class='modal-title' id='stop-title'>" + props.name + "</h1>";
            document.querySelector("#title-container").insertAdjacentHTML("beforeend", title);
        }

        if (props.image) {
            let imgHTML = `
              <div class="stop-image-frame">
                <img src="img/${props.image}" class="stop-image" alt="${props.name}">
              </div>`;
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend", imgHTML);
        }

        if (props.caption) {
            let caption = "<p id='stop-caption' class='text-center' style='font-size: 14px; color: gray; font-style: italic;'>" + props.caption + "</p>";
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend", caption);
        }

        if (props.text) {
            let text = "<p id='stop-text'>" + props.text + "</p>";
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend", text);
        }

        stopModal.show();
    }

    function resizeMap() {
        let nav = document.querySelector(".navbar").offsetHeight,
            h = document.querySelector("body").offsetHeight;
        let mapHeight = h - nav;
        document.querySelector("#map").style.top = nav + "px";
        document.querySelector("#map").style.height = mapHeight + "px";
    }

    window.addEventListener('resize', resizeMap);

    createMap();
})();
