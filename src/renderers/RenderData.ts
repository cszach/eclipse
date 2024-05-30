import {Camera} from '../cameras/exports.js';
import {SceneStats} from '../primitives/exports.js';
import {Renderer, ViewportData} from './exports.js';
import {SceneData} from './utils/exports.js';

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
