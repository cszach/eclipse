@group(0) @binding(6) var<storage, read> triangles: array<IndexedTriangle>;

@group(1) @binding(0) var<storage, read_write> scene_aabb: AABB;
@group(1) @binding(1) var<storage, read_write> morton_codes: array<u32>;

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

@compute @workgroup_size(8)
fn assign_morton_codes(@builtin(global_invocation_id) object: vec3u) {
    let object_index = object.x;

    if object_index >= arrayLength(&triangles) {
        return;
    }
}
