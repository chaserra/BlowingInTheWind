// Set access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMjVmMzkzYS02MTM4LTQ2YTAtYjNhMy05ZmFhOWY5Y2Q5MDIiLCJpZCI6MjA5ODI3LCJpYXQiOjE3MTM1MDAyNjN9.SrQ5rn8K72P_luv7RePRsjLQOgA8QcpRIFdOCxUvG24';

// Initialise viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

// Visualise buildings
const buildingTileSet = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileSet);

// The viewer object's camera
const cam = viewer.camera;

// Set default camera pitch
const pitchAngle = Cesium.Math.toRadians(-15.0);
const cameraOffset = new Cesium.HeadingPitchRange(0.0, pitchAngle, 150.0);

// UoW Student Centre Coordinates
const uowsc = Cesium.Cartesian3.fromDegrees(175.3177, -37.78765, 100.0);
// SAMPLE DATA. Change using wind data
const pos1 = Cesium.Cartesian3.fromDegrees(175.3197, -37.78765, 100.0);
const pos2 = Cesium.Cartesian3.fromDegrees(175.3137, -37.78635, 150.0);
const pos3 = Cesium.Cartesian3.fromDegrees(175.3157, -37.78455, 125.0);
const pos4 = Cesium.Cartesian3.fromDegrees(175.3167, -37.78625, 110.0);
const pos5 = Cesium.Cartesian3.fromDegrees(175.3127, -37.78885, 100.0);
const pos6 = uowsc;
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
  positionProperty.addSample(startTime, uowsc);

  // Plot points on the map
  for (let i = 0; i < pos_array.length; i++) {  
    // Create sample position property (NOTE: Time should be obtained/calculated from wind data)
    const time = Cesium.JulianDate.addSeconds(nextTimeStep, timeStepInSeconds, new Cesium.JulianDate());
    const position = pos_array[i];
    positionProperty.addSample(time, position);

    // Increment time
    nextTimeStep = time;
    
    // Format date and time for easier reading
    const newDate = Cesium.JulianDate.toGregorianDate(time, new Cesium.GregorianDate())
    const text = newDate.year + "/" + newDate.month + "/" + newDate.day + " | "
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
  name: "Target entity to track",
  // Move entity via simulation time
  availability: new Cesium.TimeIntervalCollection([
    new Cesium.TimeInterval({
      start: startTime,
      stop: stopTime
    }),
  ]),
  // Use path created by the function
  position: flightPath, 
  // Placeholder entity visuals
  ellipsoid: {
    radii: new Cesium.Cartesian3(15.0, 15.0, 15.0),
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

// Set viewer's tracked entity
viewer.trackedEntity = targetEntity;

// Fly to entity (Viewer)
const result = viewer.flyTo(targetEntity, {
  offset: cameraOffset,
});

// Async promise. result will update after flyTo completes (or otherwise)
if (result) {
  console.log("flyTo complete...");
}