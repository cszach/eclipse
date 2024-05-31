struct Vertex {
  position: vec3f,
  normal: vec3f,
  uv: vec2f,
  material_index: f32,
}

struct Triangle {
  indices: vec3u,
  matrix_index: u32,
}

struct Material {
  color: vec3f,
  shininess: f32,
  specular: vec3f,
  type_id: f32,
}

struct Ray {
  origin: vec3f,
  direction: vec3f,
}

struct AABB {
  min: vec3f,
  max: vec3f,
  left_child_index: u32,
  right_child_index: u32,
  object_index: u32,
}

struct SceneStats {
  meshes: u32,
  vertices: u32,
  triangles: u32,
  lights: u32,
}
