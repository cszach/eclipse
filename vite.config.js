import {resolve} from 'path';
import rawPlugin from 'vite-raw-plugin';

/** @type {import('vite').UserConfig} */
export default {
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Eclipse',
      fileName: 'eclipse',
    },
  },
  plugins: [
    rawPlugin({
      fileRegex: /\.wgsl$/,
    }),
  ],
};
