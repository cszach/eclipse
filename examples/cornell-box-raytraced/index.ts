import {
  Box,
  Mesh,
  PerspectiveCamera,
  Scene,
  SolidColor,
  RayTracer,
  AmbientLight,
  PointLight,
  Plane,
  Metal,
  Lambert,
  Sphere,
} from '../../src/index.js';
import {quat, vec3} from 'wgpu-matrix';
import Stats from 'stats.js';

const canvas = document.querySelector('canvas');

if (canvas === null) {
  throw new Error('Canvas does not exist');
}

const renderer = new RayTracer(canvas);

const plane = new Plane(1, 1);

const c = 180 / 255;
const white = [c, c, c];

const leftWall = new Mesh(plane, new Lambert([c, 0, 0]));
vec3.set(-0.5, 0, 0, leftWall.localPosition);
quat.fromEuler(0, Math.PI / 2, 0, 'xyz', leftWall.localQuaternion);

const rightWall = new Mesh(plane, new Lambert([0, c, 0]));
vec3.set(0.5, 0, 0, rightWall.localPosition);
quat.fromEuler(0, -Math.PI / 2, 0, 'xyz', rightWall.localQuaternion);

const backWall = new Mesh(plane, new Lambert(white));
vec3.set(0, 0, -0.5, backWall.localPosition);
// quat.fromEuler(0, 0, 0, 'xyz', backWall.localQuaternion);

const ground = new Mesh(plane, new Lambert(white));
vec3.set(0, -0.5, 0, ground.localPosition);
quat.fromEuler(-Math.PI / 2, 0, 0, 'xyz', ground.localQuaternion);

const ceiling = new Mesh(plane, new Lambert(white));
vec3.set(0, 0.5, 0, ceiling.localPosition);
quat.fromEuler(Math.PI / 2, 0, 0, 'xyz', ceiling.localQuaternion);

const box = new Box(0.3, 0.3, 0.3);

const tallBox = new Mesh(box, new Metal(white, 0));
vec3.set(-0.25, -0.2, -0.25, tallBox.localPosition);
vec3.set(1, 2, 1, tallBox.localScale);
quat.fromEuler(0, Math.PI / 10, 0, 'xyz', tallBox.localQuaternion);

const shortBox = new Mesh(box, new Lambert(white));
vec3.set(0.2, -0.35, 0.25, shortBox.localPosition);
quat.fromEuler(0, -Math.PI / 10, 0, 'xyz', shortBox.localQuaternion);

const sphere = new Mesh(new Sphere(0.15), new Lambert(white));
vec3.set(0.2, -0.35, 0.25, sphere.localPosition);

const ambient = new AmbientLight([1, 1, 1]);
const light = new PointLight();
vec3.set(0, 0.5, 0, light.localPosition);
const lightMesh = new Mesh(new Plane(0.2, 0.2), new SolidColor());
vec3.set(0, 0.5 - 0.001, 0, lightMesh.localPosition);
quat.fromEuler(Math.PI / 2, 0, 0, 'xyz', lightMesh.localQuaternion);

const scene = new Scene();
const camera = new PerspectiveCamera(Math.PI / 4, canvas.width / canvas.height);
vec3.set(0, 0, 2, camera.localPosition);

scene.add(
  leftWall,
  rightWall,
  backWall,
  ground,
  ceiling,
  tallBox,
  shortBox,
  // sphere,
  ambient,
  light,
  lightMesh
);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

renderer.setRenderLoop(() => {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
});
