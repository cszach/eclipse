struct Light {
  position: vec3f,
  intensity: f32,
  color: vec3f,
  typeId: f32,
}

struct Material {
  color: vec3f,
  typeId: f32,
  specular: vec3f,
  shininess: f32
}

struct VertexInput {
  @location(1) position: vec3f,
  @location(2) normal: vec3f,
  @location(3) uv: vec2f,
  @location(4) materialIndex: f32,
}

@group(0) @binding(0) var<uniform> modelViewProjectionMatrix: mat4x4f;
@group(0) @binding(1) var<storage, read> materials: array<Material>;
@group(0) @binding(2) var<storage, read> lights: array<Light>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @interpolate(flat) @location(3) materialIndex: f32
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = modelViewProjectionMatrix * vec4f(input.position, 1);
  output.normal = input.normal;
  output.uv = input.uv;
  output.materialIndex = input.materialIndex;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let material = materials[u32(input.materialIndex)];

  switch u32(material.typeId) {
    case 1: {
      return solid_color(material.color);
    }
    case 2: {
      return blinn_phong(material.color, &lights);
    }
    default: {
      return vec4f();
    }
  }
}

