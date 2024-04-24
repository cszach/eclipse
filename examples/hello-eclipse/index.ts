import {
  Box,
  Mesh,
  PerspectiveCamera,
  Scene,
  SolidColor,
} from '../../src/index.js';
import {Rasterizer} from '../../src/renderers/Rasterizer.js';
import {quat, vec3} from 'wgpu-matrix';

const canvas = document.querySelector('canvas');

if (canvas === null) {
  throw new Error('Canvas does not exist');
}

const renderer = new Rasterizer(canvas);

renderer.init().then(() => {
  const box = new Box(1, 1, 1);
  const cube1 = new Mesh(box, new SolidColor([1, 0, 0]));
  const cube2 = new Mesh(box, new SolidColor([0, 1, 0]));
  vec3.set(2, 0, 0, cube2.localPosition);
  const cube3 = new Mesh(box, new SolidColor([0, 0, 1]));
  vec3.set(-2, 0, 0, cube3.localPosition);
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    Math.PI / 4,
    canvas.width / canvas.height
  );
  vec3.set(0, 0, 4, camera.localPosition);

  scene.add(cube1, cube2, cube3);

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

    quat.fromEuler(i++ / 300, 0, i / 300, 'xyz', cube1.localQuaternion);
    quat.fromEuler(i++ / 300, 0, i / 300, 'xyz', cube2.localQuaternion);
    quat.fromEuler(i++ / 300, 0, i / 300, 'xyz', cube3.localQuaternion);

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
});
