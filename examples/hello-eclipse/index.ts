import {Box, Mesh, PerspectiveCamera, Scene} from '../../src/index.js';
import {Rasterizer} from '../../src/renderers/Rasterizer.js';
import {quat, vec3} from 'wgpu-matrix';

const canvas = document.querySelector('canvas');

if (canvas === null) {
  throw new Error('Canvas does not exist');
}

const renderer = new Rasterizer(canvas);

renderer.init().then(() => {
  const box = new Box(1, 1, 1);
  const mesh = new Mesh(box);
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    Math.PI / 4,
    canvas.scrollWidth / canvas.scrollHeight
  );
  vec3.set(1, 1, 2, camera.localPosition);

  scene.add(mesh);

  let i = 0;

  function frame() {
    renderer.render(scene, camera);

    quat.fromEuler(i++ / 100, 0, i / 100, 'xyz', mesh.localQuaternion);

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
});
