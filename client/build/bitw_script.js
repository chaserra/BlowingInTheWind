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

//viewer.scene.debugShowFramesPerSecond = true;

/*********************************
 * VISUALISE BUILDINGS
 *********************************/
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

var city;

// Index iterator
var currentCityIndex = 0;

// Array of a random point around different cities
let randomPointsArray = [];

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
function generateRandomPoints(newCity){
  let randomPoint = null;
  while(randomPoint == null){
    randomPoint = getNearbyLocation(newCity.coordinates);
  }

  let randomPointObj = {cityName: newCity.cityName, coordinates: randomPoint}
  randomPointsArray.push(randomPointObj);

  viewer.entities.add({
    position: newCity.coordinates,
    name: newCity.cityName,
    point: { pixelSize: 15, color: Cesium.Color.BLUE }
  });

  for(let i = 0; i < randomPointsArray.length; i++){
    viewer.entities.add({
      position: randomPointsArray[i].coordinates,
      name: randomPointsArray[i].cityName,
      point: { pixelSize: 15, color: Cesium.Color.GREEN }
    });
  }
}


// Call randomise function
//generateRandomPoints();

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
/* INITIAL VALUES ON LOAD */
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
async function nextCity(next) {
  // Get random points using city data
  await generateRandomPoints(next);
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
  if (currentCityIndex > randomPointsArray.length) {
    currentCityIndex = 0;
  }

  viewer.trackedEntity = balloon;
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
  position: Cesium.Cartesian3.fromDegrees(175.3177, -37.78765, 300.0),
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

// Quick camera focus to target entity
viewer.zoomTo(balloon, cameraOffset);
// Or set tracked entity for instant zoom
// viewer.trackedEntity = balloon;

// Generate path for the balloon
//nextCityButton.addEventListener('click', nextCity);

/*********************************
 * TIMER
 *********************************/
let minutesText = document.getElementById("minutes");
let secondsText = document.getElementById("seconds");

function startTimer(duration) {
  var timer = duration, minutes, seconds;

  setInterval(function () {
    // Calculate time to display
    minutes = parseInt(timer / 60, 10);
    seconds = parseInt(timer % 60, 10);

    // Add 0 if less than 10
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    // Display on span
    minutesText.innerText = minutes;
    secondsText.innerText = seconds;

    // Change colour to red if timer has 10 seconds left
    if(timer <= 10) {
      minutesText.style.color = '#ff0000';
      secondsText.style.color = '#ff0000';
    } else {
      minutesText.style.color = '#ffffff';
      secondsText.style.color = '#ffffff';
    }

    // When timer ends
    if (--timer < 0) {
      // Reset duration
      timer = duration;
      // Call nextCity
      //nextCity();
    }
  }, 1000);
}

// Start 2 minute timer
//startTimer(60 * 1);

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

const socket = io("http://localhost:3001");

window.joinRoom = function(room){
  socket.emit("join_room", room);
}

socket.on("city_data", (data) => {
  
  var newCoords = Cesium.Cartesian3.fromDegrees(data.coordinates[0], data.coordinates[1], data.coordinates[2]);
  let temp = { cityName: data.city, coordinates: newCoords };
  city = temp;
  console.log(city.cityName);
  nextCity(city);

});
