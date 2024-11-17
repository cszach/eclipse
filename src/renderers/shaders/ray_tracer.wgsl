struct Viewport {
  // Viewport:
  //       du
  // (0, 0)------->U
  //    dv|       |
  //      |       |
  //      v-------x
  //      V
  origin: vec3<f32>, // The location of pixel (0, 0) in 3D space
  du: vec3<f32>,     // The distance between 2 neighbor pixels on the U axis
  dv: vec3<f32>,     // The distance between 2 neighbor pixels on the V axis
}

struct HitRecord {
  t: f32,
  position: vec3f,
  normal: vec3f,
  uv: vec2f,
  material_index: f32,
}

const NUM_PIXEL_SAMPLES = 8u;

@compute @workgroup_size(8, 8)
fn rayTrace(@builtin(global_invocation_id) pixel: vec3u) {
  // The frame (canvas) dimensions may not be divisble by workgroup size, and
  // thus the workgroup count is rounded up. This may result in extra pixels,
  // so return if a pixel is outside of the frame.
  if pixel.x >= resolution.x || pixel.y >= resolution.y {
    return;
  }

  var seed = initRng(pixel.xy, resolution, frame_count);
  var color = vec3f(0);
  var sample: u32;

  for (sample = 0u; sample < NUM_PIXEL_SAMPLES; sample++) {
    var ray = ray(pixel.xy, &seed);
    var attenuation = vec3f(1);

    for (var bounce = 0u; bounce < 12u; bounce++) {
      var hit = false;
      var hit_record: HitRecord;
      var closest_hit: HitRecord;
      closest_hit.t = MAX_F32;

      for (var i = 0u; i < scene_stats.triangles; i++) {
        if rayIntersectsTriangle(ray, triangles[i], &hit_record)
          && hit_record.t < closest_hit.t
          && dot(hit_record.normal, ray.direction) < 0 {
          hit = true;
          closest_hit = hit_record;
        }
      }

      let material = materials[u32(closest_hit.material_index)];
      var material_color = material.color;

      if (material.color_map_index != -1) {
        material_color = textureLoad(texture_atlas,
          vec2(
            u32(closest_hit.uv.x * material.color_map_width + material.color_map_x),
            u32((1 - closest_hit.uv.y) * material.color_map_height + material.color_map_y)), 0).xyz;
        // material_color = vec3f(closest_hit.uv, 0);
      }

      if hit {
        if material.type_id == 1 { // Solid color
          attenuation = vec3f(1) * material_color;
          break;
        } else if material.type_id == 4 { // Metal
          attenuation *= material_color;
          ray = Ray(
            closest_hit.position,
            reflect(ray.direction, closest_hit.normal)
              + material.shininess * randomUnitVector(&seed)
          );
        } else { // Lambert
          attenuation *= material_color;
          ray = Ray(
            closest_hit.position,
            randomInHemisphere(closest_hit.normal, &seed)
          );
        }
      } else {
        let unit_direction = normalize(ray.direction);
        let a = 0.5 * (unit_direction.y + 1.0);
        let c = (1.0 - a) * vec3f(1) + a * vec3f(0.5, 0.7, 1.0);
        // let c = (1.0 - a) * vec3f(33. / 255., 25. / 255., 202. / 255.) + a * vec3f(154. / 255., 45. / 255., 184. / 255.);
        // let c = (1.0 - a) * vec3f(51. / 255., 51. / 255., 153. / 255.) + a * vec3f(128. / 255., 0. / 255., 128. / 255.);
        // let c = vec3f(0);
  // const cube1 = new Mesh(new Box(0.5, 0.5, 0.5), new Metal([33 / 255, 25 / 255, 202 / 255], 0.05));
  // const cube2 = new Mesh(new Box(0.12, 0.4, 0.5), new Metal([154 / 255, 45 / 255, 184 / 255], 0.07));

        attenuation = c * attenuation;
        break;
      }
    }

    color += attenuation;
  }

  color /= f32(sample);
  color = pow(color, vec3f(1. / 2.2));

  let frame_buffer_index = pixel.x + pixel.y * resolution.x;

  frame_buffer[frame_buffer_index] += color;
}

// Generates a ray from the camera to the pixel in the virtual viewport, given
// the pixel's UV coordinates.
fn ray(pixel: vec2u, seed_ptr: ptr<function, u32>) -> Ray {
  let pixel_center = viewport.origin + f32(pixel.x) * viewport.du + f32(pixel.y) * viewport.dv;
  let pixel_sample = pixel_center + randomInPixel(seed_ptr);

  return Ray(camera_position, pixel_sample - camera_position);
}

// Ray-triangle intersection test using the Möller-Trumbore algorithm. The
// result of the intersection, if hit, is written into the provided hit record.
fn rayIntersectsTriangle(
  ray: Ray,
  triangle: Triangle,
  hit_record_ptr: ptr<function, HitRecord>
) -> bool {
  let indices = triangle.indices;
  let world_matrix = world_matrices[triangle.matrix_index];
  let normal_matrix = normal_matrices[triangle.matrix_index];

  let point1 = (world_matrix * vec4f(vertices[indices.x].position, 1)).xyz;
  let point2 = (world_matrix * vec4f(vertices[indices.y].position, 1)).xyz;
  let point3 = (world_matrix * vec4f(vertices[indices.z].position, 1)).xyz;

  let edge1 = point2 - point1;
  let edge2 = point3 - point1;
  let ray_cross_edge2 = cross(ray.direction, edge2);
  let determinant = dot(edge1, ray_cross_edge2);

  // Check if the ray is parallel to the triangle
  if determinant > -EPSILON && determinant < EPSILON {
    return false;
  }

  let determinant_inverse = 1.0 / determinant;
  let s = ray.origin - point1;
  let u = determinant_inverse * dot(s, ray_cross_edge2);

  if u < 0 || u > 1 {
    return false;
  }

  let s_cross_edge1 = cross(s, edge1);
  let v = determinant_inverse * dot(ray.direction, s_cross_edge1);

  if v < 0 || u + v > 1 {
    return false;
  }

  let w = (1 - u - v);

  let t = determinant_inverse * dot(edge2, s_cross_edge1);

  if t > EPSILON { // Hit
    // Interpolate surface normal

    let na = (normal_matrix * vec4f(vertices[indices.x].normal, 0)).xyz;
    let nb = (normal_matrix * vec4f(vertices[indices.y].normal, 0)).xyz;
    let nc = (normal_matrix * vec4f(vertices[indices.z].normal, 0)).xyz;
    let surface_normal = w * na + u * nb + v * nc;

    let uva = vertices[indices.x].uv;
    let uvb = vertices[indices.y].uv;
    let uvc = vertices[indices.z].uv;

    let uv = w * uva + u * uvb + v * uvc;

    (*hit_record_ptr).t = t;
    (*hit_record_ptr).position = ray.origin + ray.direction * t;
    (*hit_record_ptr).normal = surface_normal;
    (*hit_record_ptr).uv = uv;
    (*hit_record_ptr).material_index = vertices[indices.x].material_index;
    return true;
  }

  return false;
}
