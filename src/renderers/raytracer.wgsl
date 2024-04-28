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

struct Vertex {
  position: vec3f,
  normal: vec3f,
  uv: vec2f,
  materialIndex: f32,
}

alias IndexedTriangle = vec3u;

struct Material {
  color: vec3f,
  shininess: f32,
  specular: vec3f,
  typeId: f32,
}

struct Ray {
  origin: vec3f,
  direction: vec3f,
}

struct HitRecord {
  t: f32,
  position: vec3f,
  normal: vec3f,
  materialIndex: f32,
}


@group(0) @binding(0) var<uniform> frame_dimensions: vec2u;
@group(0) @binding(1) var<storage, read_write> frame_buffer: array<vec3f>;
@group(0) @binding(2) var<uniform> frame: u32;
@group(0) @binding(3) var<uniform> camera_position: vec3f;
@group(0) @binding(4) var<uniform> viewport: Viewport;
@group(0) @binding(5) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(6) var<storage, read> triangles: array<IndexedTriangle>;
@group(0) @binding(7) var<storage, read> materials: array<Material>;

const WORKGROUP_SIZE = 8;

@compute @workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn computeMain(@builtin(global_invocation_id) pixel: vec3u) {
    // The frame (canvas) dimensions may not be divisble by workgroup size, and
    // thus the workgroup count is rounded up. This may result in extra pixels,
    // so return if a pixel is outside of the frame.
    if pixel.x >= frame_dimensions.x || pixel.y >= frame_dimensions.y {
        return;
    }

    const NUM_SAMPLES = 8u;
    var seed = initRng(pixel.xy, frame_dimensions, frame);
    var color = vec3f(0);

    for (var sample = 0u; sample < NUM_SAMPLES; sample++) {
        var ray = ray(pixel.xy, &seed);
        var attenuation = vec3f(1);

        for (var bounce = 0u; bounce < 6u; bounce++) {
            var hit = false;
            var t_min = MAX_F32;
            var hit_record: HitRecord;
            var a: vec3f;
            var isLight = false;

            for (var i = 0u; i < arrayLength(&triangles); i++) {
                if ray_intersects_triangle(ray, triangles[i], &hit_record) && hit_record.t < t_min && dot(hit_record.normal, ray.direction) > 0 {
                    hit = true;
                    t_min = hit_record.t;
                    a = materials[u32(hit_record.materialIndex)].color;
                    isLight = materials[u32(hit_record.materialIndex)].typeId == 1;
                }
            }

            if hit {
                if isLight {
                    attenuation = vec3f(10);
                } else {
                    attenuation *= a;
                    ray = Ray(hit_record.position, randomInHemisphere(hit_record.normal, &seed));
                }
            } else {
                let unit_direction = normalize(ray.direction);
                let a = 0.5 * (unit_direction.y + 1.0);
                let c = (1.0 - a) * vec3f(1) + a * vec3f(0.5, 0.7, 1.0);
                // let c = vec3f(0);

                attenuation = c * attenuation;
                break;
            }
        }

        color += attenuation;
    }

    color /= f32(NUM_SAMPLES);

    let frame_buffer_index = pixel.x + pixel.y * frame_dimensions.x;

    frame_buffer[frame_buffer_index] += color;
}

fn ray(pixel: vec2u, seed_ptr: ptr<function, u32>) -> Ray {
    let pixel_center = viewport.origin + f32(pixel.x) * viewport.du + f32(pixel.y) * viewport.dv;
    let pixel_sample = pixel_center + randomInPixel(seed_ptr);

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

    if t > EPSILON {
        (*hit_record_ptr).t = t;
        (*hit_record_ptr).position = ray.origin + ray.direction * t;
        (*hit_record_ptr).normal = vertices[triangle.x].normal;
        (*hit_record_ptr).materialIndex = vertices[triangle.x].materialIndex;
        return true;
    }

    return false;
}
