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


//conformation for button being clicked
var buttonClicked = false;

var filePath;
//array for the different file paths
var filePaths = [
  '/Balloons/Balloon/scene.gltf',
  '/Balloons/Balloon1/scene.gltf',
  '/Balloons/Balloon2/scene.gltf',
  '/Balloons/Balloon3/scene.gltf',
  '/Balloons/Balloon4/scene.gltf',
  '/Balloons/Balloon5/scene.gltf',
  '/Balloons/Balloon6/scene.gltf',
  '/Balloons/Balloon7/scene.gltf',
];

//choosing the file path from the balloon chosen by user
export function imageClick(imageName) {
  if (imageName === 'Image 1') {
    filePath = filePaths[0];
  } else if (imageName === 'Image 2') {
    filePath = filePaths[1];
  } else if (imageName === 'Image 3') {
    filePath = filePaths[2];
  } else if (imageName === 'Image 4') {
    filePath = filePaths[3];
  } else if (imageName === 'Image 5') {
    filePath = filePaths[4];
  } else if (imageName === 'Image 6') {
    filePath = filePaths[5];
  } else if (imageName === 'Image 7') {
    filePath = filePaths[6];
  } else if (imageName === 'Image 8') {
    filePath = filePaths[7];

// //Load the file
// loader.load(
//   '/Balloon/scene.gltf',
//   function (gltf) {
//     //If the file is loaded, add it to the scene
//     object = gltf.scene;
//     scene.add(object);
//     object.position.set(0, -9, 3);
//     object.rotation.x = 0.55;
//   },
//   function (xhr) {
//     //While it is loading, log the progress
//     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//   },
//   function (error) {
//     //If there is an error, log it
//     console.error(error);

  }
  buttonClicked = true; // Set the variable to true when the button is clicked
  scene.remove(object);
  loadModel(); // Call the loadModel function
}

// function to load a balloon based on the file path chosen by the function
function loadModel() {

  //function for button conformation
  function isButtonClicked() {
    return buttonClicked;
  }

  isButtonClicked();
  var defaultPath = '/Balloons/Balloon/scene.gltf'; //default path for the balloon image
  if (!buttonClicked) {
    filePath = defaultPath; // Use default model path if the button hasn't been pressed yet
  }
  //Load the file
  loader.load(
    filePath,
    function (gltf) {
      //If the file is loaded, add it to the scene
      object = gltf.scene;
      // Remove previous object from the scene if it exists

      scene.add(object);

      object.position.set(0, -9, 0);
      object.rotation.x = 0.55;
      //object.rotation.y = 0.4;

      // Create a new ShaderMaterial
      const material = new THREE.ShaderMaterial({
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        uniforms: {
          lightPosition: { value: new THREE.Vector3(500, 500, 500) },
          viewPosition: { value: camera.position },
          lightColor: { value: new THREE.Color(0xffffff) },
          objectColor: { value: new THREE.Color(0xff0000) },
          shininess: { value: 100 },
        },
      });

      // Assign the ShaderMaterial to the balloon object
      object.material = material;

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
}

//Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({ alpha: true }); //Alpha: true allows for the transparent background
renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);

//Add the renderer to the DOM
document.getElementById("balloonContainer").appendChild(renderer.domElement);

//Set how far the camera will be from the 3D model
camera.position.z = 25;

function addLights() {
  //Add lights to the scene, so we can actually see the 3D model
  const topLight = new THREE.DirectionalLight(0xffffff, 1); // (color, intensity)
  topLight.position.set(500, 500, 500) //top-left-ish
  topLight.castShadow = true;
  scene.add(topLight);

  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);
}

//Render the scene
function animate() {
  requestAnimationFrame(animate);

  //Here we could add some code to update the scene, adding some automatic movement
  if (object) object.rotation.y += 0.015;
  renderer.render(scene, camera);
}

//load the balloon
loadModel();
//add lights to the scene
addLights();

//   if(object) {
//     //animateLanding(7);
//     //animateRightTilt();
//     //animateLeftTilt();
//     object.rotation.y += 0.005;
//   }
//   renderer.render(scene, camera);
// }

// function animateLeftTilt(){
//   let new_x_pos, new_y_pos, new_z_pos, tiltingSpeed;

//   new_x_pos = 0;
//   new_y_pos = -9;
//   new_z_pos = 3;
//   tiltingSpeed = 0.0125;
  
//   let objAngle = 0.2;
//   let objNewPoint = new THREE.Vector3(new_x_pos, new_y_pos, new_z_pos);
//   let objAxis = new THREE.Vector3(0, 0, 0.03);

//   // code for making the balloon continue rotating
//   //object.rotation.y += tiltingSpeed;
//   rotateAboutPivot(object, objNewPoint, objAxis, objAngle);
// }

// function animateRightTilt(){
//   let new_x_pos, new_y_pos, new_z_pos, tiltingSpeed;

//   new_x_pos = 0;
//   new_y_pos = -9;
//   new_z_pos = 3;
//   tiltingSpeed = 0.0125;
  
//   let objAngle = 0.2;
//   let objNewPoint = new THREE.Vector3(new_x_pos, new_y_pos, new_z_pos);
//   let objAxis = new THREE.Vector3(0, 0, -0.03);

//   // code for making the balloon continue rotating
//   //object.rotation.y += tiltingSpeed;
//   rotateAboutPivot(object, objNewPoint, objAxis, objAngle);
// }

// function animateLanding(newXPos){
//   let new_x_pos, new_y_pos, new_z_pos;

//   new_x_pos = newXPos;
//   new_y_pos = -9;
//   new_z_pos = 3;
  
//   let objAngle = 0.25;
//   let objNewPoint = new THREE.Vector3(new_x_pos, new_y_pos, new_z_pos);
//   let objAxis = new THREE.Vector3(0, 0, -0.03);

//   rotateAboutPivot(object, objNewPoint, objAxis, objAngle);
// }

// // obj - object (THREE.Object3D or derived)
// // point - point of rotation (THREE.Vector3)
// // axis - the axis of rotation (normalized THREE.Vector3)
// // theta - radian value of rotation
// // pointIsWorld - boolean indicating the point is in world coordinates (default = false)
// function rotateAboutPivot(obj, point, axis, theta, pointIsWorld = false){
//   if(pointIsWorld){
//       obj.parent.localToWorld(obj.position); // compensate for world coordinate
//   }
//   obj.position.sub(point); // remove the offset
//   obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
//   obj.position.add(point); // re-add the offset

//   if(pointIsWorld){
//       obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
//   }
//   obj.rotateOnAxis(axis, theta); // rotate the OBJECT
// }


//Start the 3D rendering
animate();
