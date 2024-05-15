struct Light {
  position: vec3f,
  intensity: f32,
  color: vec3f,
  type_id: f32,
}

struct Material {
  color: vec3f,
  shininess: f32,
  specular: vec3f,
  type_id: f32,
}

struct VertexInput {
  @location(1) position: vec3f,
  @location(2) normal: vec3f,
  @location(3) uv: vec2f,
  @location(4) material_index: f32,
}

@group(0) @binding(0) var<uniform> view_projection_matrix: mat4x4f;
@group(0) @binding(1) var<uniform> camera_position: vec3f;
@group(0) @binding(2) var<storage, read> materials: array<Material>;
@group(0) @binding(3) var<storage, read> lights: array<Light>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @interpolate(flat) @location(3) material_index: f32,
  @location(4) worldPosition: vec3f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = view_projection_matrix * vec4f(input.position, 1);
  output.normal = input.normal;
  output.uv = input.uv;
  output.material_index = input.material_index;
  output.worldPosition = input.position;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let material = materials[u32(input.material_index)];

  switch u32(material.type_id) {
    case 1: { // Solid color
      return vec4f(material.color, 1);
    }
    case 2: {
      return blinn_phong(material, input, &lights, camera_position);
    }
    default: {
      return vec4f();
    }
  }
}

