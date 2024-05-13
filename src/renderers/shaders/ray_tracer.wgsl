const EPSILON = 0.00001;
const MAX_F32 = 0x1.fffffep+127;

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
  materialIndex: f32,
}

@group(0) @binding(0) var<uniform> resolution: vec2u;
@group(0) @binding(1) var<storage, read_write> frame_buffer: array<vec3f>;
@group(0) @binding(2) var<uniform> frame_count: u32;
@group(0) @binding(3) var<uniform> camera_position: vec3f;
@group(0) @binding(4) var<uniform> viewport: Viewport;
@group(0) @binding(5) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(6) var<storage, read> triangles: array<IndexedTriangle>;
@group(0) @binding(7) var<storage, read> materials: array<Material>;
@group(0) @binding(8) var<storage, read_write> bvh: array<AABB>;

const NUM_PIXEL_SAMPLES = 1u;

@compute @workgroup_size(8, 8)
fn ray_trace(@builtin(global_invocation_id) pixel: vec3u) {
    // The frame (canvas) dimensions may not be divisble by workgroup size, and
    // thus the workgroup count is rounded up. This may result in extra pixels,
    // so return if a pixel is outside of the frame.
    if pixel.x >= resolution.x || pixel.y >= resolution.y {
        return;
    }

    var seed = init_rng(pixel.xy, resolution, frame_count);
    var color = vec3f(0);
    var sample = 0u;

    for (sample = 0u; sample < NUM_PIXEL_SAMPLES; sample++) {
        var ray = ray(pixel.xy, &seed);
        var attenuation = vec3f(1);

        for (var bounce = 0u; bounce < 12u; bounce++) {
            var hit = false;
            var hit_record: HitRecord;
            var closest_hit: HitRecord;
            closest_hit.t = MAX_F32;

            for (var i = 0u; i < arrayLength(&triangles); i++) {
                if ray_intersects_triangle(ray, triangles[i], &hit_record) && hit_record.t < closest_hit.t && dot(hit_record.normal, ray.direction) < 0 {
                    hit = true;
                    closest_hit = hit_record;
                }
            }

            let material = materials[u32(closest_hit.materialIndex)];

            if hit {
                if material.typeId == 1 { // Solid color
                    attenuation = vec3f(10) * material.color;
                    break;
                } else if material.typeId == 4 { // Metal
                    attenuation *= material.color;
                    ray = Ray(closest_hit.position, reflect(ray.direction, closest_hit.normal) + material.shininess * random_unit_vector(&seed));
                } else { // Lambert
                    attenuation *= material.color;
                    ray = Ray(closest_hit.position, random_in_hemisphere(closest_hit.normal, &seed));
                }
            } else {
                let unit_direction = normalize(ray.direction);
                let a = 0.5 * (unit_direction.y + 1.0);
                let c = (1.0 - a) * vec3f(1) + a * vec3f(0.5, 0.7, 1.0);

                attenuation = c * attenuation;
                break;
            }
        }

        color += attenuation;
    }

    color /= f32(sample);

    let frame_buffer_index = pixel.x + pixel.y * resolution.x;

    frame_buffer[frame_buffer_index] += color;
}

fn ray(pixel: vec2u, seed_ptr: ptr<function, u32>) -> Ray {
    let pixel_center = viewport.origin + f32(pixel.x) * viewport.du + f32(pixel.y) * viewport.dv;
    let pixel_sample = pixel_center + random_in_pixel(seed_ptr);

    return Ray(camera_position, pixel_sample - camera_position);
}

fn ray_intersects_triangle(
    ray: Ray,
    triangle: IndexedTriangle,
    hit_record_ptr: ptr<function, HitRecord>
) -> bool {
    let edge1 = vertices[triangle.y].position - vertices[triangle.x].position;
    let edge2 = vertices[triangle.z].position - vertices[triangle.x].position;
    let ray_cross_edge2 = cross(ray.direction, edge2);
    let determinant = dot(edge1, ray_cross_edge2);

    // Check if the ray is parallel to the triangle
    if determinant > -EPSILON && determinant < EPSILON {
        return false;
    }

    let determinant_inverse = 1.0 / determinant;
    let s = ray.origin - vertices[triangle.x].position;
    let u = determinant_inverse * dot(s, ray_cross_edge2);

    if u < 0 || u > 1 {
        return false;
    }

    let s_cross_edge1 = cross(s, edge1);
    let v = determinant_inverse * dot(ray.direction, s_cross_edge1);

    if v < 0 || u + v > 1 {
        return false;
    }

    let t = determinant_inverse * dot(edge2, s_cross_edge1);

    if t > EPSILON { // Hit
        // Interpolate surface normal

        let na = vertices[triangle.x].normal;
        let nb = vertices[triangle.y].normal;
        let nc = vertices[triangle.z].normal;
        let surface_normal = u * na + v * nb + (1 - u - v) * nc;

        (*hit_record_ptr).t = t;
        (*hit_record_ptr).position = ray.origin + ray.direction * t;
        (*hit_record_ptr).normal = surface_normal;
        (*hit_record_ptr).materialIndex = vertices[triangle.x].materialIndex;
        return true;
    }

    return false;
}
