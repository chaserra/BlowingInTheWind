Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMjVmMzkzYS02MTM4LTQ2YTAtYjNhMy05ZmFhOWY5Y2Q5MDIiLCJpZCI6MjA5ODI3LCJpYXQiOjE3MTM1MDAyNjN9.SrQ5rn8K72P_luv7RePRsjLQOgA8QcpRIFdOCxUvG24';

// Initialise viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

// The viewer object's camera
const cam = viewer.camera;

// Set default camera pitch
const pitchAngle = Cesium.Math.toRadians(-15.0);
const cameraOffset = new Cesium.HeadingPitchRange(0.0, pitchAngle, 150.0);

// Visualise buildings
const buildingTileSet = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileSet);

// UoW Student Centre Coordinates
const uowsc = Cesium.Cartesian3.fromDegrees(175.3177, -37.78765, 100.0);

// Create entity
const targetEntity = viewer.entities.add({
  name: "Target entity to track",
  position: uowsc,
  ellipsoid: {
    radii: new Cesium.Cartesian3(15.0, 15.0, 15.0),
    material: Cesium.Color.RED.withAlpha(0.5),
    outline: true,
    outlineColor: Cesium.Color.BLACK,
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

// Change target.center to change next target to fly to
// TODO: Move the entity then let camera track it

const timeStepInSeconds = 60;
// Set startTime to current time
let startTime = viewer.clock.currentTime;
// Temporary destination
let destination = uowsc;
// Start animating
//viewer.clock.shouldAnimate = true;

// Create SampledPositionProperty
const positionProperty = new Cesium.SampledPositionProperty();

// SAMPLE DATA. Change using wind data
const pos1 = Cesium.Cartesian3.fromDegrees(175.3177, -37.78765, 100.0);
const pos2 = Cesium.Cartesian3.fromDegrees(175.3137, -37.78635, 150.0);
const pos3 = Cesium.Cartesian3.fromDegrees(175.3157, -37.78455, 125.0);
const pos4 = Cesium.Cartesian3.fromDegrees(175.3167, -37.78625, 110.0);
const pos5 = Cesium.Cartesian3.fromDegrees(175.3127, -37.78885, 100.0);
const pos_array = [pos1, pos2, pos3, pos4, pos5];

// Create points (NOTE: should get from wind data and loop through points)
for (let i = 0; i < pos_array.length; i++) {  
  // Create sample position property (NOTE: Time should be obtained/calculated from wind data)
  const time = Cesium.JulianDate.addSeconds(startTime, timeStepInSeconds, new Cesium.JulianDate());
  const position = pos_array[i];
  positionProperty.addSample(time, position);
  
  // Create entity based on sample position
  viewer.entities.add({
    position: position,
    point: { pixelSize: 15, color: Cesium.Color.RED }
  });
}


/* ************************************
** UNUSED CODE BUT KEPT FOR REFERENCE 
*  ************************************/
// Bounding Sphere for the UoW SC
//let target = new Cesium.BoundingSphere(uowsc, 150.0);

// Fly to target (Camera)
// cam.flyToBoundingSphere(target, {
//   offset: cameraOffset,
//   complete: console.log("done flying to..."),
// });

// cam.setView({
//   destination: uowsc,
//   orientation: {
//     pitch: pitchAngle,
//     roll: 0.0,
//   },
// });

// Fly to UoW Student Centre
// cam.flyTo({
//   destination: uowsc,
//   orientation: {
//     pitch: pitchAngle,
//   },
// });
