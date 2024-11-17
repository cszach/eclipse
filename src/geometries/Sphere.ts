import {Geometry} from './Geometry.js';

class Sphere extends Geometry {
  readonly radius: number;
  readonly widthSegments: number;
  readonly heightSegments: number;

  constructor(radius: number, widthSegments = 32, heightSegments = 16) {
    super();

    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;

    const vertices = new Float32Array(
      3 * this.widthSegments * (this.heightSegments + 1)
    );
    const normals = new Float32Array(
      3 * this.widthSegments * (this.heightSegments + 1)
    );

    for (let height = 0; height < heightSegments + 1; height++) {
      for (let width = 0; width < widthSegments; width++) {
        const normalizedWidth = width / widthSegments;
        const normalizedHeight = height / heightSegments;

        const theta = Math.PI * normalizedHeight;
        const phi = Math.PI * 2 * normalizedWidth;

        // Parametric equation of a sphere:
        // x = x0 + r * sin(t) * cos(p)
        // y = y0 + r * cos(t)
        // z = z0 + r * sin(t) * sin(p)
        const unit_x = Math.sin(theta) * Math.cos(phi);
        const unit_y = Math.cos(theta);
        const unit_z = Math.sin(theta) * Math.sin(phi);

        const index = width + height * widthSegments;
        vertices[index * 3 + 0] = radius * unit_x;
        vertices[index * 3 + 1] = radius * unit_y;
        vertices[index * 3 + 2] = radius * unit_z;

        normals[index * 3 + 0] = unit_x;
        normals[index * 3 + 1] = unit_y;
        normals[index * 3 + 2] = unit_z;
      }
    }

    // Index (widthSegments=3, heightSegments=2):
    //
    // 0-1-2-0
    // |/|/|/|
    // 3-4-5-3   <--- UV sphere when stretched into a rectangle
    // |/|/|/|        (numbers are in place of vertices)
    // 6-7-8-6
    const indices = new Uint32Array(3 * 2 * widthSegments * heightSegments);

    for (let height = 0; height < heightSegments; height++) {
      for (let width = 0; width < widthSegments; width++) {
        // v0-v1
        //  |/ |   <--- A quad from the stretched UV sphere above
        // v3-v2
        const v0 = width + height * widthSegments;
        const v1 = ((width + 1) % widthSegments) + height * widthSegments;
        const v2 = ((width + 1) % widthSegments) + (height + 1) * widthSegments;
        const v3 = width + (height + 1) * widthSegments;

        const offset = (width + height * widthSegments) * 6;

        // Front-facing faces have their vertices in counter-clockwise order
        indices[offset + 0] = v0;
        indices[offset + 1] = v3;
        indices[offset + 2] = v1;
        indices[offset + 3] = v1;
        indices[offset + 4] = v3;
        indices[offset + 5] = v2;
      }
    }

    this.setVertices(vertices);
    this.setIndices(indices);
    this.setVertexNormals(normals);
  }
}

export {Sphere};
