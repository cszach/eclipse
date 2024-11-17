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
  color_map_index: f32,
  type_id: f32,
  color_map_x: f32,
  color_map_y: f32,
  color_map_width: f32,
  color_map_height: f32,
}

struct Texture {
  top_left_x: f32,
  top_left_y: f32,
  width: f32,
  height: f32,
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
