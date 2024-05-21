import {Camera} from '../cameras/exports.js';
import {ViewportData} from './exports.js';
import {SceneData} from './utils/exports.js';

type RenderData = {
  readonly device: GPUDevice;
  readonly canvas: HTMLCanvasElement;
  readonly frameCount: number;
  readonly camera: Camera;
  readonly scene: SceneData;
  readonly viewport: ViewportData;
  readonly sceneChanged: boolean;
};

export {RenderData};
