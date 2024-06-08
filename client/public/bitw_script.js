/////////////  PUBLIC //////////////

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
    //point: { pixelSize: 15, color: Cesium.Color.BLUE }
  });

  for(let i = 0; i < randomPointsArray.length; i++){
    viewer.entities.add({
      position: randomPointsArray[i].coordinates,
      name: randomPointsArray[i].cityName,
      //point: { pixelSize: 15, color: Cesium.Color.GREEN }
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

  // Array to store path positions
  let positionArray = [];
  // Track the last time generatePath that was called
  let lastGeneratePathTime = viewer.clock.currentTime;
  let pathEntityInterval = 100;
  let pathSpeed = 0.1;
  let pathEntitiesRemoved = 0;
  let epsilon = 0.00005;   // tolerance value

/* CREATE PATH */
// Create the path for the target object
async function createPath(targetObject, startPos, numOfPoints, timeToNextPoint) {
  //Reset array
  positionArray = [];
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
    //add position to array
    //positionArray.push(thisPoint);
    positionArray[i] = thisPoint;
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
      //point: { pixelSize: 15, color: Cesium.Color.RED }
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

/* Create animated path*/
  // Generate animated path
  async function animatePath(pEntity) {
    // Create SampledPositionProperty
    //console.log("LOG 1 (animatePath):", new Date().toISOString());
    const positionProperty = new Cesium.SampledPositionProperty();
    
    // Plot points on the map
    let pEntityStartTime = viewer.clock.currentTime;
    //positionProperty.addSample(pEntityStartTime, startPos); 
    
    //add first position
    positionProperty.addSample(pEntityStartTime, randomPointsArray[currentCityIndex - 1].coordinates);
    //console.log("Path Point One: " + randomPointsArray[currentCityIndex].coordinates)
    nextTimeStep = pEntityStartTime;
    
    for(let i = 0; i < positionArray.length; i++) {
      const time = Cesium.JulianDate.addSeconds(nextTimeStep, timeStepInSeconds * pathSpeed, new Cesium.JulianDate());
      var thisPoint = positionArray[i];

      //console.log("Entity position" + i + ": ");
      //console.log(thisPoint);

      positionProperty.addSample(time, thisPoint);
      //console.log("Path Point: " + thisPoint);
      nextTimeStep = time;
      // display position
      
      // viewer.entities.add({
      //   position: thisPoint,
      //   //name: text,
      //   point: { pixelSize: 10, color: Cesium.Color.GREEN }
      // });
    }
    //console.log("LOG 2 (animatePath):", new Date().toISOString());

    pEntity.position = positionProperty;
    // Orient balloon towards movement
    pEntity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);
    // Change interpolation mode to make path more curved
    pEntity.position.setInterpolationOptions({
      interpolationDegree: 5,
      interpolationAlgorithm:
        Cesium.LagrangePolynomialApproximation,
    });

    //console.log("LOG 3 (animatePath):", new Date().toISOString());

    //let lastPositionCheckTime = Cesium.JulianDate.now();

    viewer.clock.onTick.addEventListener(function() {
      if (viewer.clock.shouldAnimate) {
        //console.log("LOG 4 (animatePath):", new Date().toISOString());
        const currentTime = viewer.clock.currentTime;
        //const elapsedTime = Cesium.JulianDate.secondsDifference(currentTime, lastPositionCheckTime);
        
        //if (elapsedTime >= 10) {
          //let positionAtTime = positionProperty.getValue(viewer.clock.currentTime);
        if(positionProperty.getValue(viewer.clock.currentTime) !== undefined) {
          //console.log("LOG 7 (animatePath):", new Date().toISOString());
          
          // let positionAtTime = roundPosition(positionProperty.getValue(viewer.clock.currentTime));
          // let finalPosition = roundPosition(positionArray[positionArray.length - 1]);

          let positionAtTime = positionProperty.getValue(viewer.clock.currentTime);
          let finalPosition = positionArray[positionArray.length - 1];

          //console.log("Position at time: " + positionAtTime);
          //console.log("Final position: " + finalPosition);

          //console.log("LOG 5: POSITON AT GIVEN TIME: " + positionAtTime + " at " + new Date().toISOString());
          
          //console.log("Position at given time: " + positionAtTime);
          //console.log("Final Position: " + finalPosition);
          
          
          if (Cesium.Cartesian3.equalsEpsilon(positionAtTime, finalPosition, epsilon)) {
            viewer.entities.remove(pEntity);
            pathEntitiesRemoved++;
            //console.log("Removed: " + pathEntitiesRemoved);
          }
          else{
            //console.log("Positions not equal");
          }

          //lastPositionCheckTime = currentTime;     
        }
        //}
      }
    });

    //console.log("LOG 6 (animatePath):", new Date().toISOString());

    // console.log("Sampled position: ");
    // console.log(positionProperty);
    
    //console.log("NUMBER OF ACTIVE ENTITIES: " + countActiveEntities());
    //console.log("ENTITY POSITIONS: ");
    //console.log(positionProperty);
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

  // console.log("==============================================================");
  // console.log("Wind Speed: " + windSpeed);
  // console.log("Wind Direction(Degrees): " + windDirection);
  // console.log("Magnitude: " + magnitude);
  // console.log("Next point coords: (" + longitude + ", " + latitude + ")");
  // console.log("==============================================================");

  return nextPoint;
}

// Teleport to next location
async function nextCity() {
  // Get random points using city data
  await generateRandomPoints(city);
  // Reset position
  startTime = viewer.clock.currentTime;
  // Initialise nextTimeStep
  nextTimeStep = startTime;
  // Set clock settings
  viewer.clock.startTime = startTime.clone();
  viewer.clock.currentTime = startTime.clone();

  // Create wind path for next city in the list. Spawn balloon on that location.
  createPath(balloon, randomPointsArray[currentCityIndex].coordinates, numPoints, timeStepInSeconds);
  //console.log(randomPointsArray[currentCityIndex].cityName);
  //reset clock
  viewer.clock.multiplier = 1;
  //viewer.clock.shouldAnimate = true;
  // Increment city index
  currentCityIndex++;
  // Loop back if reached last city
  if (currentCityIndex > randomPointsArray.length) {
    currentCityIndex = 0;
  }

  //remove all previous path entities
  removeAllEntitiesByName("Path Entity");
  setTimeout(createPathEntity, 5000);

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

  //console.log(distance);
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
    // material: new Cesium.PolylineGlowMaterialProperty({
    //   glowPower: 0.1,
    //   color: Cesium.Color.YELLOW,
    // }),
    width: .1,
  },
});

// Create a compass element
var compass = document.createElement('div');
compass.className = 'cesium-compass';
viewer.container.appendChild(compass);
//set to north
compass.style.transform = 360 - Cesium.Math.toDegrees( viewer.camera.heading );

// Update compass orientation when camera changes
viewer.scene.postRender.addEventListener(function() {
    var camera = viewer.camera;
    var heading = Cesium.Math.toDegrees(camera.heading).toFixed(1);
    compass.style.transform = 'rotate(' + (-heading) + 'deg)';
});


// CSS styles for the compass
var style = document.createElement('style');
style.textContent = `
    .cesium-compass {
        position: absolute;
        bottom: 40px;
        right: 40px;
        width: 100px;
        height: 100px;
        background-image: url('compass.png'); /* Image for the compass needle */
        background-size: contain;
        transition: transform 0.5s;
    }
`;
document.head.appendChild(style);

//Create pathEntityentity
async function createPathEntity(){
  //console.log("entity creation");
  const pathEntity = viewer.entities.add({ 
    name: "Path Entity",
    // Move entity via simulation time
    
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: viewer.clock.currentTime,
        stop: Cesium.JulianDate.addSeconds(viewer.clock.currentTime, timeStepInSeconds * numPoints, new Cesium.JulianDate()),
      }),
    ]),
    // Use the same starting position as the target entity
    position: randomPointsArray[currentCityIndex], // Change this to random position on map

    box : {
      dimensions : new Cesium.Cartesian3(20, 6, 1),
      material : Cesium.Color.BLUE,
      //outline : true,
      outlineColor : Cesium.Color.YELLOW
    },
    // path: {
    //   resolution: 1,
    //   material: new Cesium.PolylineGlowMaterialProperty({
    //     glowPower: 0.1,
    //     color: Cesium.Color.BLUE,
    //   }),
    //   width: 15,
    // },
  });

  //console.log("LOG: Entity created at", new Date().toISOString());

  await animatePath(pathEntity);
  //console.log("LOG: Path animation completed at", new Date().toISOString());
}

//createPathEntity();
function generateAnimatedPath(){
  //console.log("generate method called");
  if(viewer.clock.shouldAnimate){
    //console.log("clock animated");
    createPathEntity();
  }
}
//first path entity - called only once
//NOTE: if clock is started as soon as program is loaded this entity gets removed
//  wait a few seconds for game to load or increase the setTimeout time 
setTimeout(createPathEntity, 4000);

// Set up the onTick event listener
viewer.clock.onTick.addEventListener(function(clock) {
  // Calculate the elapsed time since the last call to generatePath
  const elapsedTime = Cesium.JulianDate.secondsDifference(clock.currentTime, lastGeneratePathTime);

  // Check if the defined interval has passed since the last call
  if (elapsedTime >= pathEntityInterval) {
    // Call generatePath
    generateAnimatedPath();

    // Update the lastGeneratePathTime to the current time
    lastGeneratePathTime = clock.currentTime;
  }
});

// Count active entities
function countActiveEntities() {
  let activeCount = 0;
  viewer.entities.values.forEach(function(entity) {
      if (entity.isShowing) {
          activeCount++;
      }
  });
  return activeCount;
}

function removeAllEntitiesByName(entityName) {
  let entities = viewer.entities.values;

  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].name === entityName) {
      viewer.entities.remove(entities[i]);
    }
  }
}

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
nextCityButton.addEventListener('click', nextCity);

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
  //console.log("Current city:", data)
  // ********** We need to convert data.coordinates into something cesium can understand **************
  var newCoords = Cesium.Cartesian3.fromDegrees(data.coordinates[0], data.coordinates[1], data.coordinates[2]);
  let temp = { cityName: data.city, coordinates: newCoords };
  city = temp;
  console.log(city.cityName);
  nextCity();

});
