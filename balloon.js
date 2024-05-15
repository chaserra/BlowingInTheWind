//Import the THREE.js library
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// To allow for importing the .gltf file
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

//Create a Three.JS Scene
const scene = new THREE.Scene();
//create a new camera with positions and angles
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

//Keep the 3D object on a global variable so we can access it later
let object;

//Instantiate a loader for the .gltf file
const loader = new GLTFLoader();

//Load the file
loader.load(
  '/Balloon/scene.gltf',
  function (gltf) {
    //If the file is loaded, add it to the scene
    object = gltf.scene;
    scene.add(object);
    object.position.set(0, -9, 3);
    object.rotation.x = 0.55;
  },
  function (xhr) {
    //While it is loading, log the progress
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function (error) {
    //If there is an error, log it
    console.error(error);
  }
);

//Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({ alpha: true }); //Alpha: true allows for the transparent background
renderer.setSize(window.innerWidth/2, window.innerHeight/2);

//Add the renderer to the DOM
document.getElementById("balloonContainer").appendChild(renderer.domElement);

//Set how far the camera will be from the 3D model
camera.position.z = 25;

//Add lights to the scene, so we can actually see the 3D model
const topLight = new THREE.DirectionalLight(0xffffff, 1); // (color, intensity)
topLight.position.set(500, 500, 500) //top-left-ish
topLight.castShadow = true;
scene.add(topLight);

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

//Render the scene
function animate() {
  requestAnimationFrame(animate);
  if(object) {
    //animateLanding(7);
    //animateRightTilt();
    //animateLeftTilt();
    object.rotation.y += 0.005;
  }
  renderer.render(scene, camera);
}

function animateLeftTilt(){
  let new_x_pos, new_y_pos, new_z_pos, tiltingSpeed;

  new_x_pos = 0;
  new_y_pos = -9;
  new_z_pos = 3;
  tiltingSpeed = 0.0125;
  
  let objAngle = 0.2;
  let objNewPoint = new THREE.Vector3(new_x_pos, new_y_pos, new_z_pos);
  let objAxis = new THREE.Vector3(0, 0, 0.03);

  // code for making the balloon continue rotating
  //object.rotation.y += tiltingSpeed;
  rotateAboutPivot(object, objNewPoint, objAxis, objAngle);
}

function animateRightTilt(){
  let new_x_pos, new_y_pos, new_z_pos, tiltingSpeed;

  new_x_pos = 0;
  new_y_pos = -9;
  new_z_pos = 3;
  tiltingSpeed = 0.0125;
  
  let objAngle = 0.2;
  let objNewPoint = new THREE.Vector3(new_x_pos, new_y_pos, new_z_pos);
  let objAxis = new THREE.Vector3(0, 0, -0.03);

  // code for making the balloon continue rotating
  //object.rotation.y += tiltingSpeed;
  rotateAboutPivot(object, objNewPoint, objAxis, objAngle);
}

function animateLanding(newXPos){
  let new_x_pos, new_y_pos, new_z_pos;

  new_x_pos = newXPos;
  new_y_pos = -9;
  new_z_pos = 3;
  
  let objAngle = 0.25;
  let objNewPoint = new THREE.Vector3(new_x_pos, new_y_pos, new_z_pos);
  let objAxis = new THREE.Vector3(0, 0, -0.03);

  rotateAboutPivot(object, objNewPoint, objAxis, objAngle);
}

// obj - object (THREE.Object3D or derived)
// point - point of rotation (THREE.Vector3)
// axis - the axis of rotation (normalized THREE.Vector3)
// theta - radian value of rotation
// pointIsWorld - boolean indicating the point is in world coordinates (default = false)
function rotateAboutPivot(obj, point, axis, theta, pointIsWorld = false){
  if(pointIsWorld){
      obj.parent.localToWorld(obj.position); // compensate for world coordinate
  }
  obj.position.sub(point); // remove the offset
  obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
  obj.position.add(point); // re-add the offset

  if(pointIsWorld){
      obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
  }
  obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

//Start the 3D rendering
animate();
