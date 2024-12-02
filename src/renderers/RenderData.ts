import {Camera} from '../cameras/Camera.js';
import {SceneStats} from '../primitives/Scene.js';
import {Renderer} from './Renderer.js';
import {ViewportData} from './utils/ViewportUtils.js';
import {SceneData} from './utils/SceneUtils.js';

type RenderData = {
  readonly device: GPUDevice;
  readonly canvas: HTMLCanvasElement;
  readonly frameCount: number;
  readonly camera: Camera;
  readonly scene: SceneData;
  readonly sceneStats: SceneStats;
  readonly renderer: Renderer;
  readonly viewport: ViewportData;
  readonly sceneChanged: boolean;
};

export {RenderData};
