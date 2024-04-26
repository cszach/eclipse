import {
  Box,
  Mesh,
  PerspectiveCamera,
  Scene,
  SolidColor,
  BlinnPhong,
  Rasterizer,
  AmbientLight,
  PointLight,
  Plane,
} from '../../src/index.js';
import {quat, vec3} from 'wgpu-matrix';

const canvas = document.querySelector('canvas');

if (canvas === null) {
  throw new Error('Canvas does not exist');
}

const renderer = new Rasterizer(canvas);

renderer.init().then(() => {
  const plane = new Plane(1, 1);
  const mesh = new Mesh(plane, new BlinnPhong([1, 0.5, 0.3]));
  quat.fromEuler(-Math.PI / 2, 0, 0, 'xyz', mesh.localQuaternion);

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    Math.PI / 4,
    canvas.width / canvas.height
  );
  vec3.set(1, 2, 4, camera.localPosition);

  const pointLight = new PointLight();
  const lightBulb = new Mesh(new Box(0.2, 0.2, 0.2), new SolidColor());
  vec3.set(0, 1, 0, pointLight.localPosition);
  vec3.set(0, 1, 0, lightBulb.localPosition);

  scene.add(mesh, new AmbientLight([1, 1, 1], 0.1), pointLight, lightBulb);

  // Canvas resize

  const resizeObserver = new ResizeObserver(entries => {
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

  let i = 0;

  function frame() {
    renderer.render(scene, camera);

    i++;
    quat.fromEuler(i / 100, 0, 0, 'xyz', mesh.localQuaternion);

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
});
