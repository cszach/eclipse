import {
  Sphere,
  Mesh,
  PerspectiveCamera,
  Scene,
  SolidColor,
  BlinnPhong,
  Rasterizer,
  AmbientLight,
  PointLight,
} from '../../src/index.js';
import {quat, vec3} from 'wgpu-matrix';

const canvas = document.querySelector('canvas');

if (canvas === null) {
  throw new Error('Canvas does not exist');
}

const renderer = new Rasterizer(canvas);

renderer.init().then(() => {
  const sphere = new Mesh(new Sphere(1), new BlinnPhong([1, 0.5, 0.31]));
  const lightBulb = new Mesh(new Sphere(0.2), new SolidColor([1, 1, 1]));

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    Math.PI / 4,
    canvas.width / canvas.height
  );
  vec3.set(0, 0, 4, camera.localPosition);

  const pointLight = new PointLight();

  scene.add(new AmbientLight([1, 1, 1], 0.1), pointLight, sphere, lightBulb);

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

    vec3.set(
      Math.sin(i / 100) * 2,
      0,
      Math.cos(i / 100) * 2,
      pointLight.localPosition
    );
    vec3.set(
      Math.sin(i / 100) * 2,
      0,
      Math.cos(i / 100) * 2,
      lightBulb.localPosition
    );
    pointLight.intensity = Math.sin(i / 75) / 2 + 0.5;

    quat.fromEuler(i / 100, 0, i / 100, 'xyz', sphere.localQuaternion);

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
});
