import {
  Box,
  Mesh,
  PerspectiveCamera,
  Scene,
  SolidColor,
  BlinnPhong,
  AmbientLight,
  PointLight,
  Plane,
  Mirror,
  Rasterizer,
} from '../../src/index.js';
import {quat, vec3} from 'wgpu-matrix';

const canvas = document.querySelector('canvas');

if (canvas === null) {
  throw new Error('Canvas does not exist');
}

const renderer = new Rasterizer(canvas);

renderer.init().then(() => {
  const plane = new Plane(1, 1);

  const leftWall = new Mesh(plane, new BlinnPhong([180 / 255, 0, 0]));
  vec3.set(-0.5, 0, 0, leftWall.localPosition);
  quat.fromEuler(0, Math.PI / 2, 0, 'xyz', leftWall.localQuaternion);

  const rightWall = new Mesh(plane, new BlinnPhong([0, 180 / 255, 0]));
  vec3.set(0.5, 0, 0, rightWall.localPosition);
  quat.fromEuler(0, -Math.PI / 2, 0, 'xyz', rightWall.localQuaternion);

  const backWall = new Mesh(
    plane,
    new BlinnPhong([180 / 255, 180 / 255, 180 / 255])
  );
  vec3.set(0, 0, -0.5, backWall.localPosition);
  // quat.fromEuler(0, 0, 0, 'xyz', backWall.localQuaternion);

  const ground = new Mesh(
    plane,
    new BlinnPhong([180 / 255, 180 / 255, 180 / 255])
  );
  vec3.set(0, -0.5, 0, ground.localPosition);
  quat.fromEuler(-Math.PI / 2, 0, 0, 'xyz', ground.localQuaternion);

  const ceiling = new Mesh(
    plane,
    new BlinnPhong([180 / 255, 180 / 255, 180 / 255])
  );
  vec3.set(0, 0.5, 0, ceiling.localPosition);
  quat.fromEuler(Math.PI / 2, 0, 0, 'xyz', ceiling.localQuaternion);

  const box = new Box(0.3, 0.3, 0.3);

  const tallBox = new Mesh(box, new Mirror([1, 1, 1]));
  vec3.set(-0.25, -0.2, -0.25, tallBox.localPosition);
  vec3.set(1, 2, 1, tallBox.localScale);
  quat.fromEuler(0, Math.PI / 10, 0, 'xyz', tallBox.localQuaternion);
  const shortBox = new Mesh(
    box,
    new BlinnPhong([180 / 255, 180 / 255, 180 / 255])
  );
  vec3.set(0.2, -0.35, 0.25, shortBox.localPosition);
  quat.fromEuler(0, -Math.PI / 10, 0, 'xyz', shortBox.localQuaternion);

  const ambient = new AmbientLight([1, 1, 1], 0.1);
  const light = new PointLight();
  vec3.set(0, 0.5, 0, light.localPosition);
  const lightMesh = new Mesh(new Plane(0.2, 0.2), new SolidColor());
  vec3.set(0, 0.5 - 0.001, 0, lightMesh.localPosition);
  quat.fromEuler(Math.PI / 2, 0, 0, 'xyz', lightMesh.localQuaternion);

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    Math.PI / 4,
    canvas.width / canvas.height
  );
  vec3.set(0, 0, 2, camera.localPosition);

  scene.add(
    leftWall,
    rightWall,
    backWall,
    ground,
    ceiling,
    tallBox,
    shortBox,
    ambient,
    light,
    lightMesh
  );

  // Canvas resize
  let i = 0;

  const resizeObserver = new ResizeObserver(entries => {
    i = 0;

    entries.forEach(entry => {
      const canvas = entry.target as HTMLCanvasElement;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;

      canvas.width = width;
      canvas.height = height;

      camera.aspectRatio = canvas.width / canvas.height;
    });
  });

  resizeObserver.observe(canvas);

  // renderer.render(scene, camera, 20);

  function frame() {
    renderer.render(scene, camera, i++);

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
});
