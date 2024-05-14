@group(0) @binding(5) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(6) var<storage, read> triangles: array<IndexedTriangle>;
@group(0) @binding(8) var<storage, read_write> bvh: array<AABB>;

@group(1) @binding(0) var<storage, read_write> scene_aabb: AABB;
// @group(1) @binding(1) var<storage, read_write> morton_codes: array<u32>;

fn expand_bits(x: u32) -> u32 {
    var v = (x * 0x00010001u) & 0xFF0000FFu;

    v = (v * 0x00000101u) & 0x0F00F00Fu;
    v = (v * 0x00000011u) & 0xC30C30C3u;
    v = (v * 0x00000005u) & 0x49249249u;
    return v;
}

fn morton(nx: f32, ny: f32, nz: f32) -> u32 {
    let x = min(max(nx * 1024f, 0f), 1023f);
    let y = min(max(ny * 1024f, 0f), 1023f);
    let z = min(max(nz * 1024f, 0f), 1023f);

    let xx = expand_bits(u32(x));
    let yy = expand_bits(u32(y));
    let zz = expand_bits(u32(z));

    return xx * 4 + yy * 2 + zz;
}

// fn hierarchy(
//     index: u32,
//     sorted_morton_codes: ptr<storage, array<u32>>,
//     start: u32,
//     end: u32
// ) -> AABB {
//     // Construct leaf nodes
//     //     0
//     //    / \
//     //   1   2
//     //  / \ / \
//     // 3  4 5  6
//     //
//     //        <Leaves>
//     // |0|1|2|3|4|5|6|

//     let num_leaves = arrayLength(&triangles);

//     for (var i = 0; i < num_leaves; i++) {
//         var leaf: AABB;
//         leaf.object_index = i;
//     }

//     // Construct internal nodes

//     for (var i = 0; i < num_leaves - 1; i++) {

//     }

//     var aabb: AABB;
//     aabb.left_child_index = index * 2;
//     aabb.right_child_index = index * 2 + 1;

//     return aabb;
// }

fn find_middle(
    sorted_morton_codes: ptr<storage, array<u32, >>,
    start: u32,
    end: u32
) -> u32 {
    let first_morton_code = sorted_morton_codes[start];
    let last_morton_code = sorted_morton_codes[end];

    if first_morton_code == last_morton_code {
        return (start + end) >> 1;
    }

    let common_prefix = countLeadingZeros(first_morton_code ^ last_morton_code);

    var middle = start; // Initial guess
    var step = end - start;

    loop {
        step = (step + 1) >> 1;
        var new_middle = middle + step;

        if new_middle < end {
            let middle_morton_code = sorted_morton_codes[new_middle];
            let split_prefix = countLeadingZeros(first_morton_code ^ middle_morton_code);
            if split_prefix > common_prefix {
                middle = new_middle;
            }
        }

        if step > 1 {
            break;
        }
    }

    return middle;
}

fn union_aabb(a: AABB, b: AABB) -> AABB {
    var u: AABB;

    u.min = vec3f(
        min(a.min.x, b.min.x),
        min(a.min.y, b.min.y),
        min(a.min.z, b.min.z),
    );

    u.max = vec3f(
        max(a.max.x, b.max.x),
        max(a.max.y, b.max.y),
        max(a.max.z, b.max.z),
    );

    return u;
}

@compute @workgroup_size(8)
fn compute_scene_bounding_box(@builtin(global_invocation_id) thread: vec3u) {
    var i = thread.x * 512;
    let end = min(i + 512, arrayLength(&triangles));

    var min = vec3f(MAX_F32);
    var max = vec3f(MIN_F32);

    for (i = i; i < end; i++) {
        let triangle = triangles[i];

        let vertexA = vertices[triangle.x].position;
        let vertexB = vertices[triangle.y].position;
        let vertexC = vertices[triangle.z].position;

        let centroid = (vertexA + vertexB + vertexC) / 3.0;

        if min.x > centroid.x {
            min.x = centroid.x;
        }
        if min.y > centroid.y {
            min.y = centroid.y;
        }
        if min.z > centroid.z {
            min.z = centroid.z;
        }
        if max.x < centroid.x {
            max.x = centroid.x;
        }
        if max.y < centroid.y {
            max.y = centroid.y;
        }
        if max.z < centroid.z {
            max.z = centroid.z;
        }

        bvh[thread.x].min = min;
        bvh[thread.x].max = max;
    }

    for (var stride = 8u; stride > 0; stride /= 2) {
        storageBarrier();

        if thread.x < stride {
            bvh[thread.x] = union_aabb(bvh[thread.x], bvh[thread.x + stride]);
        }
    }

    storageBarrier();

    scene_aabb = bvh[0];
}

@compute @workgroup_size(8)
fn assign_morton_codes(@builtin(global_invocation_id) object: vec3u) {
    let object_index = object.x;

    if object_index >= arrayLength(&triangles) {
        return;
    }
}
