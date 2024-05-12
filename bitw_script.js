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

// Visualise buildings
const buildingTileSet = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileSet);

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
const uowscCartesian = Cesium.Cartesian3.fromDegrees(175.3177, -37.78765, 100.0);
const uowscDegrees = cartesianToDegrees(uowscCartesian);

let citiesArray = [
  { cityName: "Auckland", coordinates: Cesium.Cartesian3.fromDegrees(174.763336, -36.848461, 100.0)},
  { cityName: "Rome", coordinates: Cesium.Cartesian3.fromDegrees(12.496366, 41.902782, 100.0)},
  { cityName: "Paris", coordinates: Cesium.Cartesian3.fromDegrees(48.864716, 2.349014, 100.0)},
  { cityName: "Tokyo", coordinates: Cesium.Cartesian3.fromDegrees(139.817413, 35.672855, 100.0)},
  { cityName: "Dubai", coordinates: Cesium.Cartesian3.fromDegrees(55.296249, 25.276987, 100.0)},
] 
let randomPointsArray = [];

function shuffleArray(array){
  let currentIndex = array.length;
  while(currentIndex != 0){
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

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
// Start animating at x10 speed
viewer.clock.multiplier = 10;
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

  // TODO: Create random start points. Current is set at UOW SC
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
  // TODO: Change uowscDegrees into current position iteration's latitude and longitude
  await fetchAndStoreWind(originDegrees.latitude, originDegrees.longitude);
  // Convert wind direction to radians
  let windDirRad = Cesium.Math.toRadians(windDirection);
  // Calculate magnitude (distance)
  let magnitude = windSpeed * timeStepInSeconds; // m/min
  // Calculate x and y coordinates
  // TODO: Change uowscCartesian to current position iteration's x and y
  let nextX = originPoint.x + Math.cos(windDirRad) * magnitude;
  let nextY = originPoint.y + Math.sin(windDirRad) * magnitude;
  // Make cartesian point on Cesium Map
  // TODO: Change uowscCartesian to current position iteration's z
  let nextPointCartesian = new Cesium.Cartesian3(nextX, nextY, originPoint.z);
  // Convert into cartographic
  let nextPointCartographic = Cesium.Cartographic.fromCartesian(nextPointCartesian);
  // Convert longitude and latitude to degrees
  let longitude = Cesium.Math.toDegrees(nextPointCartographic.longitude);
  let latitude = Cesium.Math.toDegrees(nextPointCartographic.latitude);
  // Create nextPoint
  let nextPoint = Cesium.Cartesian3.fromDegrees(longitude, latitude, 1000); // Note: Hard-coded altitude

  console.log("==============================================================");
  console.log("Wind Speed: " + windSpeed);
  console.log("Wind Direction(Degrees): " + windDirection);
  console.log("Magnitude: " + magnitude);
  console.log("Next point coords: (" + longitude + ", " + latitude + ")");
  console.log("==============================================================");

  return nextPoint;
}

function getNearbyLocation(cityCartesianPoint){
  const EARTH_R = 6371 * Math.pow(10, 3);
  const MAX_R = 3000; // 3000m 

  let cityCartographicPoint = Cesium.Cartographic.fromCartesian(cityCartesianPoint);
  let city_lon_deg = Cesium.Math.toDegrees(cityCartographicPoint.longitude);
  let city_lat_deg = Cesium.Math.toDegrees(cityCartographicPoint.latitude);

  let lonOffset = Math.floor(Math.random() - 0.5) * 0.02;
  let latOffset = Math.floor(Math.random() - 0.5) * 0.02;

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
    return Cesium.Cartesian3.fromDegrees(ran_lon_deg, ran_lat_deg, 1000);
  } else {
    return null;
  }
}

getNearbyLocation(uowscCartesian);

/*********************************
 * ENTITIES
 *********************************/
// Create entity
const balloon = viewer.entities.add({
  name: "The hot air balloon",
  // Move entity via simulation time
  availability: new Cesium.TimeIntervalCollection([
    new Cesium.TimeInterval({
      start: startTime,
      stop: startTime
    }),
  ]),
  // Use path created by the function
  position: uowscCartesian, // Change this to random position on map
  // Placeholder entity visuals
  ellipsoid: {
    radii: new Cesium.Cartesian3(12.0, 12.0, 12.0),
    material: Cesium.Color.RED.withAlpha(0.5),
    outline: true,
    outlineColor: Cesium.Color.BLACK,
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
createPath(balloon, uowscCartesian, numPoints, timeStepInSeconds);

// Fly to entity (Viewer)
// viewer.flyTo(balloon, {
//   offset: cameraOffset,
// });

// Quick camera focus to target entity
viewer.zoomTo(balloon, cameraOffset);

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