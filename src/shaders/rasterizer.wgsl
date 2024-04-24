struct VertexInput {
  @location(1) position: vec3f,
  @location(2) normal: vec3f,
  @location(3) uv: vec2f,
  @location(4) materialIndex: f32,
}

@group(0) @binding(0) var<uniform> modelViewProjectionMatrix: mat4x4f;
@group(0) @binding(1) var<storage, read> materials: array<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @interpolate(flat) @location(1) materialIndex: f32
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = modelViewProjectionMatrix * vec4f(input.position, 1);
  output.materialIndex = input.materialIndex;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let material = vec3f(
    materials[u32(input.materialIndex) * 3 + 0],
    materials[u32(input.materialIndex) * 3 + 1],
    materials[u32(input.materialIndex) * 3 + 2],
  );

  return vec4f(material, 1);
}
