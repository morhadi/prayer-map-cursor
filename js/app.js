// Configuration
const width = window.innerWidth;
const height = window.innerHeight;

// Globals
let worldData = null;
let contourData = null;
let currentProjectionType = "mercator";
let currentTimeUTC = new Date();

// Setup SVG
const svg = d3.select("#map-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Group for map layers
const mapGroup = svg.append("g");
// Render countries first, then prayers on top (with transparency)
const countriesLayer = mapGroup.append("g").attr("id", "countries");
const prayersLayer = mapGroup.append("g").attr("id", "prayers");

// Define Projections
const projections = {
    mercator: d3.geoMercator()
        .translate([width / 2, height / 2])
        .scale(width / 6.3),
    orthographic: d3.geoOrthographic()
        .translate([width / 2, height / 2])
        .scale(width / 3), // Initial scale
    equirectangular: d3.geoEquirectangular()
        .translate([width / 2, height / 2])
        .scale(width / 6.3)
};

let path = d3.geoPath().projection(projections[currentProjectionType]);

// UI Elements
const timeSlider = document.getElementById("time-slider");
const timeDisplay = document.getElementById("time-display");
const projectionSelect = document.getElementById("projection-select");
const calcMethodSelect = document.getElementById("calc-method");
const asrMethodSelect = document.getElementById("asr-method");

// Initialization
async function init() {
    await loadData();
    setupControls();
    updateTimeFromSlider(); // Set initial time
    updateVisualization();

    // Start loop if we want auto-play, but for now static until interaction
}

async function loadData() {
    try {
        const response = await fetch('data/world-110m.json');
        worldData = await response.json();
        renderCountries();
    } catch (error) {
        console.error("Error loading map data:", error);
    }
}

function renderCountries() {
    if (!worldData) return;
    const countries = topojson.feature(worldData, worldData.objects.countries);

    const paths = countriesLayer.selectAll("path").data(countries.features);
    paths.enter().append("path")
        .attr("class", "country")
        .merge(paths)
        .attr("d", path);
}

function setupControls() {
    // Time Slider
    timeSlider.addEventListener("input", () => {
        updateTimeFromSlider();
        updateVisualization();
    });

    // Projection
    projectionSelect.addEventListener("change", (e) => {
        currentProjectionType = e.target.value;
        updateProjection();
    });

    // Methods
    calcMethodSelect.addEventListener("change", updateVisualization);
    asrMethodSelect.addEventListener("change", updateVisualization);

    // Drag/Zoom for Orthographic (Optional, basic implementation)
    const drag = d3.drag()
        .subject(function() {
            const r = projections[currentProjectionType].rotate();
            return {x: r[0], y: -r[1]};
        })
        .on("drag", function(event) {
            if (currentProjectionType === 'orthographic') {
                const rotate = projections[currentProjectionType].rotate();
                projections[currentProjectionType].rotate([event.x, -event.y, rotate[2]]);
                refreshMap();
            }
        });

    // Add Zoom behavior
    // We only enable zoom for Mercator/Equirectangular for now to keep it simple.
    // For Orthographic, zoom usually means scaling the projection.
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(drag);
    svg.call(zoom);
}

function updateTimeFromSlider() {
    // Slider value is 0-1439 (minutes in a day)
    // We map this to the current day UTC
    const minutes = parseInt(timeSlider.value);
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    currentTimeUTC = new Date(startOfDay.getTime() + minutes * 60000);

    const hours = currentTimeUTC.getUTCHours().toString().padStart(2, '0');
    const mins = currentTimeUTC.getUTCMinutes().toString().padStart(2, '0');
    timeDisplay.textContent = `${hours}:${mins} UTC`;
}

function updateProjection() {
    path = d3.geoPath().projection(projections[currentProjectionType]);
    refreshMap();
}

function refreshMap() {
    countriesLayer.selectAll("path").attr("d", path);
    // We also need to re-project the prayer contours
    // The contours are generated in geo coordinates, so we just update the path
    prayersLayer.selectAll("path").attr("d", path);
}

// The Core Logic: Generate Prayer Zones
function updateVisualization() {
    if (!window.PrayerLogic) return;

    const calcMethod = calcMethodSelect.value;
    const asrMethod = asrMethodSelect.value;

    // Generate a grid of values
    // Resolution: Lower is faster. 0.6 degrees improves quality while remaining responsive.
    const step = 0.6;
    const values = [];
    const n = Math.ceil(360 / step); // width
    const m = Math.ceil(180 / step); // height

    // We need to construct an array of values for d3.contours
    // The grid goes from -180 to 180 lon, 90 to -90 lat (or similar)
    // d3.contours expects a flat array of size n * m

    // To map correct lat/lon:
    // x index (0 to n) -> lon (-180 to 180)
    // y index (0 to m) -> lat (90 to -90)

    for (let j = 0; j < m; j++) {
        for (let i = 0; i < n; i++) {
            const lon = -180 + (i / n) * 360 + (step/2);
            const lat = 90 - (j / m) * 180 - (step/2);

            const phase = window.PrayerLogic.getPrayerPhase(lat, lon, currentTimeUTC, calcMethod, asrMethod);
            values.push(phase);
        }
    }

    // Generate contours
    // Strategy: We use thresholds [0.5, 1.5, 2.5, 3.5, 4.5]
    // Layer 0 (Base): Isha (0) - We will paint the whole background Isha color first or handle it in the join.
    // The contour for 0.5 will contain values >= 1 (Fajr, Duha, Dhuhr, Asr, Maghrib)
    // The contour for 1.5 will contain values >= 2 (Duha, Dhuhr, Asr, Maghrib)
    // ...
    // We render them in order of threshold.

    const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5];
    const contours = d3.contours()
        .size([n, m])
        .thresholds(thresholds)
        (values);

    // Transform to GeoJSON
    const geoContours = contours.map(contour => {
        return {
            type: "Feature",
            properties: { value: contour.value }, // value is the threshold (e.g. 0.5)
            geometry: {
                type: "MultiPolygon",
                coordinates: contour.coordinates.map(polygon => {
                    return polygon.map(ring => {
                        return ring.map(point => {
                            const [x, y] = point;
                            return [
                                -180 + (x / n) * 360,
                                90 - (y / m) * 180
                            ];
                        });
                    });
                })
            }
        };
    });

    // We need to add a "base" layer for Isha (0) which is effectively the background.
    // Or we can just set a background color on the map or globe.
    // Let's create a rectangle covering the whole map for Isha, then overlay others.
    // Or better, we treat the contours as stackable layers.

    // Define the colors for the layers based on what they represent.
    // Threshold 0.5 -> Values 1,2,3,4,5. So this layer should be Color for 1 (FAJR).
    // But wait, if we paint FAJR, then paint DUHA on top (Threshold 1.5), DUHA covers FAJR where it exists.
    // This works perfectly.

    // So:
    // Background: ISHA (0)
    // Layer 0.5: FAJR (1)
    // Layer 1.5: DUHA (2)
    // Layer 2.5: DHUHR (3)
    // Layer 3.5: ASR (4)
    // Layer 4.5: MAGHRIB (5)

    // Add a background rect for ISHA if it doesn't exist
    let baseLayer = prayersLayer.select(".base-layer");
    if (baseLayer.empty()) {
        baseLayer = prayersLayer.append("path")
            .attr("class", "base-layer prayer-zone")
            .datum({type: "Sphere"}) // GeoJSON Sphere covers the globe
            .attr("fill", window.PrayerLogic.PrayerColors.ISHA);
    }
    baseLayer.attr("d", path);

    // Join data for other layers
    const paths = prayersLayer.selectAll("path.contour-layer")
        .data(geoContours);

    paths.exit().remove();

    paths.enter().append("path")
        .attr("class", "contour-layer prayer-zone")
        .merge(paths)
        .attr("d", path)
        .attr("fill", d => {
            const t = d.properties.value;
            if (t === 0.5) return window.PrayerLogic.PrayerColors.FAJR;
            if (t === 1.5) return window.PrayerLogic.PrayerColors.DUHA;
            if (t === 2.5) return window.PrayerLogic.PrayerColors.DHUHR;
            if (t === 3.5) return window.PrayerLogic.PrayerColors.ASR;
            if (t === 4.5) return window.PrayerLogic.PrayerColors.MAGHRIB;
            return "none";
        });
}

// Handle window resize
window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    svg.attr("width", w).attr("height", h);

    projections.mercator.translate([w/2, h/2]).scale(w/6.3);
    projections.orthographic.translate([w/2, h/2]);
    projections.equirectangular.translate([w/2, h/2]).scale(w/6.3);

    updateProjection();
});

init();
