fn expandBits(x: u32) -> u32 {
  var v = (x * 0x00010001u) & 0xFF0000FFu;

  v = (v * 0x00000101u) & 0x0F00F00Fu;
  v = (v * 0x00000011u) & 0xC30C30C3u;
  v = (v * 0x00000005u) & 0x49249249u;
  return v;
}

fn mortonCode(normalized_coordinates: vec3f) -> u32 {
  let x = min(max(normalized_coordinates.x * 1024f, 0f), 1023f);
  let y = min(max(normalized_coordinates.y * 1024f, 0f), 1023f);
  let z = min(max(normalized_coordinates.z * 1024f, 0f), 1023f);

  let expanded_x = expandBits(u32(x));
  let expanded_y = expandBits(u32(y));
  let expanded_z = expandBits(u32(z));

  return expanded_x * 4 + expanded_y * 2 + expanded_z;
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

fn findMiddle(
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

fn unionAabb(a: AABB, b: AABB) -> AABB {
  var u: AABB;
  u.min = min(a.min, b.min);
  u.max = max(a.max, b.max);

  return u;
}

@compute @workgroup_size(64)
fn assignMortonCodes(
  @builtin(global_invocation_id) gid: vec3u,
  @builtin(local_invocation_id) lid: vec3u,
  @builtin(num_workgroups) num_workgroups: vec3u,
) {
  var i = gid.x * 512;
  let end = min(i + 512, scene_stats.triangles);

  var aabb: AABB;
  aabb.min = vec3f(MAX_F32);
  aabb.max = vec3f(MIN_F32);

  for (i = i; i < end; i++) {
    let triangle = triangles[i];
    let world_matrix = world_matrices[i];

    let vertexA = (world_matrix * vec4f(vertices[triangle.indices.x].position, 1)).xyz;
    let vertexB = (world_matrix * vec4f(vertices[triangle.indices.y].position, 1)).xyz;
    let vertexC = (world_matrix * vec4f(vertices[triangle.indices.z].position, 1)).xyz;

    let centroid = (vertexA + vertexB + vertexC) / 3.0;

    aabb.min = min(aabb.min, centroid);
    aabb.max = max(aabb.max, centroid);
  }

  bvh[gid.x] = aabb;

  // Combine results in the workgroup using parallel reduction
  for (var stride = 32u; stride > 0; stride /= 2) {
    workgroupBarrier();

    if lid.x < stride {
      bvh[gid.x] = unionAabb(bvh[gid.x], bvh[gid.x + stride]);
    }
  }

  // Combine results from all workgroups
  storageBarrier();

  var scene_aabb: AABB;

  if gid.x == 0 {
    aabb.min = vec3f(MAX_F32);
    aabb.max = vec3f(MIN_F32);

    for (i = 0; i < num_workgroups.x; i++) {
      aabb = unionAabb(aabb, bvh[i * 64]);
    }

    scene_aabb = aabb;
  }

  // Assign morton codes
  storageBarrier();

  i = gid.x * 512;
  let scene_aabb_size = aabb.max - aabb.min;

  for (i = i; i < end; i++) {
    let triangle = triangles[i];
    let world_matrix = world_matrices[i];

    let vertexA = (world_matrix * vec4f(vertices[triangle.indices.x].position, 1)).xyz;
    let vertexB = (world_matrix * vec4f(vertices[triangle.indices.y].position, 1)).xyz;
    let vertexC = (world_matrix * vec4f(vertices[triangle.indices.z].position, 1)).xyz;

    let centroid = (vertexA + vertexB + vertexC) / 3.0 + abs(scene_aabb.min);

    let morton_code = mortonCode(centroid / scene_aabb_size);
  }
}
