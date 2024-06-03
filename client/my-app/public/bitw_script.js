// Import config.js
import config from "./config.js";
//Import weather.js to bitw script
import { fetchWeatherData } from "./weather.js";

// Set access token
Cesium.Ion.defaultAccessToken = config.CESIUM_API_KEY;

/*********************************
 * SETUP
 *********************************/
// Initialise viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  infoBox: false,
  selectionIndicator: false,
});

// The viewer object's camera
const cam = viewer.camera;

// Set default camera pitch
const pitchAngle = Cesium.Math.toRadians(-15.0);
const cameraOffset = new Cesium.HeadingPitchRange(0.0, pitchAngle, 300.0);
viewer.scene.screenSpaceCameraController.enableZoom = false;

const nextCityButton = document.getElementById("next-city");

var balloon;

/*********************************
 * VISUALISE BUILDINGS
 *********************************/
// Cesium's Default OSM Buildings
//const buildingTileSet = await Cesium.createOsmBuildingsAsync();
//viewer.scene.primitives.add(buildingTileSet);

// Google Map's Photorealistic 3d Tileset
try {
  const buildingTileSet = await Cesium.createGooglePhotorealistic3DTileset();
  viewer.scene.primitives.add(buildingTileSet);
} catch (error) {
  console.log(`Failed to load tileset: ${error}`);
}

/*********************************
 * WIND API
 *********************************/
//module lever variables to store wind data
let windSpeed, windDirection;

//conversion to degrees from cartesian
function cartesianToDegrees(cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const longitude = Cesium.Math.toDegrees(cartographic.longitude);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude);
  return {longitude, latitude};
}
// UoW Student Centre Coordinates
const uowscCartesian = Cesium.Cartesian3.fromDegrees(175.3177, -37.78765, 300.0);

// Index iterator
var currentCityIndex = 0;
// Array of cities
let citiesArray = [
  { cityName: "Auckland", coordinates: Cesium.Cartesian3.fromDegrees(174.763336, -36.848461, 300.0)},
  { cityName: "Rome", coordinates: Cesium.Cartesian3.fromDegrees(12.496366, 41.902782, 300.0)},
  { cityName: "Paris", coordinates: Cesium.Cartesian3.fromDegrees(2.349014, 48.864716, 300.0)},
  { cityName: "Tokyo", coordinates: Cesium.Cartesian3.fromDegrees(139.817413, 35.672855, 300.0)},
  { cityName: "Dubai", coordinates: Cesium.Cartesian3.fromDegrees(55.296249, 25.276987, 300.0)},
  { cityName: "Hamilton", coordinates: Cesium.Cartesian3.fromDegrees(175.269363, -37.781528, 300.0)},
  { cityName: "Toronto", coordinates: Cesium.Cartesian3.fromDegrees(-79.384293, 43.653908, 300.0)},
  { cityName: "Sydney", coordinates: Cesium.Cartesian3.fromDegrees(151.209900, -33.865143, 300.0)},
  { cityName: "San Francisco", coordinates: Cesium.Cartesian3.fromDegrees(-122.431297, 37.773972, 300.0)},
  { cityName: "New York", coordinates: Cesium.Cartesian3.fromDegrees(-75.000000, 43.000000, 300.0)},
  { cityName: "Seoul", coordinates: Cesium.Cartesian3.fromDegrees(127.024612, 37.532600, 300.0)},
  { cityName: "New Delhi", coordinates: Cesium.Cartesian3.fromDegrees(77.216721, 28.644800, 300.0)},
  { cityName: "Barcelona", coordinates: Cesium.Cartesian3.fromDegrees(2.154007, 41.390205, 300.0)},
  { cityName: "Athens", coordinates: Cesium.Cartesian3.fromDegrees(23.727539, 37.983810, 300.0)},
  { cityName: "Budapest", coordinates: Cesium.Cartesian3.fromDegrees(19.040236, 47.497913, 300.0)},
  { cityName: "Moscow", coordinates: Cesium.Cartesian3.fromDegrees(37.618423, 55.751244, 300.0)},
  //{ cityName: "Mexico City", coordinates: Cesium.Cartesian3.fromDegrees(-99.133209, 19.432608, 300.0)},
  //{ cityName: "Sao Paulo", coordinates: Cesium.Cartesian3.fromDegrees(-46.636111, -23.547573, 300.0)},
  { cityName: "Cairo", coordinates: Cesium.Cartesian3.fromDegrees(31.233334, 30.033333, 300.0)},
  { cityName: "Copenhagen", coordinates: Cesium.Cartesian3.fromDegrees(12.568337, 55.676098, 300.0)},
  { cityName: "London", coordinates: Cesium.Cartesian3.fromDegrees(-0.118092, 51.509865, 300.0)},
] 

// Array of a random point around different cities
let randomPointsArray = [];

// Randomise array sequence
function shuffleArray(array){
  let currentIndex = array.length;
  while(currentIndex != 0){
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

// Generate a random point on all cities in the cities array
// This function also randomises the city sequence
function generateRandomPoints(){
  shuffleArray(citiesArray)
  for(let i = 0; i < citiesArray.length; i++){
    let shuffledName = citiesArray[i].cityName;
    let randomPoint = null;

    while(randomPoint == null){
      randomPoint = getNearbyLocation(citiesArray[i].coordinates);
    }

    let randomPointObj = {cityName: shuffledName, coordinates: randomPoint}
    randomPointsArray.push(randomPointObj);

    viewer.entities.add({
      position: citiesArray[i].coordinates,
      name: citiesArray[i].cityName,
      point: { pixelSize: 15, color: Cesium.Color.BLUE }
    });
  }
  for(let i = 0; i < randomPointsArray.length; i++){
    viewer.entities.add({
      position: randomPointsArray[i].coordinates,
      name: randomPointsArray[i].cityName,
      point: { pixelSize: 15, color: Cesium.Color.GREEN }
    });
  }
}

// Call randomise function
generateRandomPoints();
console.log(citiesArray);
console.log(randomPointsArray);

//gets the wind data and stores it to the module level variables 
async function fetchAndStoreWind(latitude, longitude){
  const weatherWind=  await fetchWeatherData(latitude, longitude);
  windDirection = weatherWind.windDirection;
  windSpeed = weatherWind.windSpeed;
}

/*********************************
 * PATHING
 *********************************/
// One minute
const minute = 60;
// Storage for last point on map where wind data was obtained from
// TODO: Make container of last point for each entity
//var lastPointOnMap;

/* INITIAL VALUES ON LOAD */
// Set initial position at startTime
//lastPointOnMap = uowscCartesian;
// Set startTime to current time
let startTime = viewer.clock.currentTime;
// Initialise nextTimeStep
let nextTimeStep = startTime;
// Set clock settings
viewer.clock.startTime = startTime.clone();
viewer.clock.currentTime = startTime.clone();
//viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
// Start animating at x1 speed
viewer.clock.multiplier = 1;
//viewer.clock.shouldAnimate = true;

/* CREATE PATH */
// Create the path for the target object
async function createPath(targetObject, startPos, numOfPoints, timeToNextPoint) {
  // Storage for last point on map where wind data was obtained from
  var lastPointOnMap = startPos;
  // Calculate timeStep
  let timeStep = minute * timeToNextPoint;
  // Set new stopping point
  let stop = Cesium.JulianDate.addSeconds(startTime, timeStep * numOfPoints, new Cesium.JulianDate());
  // Update viewer's clock to extend animations
  viewer.clock.stopTime = stop.clone();

  // Create SampledPositionProperty (this is a container for the list of points on the map)
  const positionProperty = new Cesium.SampledPositionProperty();

  // Add the last point on the map to the list of points
  positionProperty.addSample(startTime, lastPointOnMap); // We might need to remove this eventually as this might bug out if 2 points are on the exact same coordinates

  // Plot points on the map
  for (let i = 0; i < numPoints; i++) {  
    // Calculate timestep
    const time = Cesium.JulianDate.addSeconds(nextTimeStep, timeStepInSeconds, new Cesium.JulianDate());
    // Get wind data from last point to get the next point to plot
    const thisPoint = await getNextPoint(lastPointOnMap);
    // Change lastPoint to this current one
    lastPointOnMap = thisPoint;
    // Add to the path
    positionProperty.addSample(time, thisPoint);

    // Increment time
    nextTimeStep = time;
    
    // Format date and time for easier reading
    const newDate = Cesium.JulianDate.toGregorianDate(time, new Cesium.GregorianDate());
    const text = "pos" + (i+1) + " -- " + newDate.year + "/" + newDate.month + "/" + newDate.day + " | "
               + newDate.hour + ":" + newDate.minute + ":" + newDate.second;

    // Create entity based on sample position
    viewer.entities.add({
      position: thisPoint,
      name: text,
      point: { pixelSize: 15, color: Cesium.Color.RED }
    });
  }

  // Set targetObject availability
  targetObject.availability = new Cesium.TimeIntervalCollection([
                                new Cesium.TimeInterval({
                                  start: viewer.clock.currentTime,
                                  stop: stop
                                }),
                              ]);
  // Set targetObject path
  targetObject.position = positionProperty;
  // Orient targetObject towards movement
  targetObject.orientation = new Cesium.VelocityOrientationProperty(positionProperty);
  // Change interpolation mode to make path more curved
  targetObject.position.setInterpolationOptions({
    interpolationDegree: 5,
    interpolationAlgorithm:
      Cesium.LagrangePolynomialApproximation,
  });

  return positionProperty;
}

/* GET NEXT POINT */
// Get next point using wind data
async function getNextPoint(originPoint) {
  // Wait for wind data
  let originDegrees = cartesianToDegrees(originPoint);
  
  await fetchAndStoreWind(originDegrees.latitude, originDegrees.longitude);
  // Convert wind direction to radians
  let windDirRad = Cesium.Math.toRadians(windDirection);
  // Calculate magnitude (distance)
  let magnitude = windSpeed * timeStepInSeconds; // m/min
  // Calculate x and y coordinates
  let nextX = originPoint.x + Math.cos(windDirRad) * magnitude;
  let nextY = originPoint.y + Math.sin(windDirRad) * magnitude;
  // Make cartesian point on Cesium Map
  let nextPointCartesian = new Cesium.Cartesian3(nextX, nextY, originPoint.z);
  // Convert into cartographic
  let nextPointCartographic = Cesium.Cartographic.fromCartesian(nextPointCartesian);
  // Convert longitude and latitude to degrees
  let longitude = Cesium.Math.toDegrees(nextPointCartographic.longitude);
  let latitude = Cesium.Math.toDegrees(nextPointCartographic.latitude);
  // Create nextPoint
  let nextPoint = Cesium.Cartesian3.fromDegrees(longitude, latitude, 300.0); // Note: Hard-coded altitude

  console.log("==============================================================");
  console.log("Wind Speed: " + windSpeed);
  console.log("Wind Direction(Degrees): " + windDirection);
  console.log("Magnitude: " + magnitude);
  console.log("Next point coords: (" + longitude + ", " + latitude + ")");
  console.log("==============================================================");

  return nextPoint;
}

// Teleport to next location
function nextCity() {
  // Reset position
  startTime = viewer.clock.currentTime;
  // Initialise nextTimeStep
  nextTimeStep = startTime;
  // Set clock settings
  viewer.clock.startTime = startTime.clone();
  viewer.clock.currentTime = startTime.clone();

  // Create wind path for next city in the list. Spawn balloon on that location.
  createPath(balloon, randomPointsArray[currentCityIndex].coordinates, numPoints, timeStepInSeconds);
  console.log(randomPointsArray[currentCityIndex].cityName);

  // Increment city index
  currentCityIndex++;
  // Loop back if reached last city
  if (currentCityIndex >= citiesArray.length) {
    currentCityIndex = 0;
  }
}

// Finds a location near a city's centre coordinate
function getNearbyLocation(cityCartesianPoint){
  const EARTH_R = 6371 * Math.pow(10, 3);
  const MAX_R = 10000; // 10000m 

  let cityCartographicPoint = Cesium.Cartographic.fromCartesian(cityCartesianPoint);
  let city_lon_deg = Cesium.Math.toDegrees(cityCartographicPoint.longitude);
  let city_lat_deg = Cesium.Math.toDegrees(cityCartographicPoint.latitude);

  let lonOffset = Math.floor(Math.random() - 0.5) * 0.03;
  let latOffset = Math.floor(Math.random() - 0.5) * 0.03;

  let ran_lon_deg = city_lon_deg + lonOffset;
  let ran_lat_deg = city_lat_deg + latOffset;

  let lat1 = city_lat_deg * (Math.PI / 180);
  let lat2 = ran_lat_deg * (Math.PI / 180);
  let lon1 = city_lon_deg;
  let lon2 = ran_lon_deg;

  let changeLat = (lat2 - lat1) * Math.PI / 180;
  let changeLon = (lon2 - lon1) * Math.PI / 180;

  let a = Math.sin(changeLat / 2) * Math.sin(changeLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(changeLon / 2) * Math.sin(changeLon / 2); 
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let distance = EARTH_R * c;

  console.log(distance);
  if (distance < MAX_R && distance > 0){
    return Cesium.Cartesian3.fromDegrees(ran_lon_deg, ran_lat_deg, 300);
  } else {
    return null;
  }
}

/*********************************
 * ENTITIES
 *********************************/
// Create entity
balloon = viewer.entities.add({
  name: "The hot air balloon",
  // Move entity via simulation time
  availability: new Cesium.TimeIntervalCollection([
    new Cesium.TimeInterval({
      start: startTime,
      stop: startTime
    }),
  ]),
  // Use path created by the function
  position: randomPointsArray[currentCityIndex].coordinates, 
  // Placeholder entity visuals
  ellipsoid: {
    radii: new Cesium.Cartesian3(52.0, 52.0, 52.0),
    material: Cesium.Color.RED.withAlpha(0),
  },
  // Show path of hot air balloon
  path: {
    resolution: 1,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.1,
      color: Cesium.Color.YELLOW,
    }),
    width: 10,
  },
});

//Set up chase camera
var matrix3Scratch = new Cesium.Matrix3();
var positionScratch = new Cesium.Cartesian3();
var orientationScratch = new Cesium.Quaternion();
var scratch = new Cesium.Matrix4();

function getModelMatrix(balloon, time, result) {
  var position = Cesium.Property.getValueOrUndefined(balloon.position, time, positionScratch);
  if (!Cesium.defined(position)) {
    return undefined;
  }
  var orientation = Cesium.Property.getValueOrUndefined(balloon.orientation, time, orientationScratch);
  if (!Cesium.defined(orientation)) {
    result = Cesium.Transforms.eastNorthUpToFixedFrame(position, undefined, result);
  } else {
    result = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromQuaternion(orientation, matrix3Scratch), position, result);
  }
  return result;
}

// How many points to put on the map
let numPoints = 5;
// Set up clock
// Time it takes to go to destination
let timeStepInSeconds = minute * 30;
// DEBUG SAMPLE CODE (Change the long and lat values. Only change the thousands decimal if you want it close to UoW)
// DEBUG NOTE: use yourPosition as your entity's starting location and use for the 2nd arg in createPath
//var yourPosition = Cesium.Cartesian3.fromDegrees(175.3172, -37.78795, 100.0);

// Generate path for the balloon
nextCity();
//createPath(balloon, citiesArray[0].coordinates, numPoints, timeStepInSeconds);

// Fly to entity (Viewer)
// viewer.flyTo(balloon, {
//   offset: cameraOffset,
// });

// Quick camera focus to target entity
viewer.zoomTo(balloon, cameraOffset);

nextCityButton.addEventListener('click', nextCity);

/*********************************
 * TOOLBAR
 *********************************/


/*********************************
 * RUNTIME CODE
 *********************************/
// Tick function
viewer.clock.onTick.addEventListener(function(clock) {
  // If clock is playing
  if(clock.shouldAnimate) {
    // Change camera angle to 3rd person view (chase cam, no camera controls)
    //getModelMatrix(balloon, viewer.clock.currentTime, scratch);
    //cam.lookAtTransform(scratch, new Cesium.Cartesian3(-250, 0, 70));

    // Track balloon (with camera controls)
    viewer.trackedEntity = balloon;
  }
});

// On Pause/Play event
Cesium.knockout.getObservable(viewer.animation.viewModel.clockViewModel, 
                              'shouldAnimate').subscribe(function(value) {
  // If paused
  if (!value) {
    // Revert camera back to normal
    viewer.zoomTo(balloon, cameraOffset);
  }
});
