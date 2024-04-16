import {hello} from '../../src/index';

if (!navigator.gpu) throw Error('WebGPU not supported.');

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw Error("Couldn't request WebGPU adapter.");

const device = await adapter.requestDevice();
if (!device) throw Error("Couldn't request WebGPU logical device.");
else {
  hello();
}
