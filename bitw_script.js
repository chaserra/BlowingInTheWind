// Set access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMjVmMzkzYS02MTM4LTQ2YTAtYjNhMy05ZmFhOWY5Y2Q5MDIiLCJpZCI6MjA5ODI3LCJpYXQiOjE3MTM1MDAyNjN9.SrQ5rn8K72P_luv7RePRsjLQOgA8QcpRIFdOCxUvG24';

//Import weather.js to bitw script
import { fetchWeatherData } from "./weather.js";

//module lever variables to store wind data
let windSpeed, windDirection;

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

//gets the wind data and stores it to the module level variables 
async function fetchAndStoreWind(latitude, longitude){
  const weatherWind=  await fetchWeatherData(latitude, longitude);
  windDirection = weatherWind.windDirection;
  windSpeed = weatherWind.windSpeed;
}

fetchAndStoreWind(uowscDegrees.latitude, uowscDegrees.longitude);

// SAMPLE DATA. Change using wind data
const pos1 = Cesium.Cartesian3.fromDegrees(175.3197, -37.78765, 100.0);
const pos2 = Cesium.Cartesian3.fromDegrees(175.3157, -37.78455, 125.0);
const pos3 = Cesium.Cartesian3.fromDegrees(175.3137, -37.78635, 150.0);
const pos4 = Cesium.Cartesian3.fromDegrees(175.3123, -37.78675, 110.0);
const pos5 = Cesium.Cartesian3.fromDegrees(175.3127, -37.78885, 100.0);
const pos6 = uowscCartesian;
const pos_array = [pos1, pos2, pos3, pos4, pos5, pos6];

// Setup clock
// Time it takes to go to destination
const timeStepInSeconds = 60;
// Set startTime to current time
let startTime = viewer.clock.currentTime;
// Initialise nextTimeStep
let nextTimeStep = startTime;
// Set stopTime to 6 minutes after startTime
let stopTime = Cesium.JulianDate.addSeconds(startTime, 360, new Cesium.JulianDate());
// Set clock settings
viewer.clock.startTime = startTime.clone();
viewer.clock.stopTime = stopTime.clone();
viewer.clock.currentTime = startTime.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
// Start animating at x10 speed
viewer.clock.multiplier = 10;
//viewer.clock.shouldAnimate = true;

// Create points (NOTE: should get from wind data and loop through points)
// Must add parameters (array of points from the wind data. Refresh when pulling new data)
function createPath() {
  // Create SampledPositionProperty
  const positionProperty = new Cesium.SampledPositionProperty();

  // Set initial position at startTime
  positionProperty.addSample(startTime, uowscCartesian);

  // Plot points on the map
  for (let i = 0; i < pos_array.length; i++) {  
    // Create sample position property (NOTE: Time should be obtained/calculated from wind data)
    const time = Cesium.JulianDate.addSeconds(nextTimeStep, timeStepInSeconds, new Cesium.JulianDate());
    const position = pos_array[i];
    positionProperty.addSample(time, position);

    // Increment time
    nextTimeStep = time;
    
    // Format date and time for easier reading
    const newDate = Cesium.JulianDate.toGregorianDate(time, new Cesium.GregorianDate());
    const text = "pos" + (i+1) + " -- " + newDate.year + "/" + newDate.month + "/" + newDate.day + " | "
               + newDate.hour + ":" + newDate.minute + ":" + newDate.second;

    // Create entity based on sample position
    viewer.entities.add({
      position: position,
      name: text,
      point: { pixelSize: 15, color: Cesium.Color.RED }
    });
  }
  return positionProperty;
}

// Generate path for the balloon
const flightPath = createPath();

// Create entity
const targetEntity = viewer.entities.add({
  name: "The hot air balloon",
  // Move entity via simulation time
  availability: new Cesium.TimeIntervalCollection([
    new Cesium.TimeInterval({
      start: startTime,
      stop: stopTime
    }),
  ]),
  // Use path created by the function
  position: flightPath, 
  // Automatically compute orientation based on position movement.
  orientation: new Cesium.VelocityOrientationProperty(flightPath),
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

// Change interpolation mode to make path more curved
targetEntity.position.setInterpolationOptions({
  interpolationDegree: 5,
  interpolationAlgorithm:
    Cesium.LagrangePolynomialApproximation,
});

//Set up chase camera
var matrix3Scratch = new Cesium.Matrix3();
var positionScratch = new Cesium.Cartesian3();
var orientationScratch = new Cesium.Quaternion();
var scratch = new Cesium.Matrix4();

function getModelMatrix(targetEntity, time, result) {
  var position = Cesium.Property.getValueOrUndefined(targetEntity.position, time, positionScratch);
  if (!Cesium.defined(position)) {
    return undefined;
  }
  var orientation = Cesium.Property.getValueOrUndefined(targetEntity.orientation, time, orientationScratch);
  if (!Cesium.defined(orientation)) {
    result = Cesium.Transforms.eastNorthUpToFixedFrame(position, undefined, result);
  } else {
    result = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromQuaternion(orientation, matrix3Scratch), position, result);
  }
  return result;
}

// Fly to entity (Viewer)
// viewer.flyTo(targetEntity, {
//   offset: cameraOffset,
// });

// Quick camera focus to target entity
viewer.zoomTo(targetEntity, cameraOffset);

/* *****RUNTIME CODE***** */
// Tick function
viewer.clock.onTick.addEventListener(function(clock) {
  // If clock is playing
  if(clock.shouldAnimate) {
    // Change camera angle to 3rd person view (chase cam)
    getModelMatrix(targetEntity, viewer.clock.currentTime, scratch);
    cam.lookAtTransform(scratch, new Cesium.Cartesian3(-250, 0, 70));
  }
});

// On Pause/Play event
Cesium.knockout.getObservable(viewer.animation.viewModel.clockViewModel, 
                              'shouldAnimate').subscribe(function(value) {
  // If paused
  if (!value) {
    // Revert camera back to normal
    viewer.zoomTo(targetEntity, cameraOffset);
  }
});