import {
  Box,
  Mesh,
  PerspectiveCamera,
  Scene,
  SolidColor,
  AmbientLight,
  PointLight,
  Plane,
  Metal,
  Lambert,
  Sphere,
  PathTracer,
  Object3D,
} from '../../src/index.js';
import {quat, vec3} from 'wgpu-matrix';
import Stats from 'stats.js';
import {Texture} from '../../src/textures/Texture.js';

const canvas = document.querySelector('canvas');

function init() {
  if (canvas === null) {
    throw new Error('Canvas does not exist');
  }

  const group = new Object3D();
  vec3.set(-0.1, -1, -0, group.localPosition);

  const cube1 = new Mesh(new Box(0.5, 0.5, 0.5), new Metal("#fff", 0.07));
  group.add(cube1);

  const cube2 = new Mesh(new Box(0.12, 0.4, 0.5), new Metal("#9a2db8", 0.07));
  vec3.set(-0.31, 0.45, 0, cube2.localPosition);
  group.add(cube2);

  const cube3 = new Mesh(new Box(0.02, 0.12, 0.12), new SolidColor("#fff"));
  vec3.add(cube2.localPosition, vec3.create(0.06 + 0.01, -0.2 + 0.06, 0), cube3.localPosition);
  group.add(cube3);

  const cube4 = new Mesh(new Box(0.2, 0.12, 0.12), new Metal("#fff", 0.35));
  vec3.add(cube3.localPosition, vec3.create(0.01 + 0.1, 0, 0), cube4.localPosition);
  group.add(cube4);

  const cube5 = new Mesh(new Box(0.25, 0.1, 0.25), new Metal("#fff", 0.15));
  vec3.add(cube1.localPosition, vec3.create(0.25 + 0.125, 0.25 + 0.05, -0.125), cube5.localPosition);
  group.add(cube5);

  const cube6 = new Mesh(new Box(0.08, 0.08, 0.08), new Metal("#fff", 0.15));
  vec3.add(cube5.localPosition, vec3.create(0.125 + 0.04, -0.05 - 0.04, -0.125 - 0.04), cube6.localPosition);
  group.add(cube6);

  const cube7 = new Mesh(new Box(0.12, 0.4, 0.04), new SolidColor("#fff"));
  vec3.add(cube2.localPosition, vec3.create(0, 0, -0.25 - 0.02), cube7.localPosition);
  group.add(cube7);

  const cube8 = new Mesh(new Box(0.7, 0.7, 0.7), new Metal("#3dbdf2", 0.25));
  vec3.add(cube7.localPosition, vec3.create(0, 0, -0.02 - 0.35), cube8.localPosition);
  group.add(cube8);

  // const cube9 = new Mesh(new Box(0.2, 0.12, 0.12), new Metal([1, 1, 1], 0.55));
  const cube9Size = [0.5 - 0.22 + 0.03, 0.4 - 0.12, 0.25 - 0.06 + 0.04];
  const cube9 = new Mesh(new Box(cube9Size[0], cube9Size[1], cube9Size[2]), new Metal("#191654", 0.35));
  vec3.add(cube4.localPosition, vec3.create(0.1 + (0.5 - 0.22 + 0.03) / 2, 0.12 / 2 + (0.4 - 0.12) / 2, -0.06 - (0.25 - 0.06 + 0.04) / 2), cube9.localPosition);
  group.add(cube9);

  const cube10 = new Mesh(new Box(1, 1, 1), new Metal("#9a2db8", 0.35));
  vec3.add(cube9.localPosition, vec3.create(cube9Size[0] / 2 + 0.5, -0.5 + cube9Size[1] / 2, -cube9Size[2] / 2 - 0.5), cube10.localPosition);
  group.add(cube10);

  const cube11 = new Mesh(new Box(0.1, 0.1, 0.4), new Metal("#fff", 0.2));
  vec3.add(cube10.localPosition, vec3.create(-0.55, 0.55, 0.5 - 0.2), cube11.localPosition);
  group.add(cube11);

  const cube12 = new Mesh(new Box(0.1, 0.1, 0.1), new Metal("#191654", 0.25));
  vec3.add(cube8.localPosition, vec3.create(0.35 + 0.05, 0.35 + 0.05, 0.35 - 0.05), cube12.localPosition);
  group.add(cube12);

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    Math.PI / 4,
    canvas.width / canvas.height
  );
  vec3.set(1.2, 0.2, 2, camera.localPosition);

  // white light
  const light1 = new Mesh(new Plane(1, 1), new SolidColor("#ffffff"));
  vec3.set(-1.8, 0.5, 1, light1.localPosition);
  quat.fromEuler(Math.PI, Math.PI / 4, 0, 'xyz', light1.localQuaternion);
  group.add(light1);

  const light2 = new Mesh(new Plane(5, 5), new SolidColor("#9a2db8"));
  vec3.set(0, 1, 2, light2.localPosition);
  quat.fromEuler(Math.PI / 2, 0, 0, 'xyz', light2.localQuaternion);
  group.add(light2);

  const light3 = new Mesh(new Plane(2, 2), new SolidColor("#0f0c29"));
  vec3.set(0, -1, 1, light3.localPosition);
  quat.fromEuler(Math.PI, 0, 0, 'xyz', light3.localQuaternion);
  group.add(light3);

  const light4 = new Mesh(new Plane(3, 3), new SolidColor("#1212ff"));
  vec3.set(1, 0.5, -0.7, light4.localPosition);
  quat.fromEuler(0, -Math.PI / 2, 0, 'xyz', light4.localQuaternion);
  group.add(light4);

  const light5 = new Mesh(new Plane(5, 5), new SolidColor("#cc5333"));
  vec3.set(-0.8, 1.2, -2, light5.localPosition);
  quat.fromEuler(Math.PI / 2, 0, 0, 'xyz', light5.localQuaternion);
  group.add(light5);

  scene.add(group);

  const renderer = new PathTracer({canvas});

  renderer.setRenderLoop(() => {
    renderer.render(scene, camera);
  });
}

init();
