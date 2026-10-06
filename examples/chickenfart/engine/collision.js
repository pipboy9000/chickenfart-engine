const epsilon = 1e-6; // Tolerance for floating point comparisons

const STATIC_INVERT_KEYS = new Set([
    "AABB:rhombus",
    "circle:AABB",
    "circle:rhombus",
    "AABB:ellipse",
    "circle:ellipse",
    "rhombus:ellipse"
]);

const DYNAMIC_INVERT_KEYS = new Set([
    "rhombus:rhombus",
    "rhombus:circle",
    "ellipse:ellipse",
    "ellipse:rhombus",
    "ellipse:AABB",
    "ellipse:circle"
]);

const DYNAMIC_GRID_CELL_SIZE = 30;
const STATIC_GRID_CELL_SIZE = 30;
const ELLIPSE_APPROX_SEGMENTS = 20;

let staticWallGridCache = null;

const STATIC_MTV_HANDLERS = {
    "rhombus:circle": (entity, wall) => getRhombusCircleMtv(wall, {
        ...getEntityCircle(entity)
    }, wall.scaleY),
    "rhombus:AABB": (entity, wall) => getRhombusAabbMtv(wall, entToAABB(entity)),
    "rhombus:rhombus": (entity, wall) => getRhombusRhombusMtv(wall, getEntityRhombus(entity)),
    "rhombus:ellipse": (entity, wall) => getEllipseRhombusMtv(getEntityEllipse(entity), wall),

    "AABB:circle": (entity, wall) => getCircleAABBMtv(
        getEntityCircle(entity).x,
        getEntityCircle(entity).y,
        getEntityCircle(entity).r,
        wall
    ),
    "AABB:AABB": (entity, wall) => getAabbAabbMtv(entToAABB(entity), wall),
    "AABB:rhombus": (entity, wall) => getRhombusAabbMtv(getEntityRhombus(entity), wall),
    "AABB:ellipse": (entity, wall) => getEllipseAabbMtv(getEntityEllipse(entity), wall),

    "circle:circle": (entity, wall) => getCircleCircleMtv(
        { x: wall.x, y: wall.y, r: wall.rad },
        getEntityCircle(entity)
    ),
    "circle:AABB": (entity, wall) => getCircleAABBMtv(wall.x, wall.y, wall.rad, entToAABB(entity)),
    "circle:rhombus": (entity, wall) => {
        const rhombus = getEntityRhombus(entity);
        return getRhombusCircleMtv(rhombus, { x: wall.x, y: wall.y, r: wall.rad }, rhombus.scaleY);
    },
    "circle:ellipse": (entity, wall) => getEllipseCircleMtv(
        getEntityEllipse(entity),
        { x: wall.x, y: wall.y, r: wall.rad }
    ),

    "ellipse:circle": (entity, wall) => getEllipseCircleMtv(
        wall,
        getEntityCircle(entity)
    ),
    "ellipse:AABB": (entity, wall) => getEllipseAabbMtv(wall, entToAABB(entity)),
    "ellipse:rhombus": (entity, wall) => getEllipseRhombusMtv(wall, getEntityRhombus(entity)),
    "ellipse:ellipse": (entity, wall) => getEllipseEllipseMtv(wall, getEntityEllipse(entity))
};

const DYNAMIC_MTV_HANDLERS = {
    "rhombus:rhombus": (ent1, ent2) => getRhombusRhombusMtv(getEntityRhombus(ent1), getEntityRhombus(ent2)),
    "rhombus:circle": (ent1, ent2) => {
        const rhombus = getEntityRhombus(ent1);
        return getRhombusCircleMtv(rhombus, getEntityCircle(ent2), rhombus.scaleY);
    },
    "circle:rhombus": (ent1, ent2) => {
        const rhombus = getEntityRhombus(ent2);
        return getRhombusCircleMtv(rhombus, getEntityCircle(ent1), rhombus.scaleY);
    },
    "rhombus:AABB": (ent1, ent2) => getRhombusAabbMtv(getEntityRhombus(ent1), entToAABB(ent2)),
    "AABB:rhombus": (ent1, ent2) => getRhombusAabbMtv(getEntityRhombus(ent2), entToAABB(ent1)),
    "rhombus:ellipse": (ent1, ent2) => getEllipseRhombusMtv(getEntityEllipse(ent2), getEntityRhombus(ent1)),
    "ellipse:rhombus": (ent1, ent2) => getEllipseRhombusMtv(getEntityEllipse(ent1), getEntityRhombus(ent2)),
    "circle:AABB": (ent1, ent2) => getCircleAABBMtv(
        getEntityCircle(ent1).x,
        getEntityCircle(ent1).y,
        getEntityCircle(ent1).r,
        entToAABB(ent2)
    ),
    "circle:circle": (ent1, ent2) => getCircleCircleMtv(
        getEntityCircle(ent2),
        getEntityCircle(ent1)
    ),
    "circle:ellipse": (ent1, ent2) => getEllipseCircleMtv(
        getEntityEllipse(ent2),
        getEntityCircle(ent1)
    ),
    "ellipse:circle": (ent1, ent2) => getEllipseCircleMtv(
        getEntityEllipse(ent1),
        getEntityCircle(ent2)
    ),
    "AABB:AABB": (ent1, ent2) => getAabbAabbMtv(entToAABB(ent1), entToAABB(ent2)),
    "AABB:ellipse": (ent1, ent2) => getEllipseAabbMtv(getEntityEllipse(ent2), entToAABB(ent1)),
    "ellipse:AABB": (ent1, ent2) => getEllipseAabbMtv(getEntityEllipse(ent1), entToAABB(ent2)),
    "ellipse:ellipse": (ent1, ent2) => getEllipseEllipseMtv(getEntityEllipse(ent1), getEntityEllipse(ent2))
};

function resolveStaticMtv(entity, wall) {
    const key = `${wall.type}:${entity.collision.type}`;
    const handler = STATIC_MTV_HANDLERS[key];
    if (!handler) return null;
    return maybeInvertMtv(handler(entity, wall), STATIC_INVERT_KEYS.has(key));
}

function resolveDynamicMtv(ent1, ent2) {
    const key = `${ent1.collision.type}:${ent2.collision.type}`;
    const handler = DYNAMIC_MTV_HANDLERS[key];
    if (!handler) return null;
    return maybeInvertMtv(handler(ent1, ent2), DYNAMIC_INVERT_KEYS.has(key));
}

function maybeInvertMtv(mtv, shouldInvert) {
    if (!mtv || !shouldInvert) return mtv;
    return {
        ...mtv,
        x: -mtv.x,
        y: -mtv.y
    };
}

/**
 * Resolves overlaps between dynamic entities and static walls, pushing entities out
 * and firing `onCollision` on both sides. Uses a static-wall grid broadphase.
 * Called once per frame by `world.js`.
 */
export function stepStaticCollisions(entities, walls) {
    const wallGrid = getStaticWallGrid(walls, STATIC_GRID_CELL_SIZE);

    for (let entity of entities) {
        if (!entity?.collision || !entity.collisionEnabled) continue;

        const candidateWallIndices = getStaticCollisionCandidateIndices(entity, wallGrid, STATIC_GRID_CELL_SIZE);
        const wallsToCheck = candidateWallIndices && candidateWallIndices.length > 0
            ? candidateWallIndices.map(wallIdx => walls[wallIdx])
            : walls;

        for (const wall of wallsToCheck) {
            const mtv = resolveStaticMtv(entity, wall);
            if (mtv !== null) {
                entity.x += mtv.x;
                entity.y += mtv.y;
                if (entity.onCollision) {
                    entity.onCollision(wall.entity);
                }
                if (wall.entity.onCollision) {
                    wall.entity.onCollision(entity);
                }
            }
        }
    }
}

function getStaticWallGrid(walls, cellSize) {
    if (
        staticWallGridCache &&
        staticWallGridCache.walls === walls &&
        staticWallGridCache.cellSize === cellSize &&
        staticWallGridCache.wallCount === walls.length
    ) {
        return staticWallGridCache;
    }

    const grid = new Map();
    const unboundedWallIndices = [];

    for (let i = 0; i < walls.length; i++) {
        const wall = walls[i];
        const bounds = getWallBroadphaseBounds(wall);

        if (!bounds) {
            unboundedWallIndices.push(i);
            continue;
        }

        const minCellX = Math.floor(bounds.left / cellSize);
        const maxCellX = Math.floor(bounds.right / cellSize);
        const minCellY = Math.floor(bounds.top / cellSize);
        const maxCellY = Math.floor(bounds.bottom / cellSize);

        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                const key = `${cellX},${cellY}`;
                let bucket = grid.get(key);
                if (!bucket) {
                    bucket = [];
                    grid.set(key, bucket);
                }

                bucket.push(i);
            }
        }
    }

    staticWallGridCache = {
        walls,
        cellSize,
        wallCount: walls.length,
        grid,
        unboundedWallIndices
    };

    return staticWallGridCache;
}

function getStaticCollisionCandidateIndices(entity, wallGridData, cellSize) {
    const bounds = getEntityBroadphaseBounds(entity);
    if (!bounds) return null;

    const candidateWallIndices = new Set(wallGridData.unboundedWallIndices);
    const minCellX = Math.floor(bounds.left / cellSize);
    const maxCellX = Math.floor(bounds.right / cellSize);
    const minCellY = Math.floor(bounds.top / cellSize);
    const maxCellY = Math.floor(bounds.bottom / cellSize);

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
            const key = `${cellX},${cellY}`;
            const bucket = wallGridData.grid.get(key);
            if (!bucket) continue;

            for (const wallIdx of bucket) {
                candidateWallIndices.add(wallIdx);
            }
        }
    }

    return Array.from(candidateWallIndices).sort((a, b) => a - b);
}

/**
 * Resolves overlaps between pairs of dynamic entities, pushing both apart and firing
 * `onCollision` on each. Uses a uniform-grid broadphase to limit narrow-phase checks.
 * Called once per frame by `world.js`.
 */
export function stepCollisions(entities) {
    const candidatePairs = getDynamicCollisionCandidates(entities, DYNAMIC_GRID_CELL_SIZE);

    for (const [idxA, idxB] of candidatePairs) {
        const entA = entities[idxA];
        const entB = entities[idxB];

        resolveAndApplyDynamicCollision(entA, entB);
        resolveAndApplyDynamicCollision(entB, entA);
    }
}

function resolveAndApplyDynamicCollision(ent1, ent2) {

    const mtv = resolveDynamicMtv(ent1, ent2);
    if (!mtv) return;

    ent1.x += mtv.x / 2;
    ent1.y += mtv.y / 2;
    ent2.x -= mtv.x / 2;
    ent2.y -= mtv.y / 2;

    if (ent1.onCollision) {
        ent1.onCollision(ent2);
    }
    if (ent2.onCollision) {
        ent2.onCollision(ent1);
    }
}

function getDynamicCollisionCandidates(entities, cellSize) {
    const grid = new Map();
    const pairKeys = new Set();
    const candidates = [];

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (!entity?.collision || !entity.collisionEnabled) continue;

        const bounds = getEntityBroadphaseBounds(entity);
        if (!bounds) continue;

        const minCellX = Math.floor(bounds.left / cellSize);
        const maxCellX = Math.floor(bounds.right / cellSize);
        const minCellY = Math.floor(bounds.top / cellSize);
        const maxCellY = Math.floor(bounds.bottom / cellSize);

        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                const key = `${cellX},${cellY}`;
                let bucket = grid.get(key);
                if (!bucket) {
                    bucket = [];
                    grid.set(key, bucket);
                }

                for (const otherIdx of bucket) {
                    const a = Math.min(i, otherIdx);
                    const b = Math.max(i, otherIdx);
                    const pairKey = `${a}:${b}`;
                    if (!pairKeys.has(pairKey)) {
                        pairKeys.add(pairKey);
                        candidates.push([a, b]);
                    }
                }

                bucket.push(i);
            }
        }
    }

    return candidates;
}

function getEntityBroadphaseBounds(entity) {
    switch (entity.collision?.type) {
        case "AABB":
            return entToAABB(entity);
        case "circle": {
            const circle = getEntityCircle(entity);
            return {
                left: circle.x - circle.r,
                top: circle.y - circle.r,
                right: circle.x + circle.r,
                bottom: circle.y + circle.r
            };
        }
        case "ellipse":
            return getEllipseBounds(getEntityEllipse(entity));
        case "rhombus": {
            const rhombus = getEntityRhombus(entity);
            const corners = getRhombusCorners(
                rhombus.cx,
                rhombus.cy,
                rhombus.width,
                rhombus.height,
                rhombus.rotation,
                rhombus.scaleY ?? 0.5
            );

            let left = Infinity;
            let top = Infinity;
            let right = -Infinity;
            let bottom = -Infinity;

            for (const corner of corners) {
                if (corner.x < left) left = corner.x;
                if (corner.x > right) right = corner.x;
                if (corner.y < top) top = corner.y;
                if (corner.y > bottom) bottom = corner.y;
            }

            return { left, top, right, bottom };
        }
        default:
            return null;
    }
}

function getWallBroadphaseBounds(wall) {
    switch (wall?.type) {
        case "AABB":
            return {
                left: wall.left,
                top: wall.top,
                right: wall.right,
                bottom: wall.bottom
            };
        case "circle":
            return {
                left: wall.x - wall.rad,
                top: wall.y - wall.rad,
                right: wall.x + wall.rad,
                bottom: wall.y + wall.rad
            };
        case "ellipse":
            return getEllipseBounds(wall);
        case "rhombus": {
            const corners = getRhombusCorners(
                wall.cx,
                wall.cy,
                wall.width,
                wall.height,
                wall.rotation,
                wall.scaleY ?? 0.5
            );

            let left = Infinity;
            let top = Infinity;
            let right = -Infinity;
            let bottom = -Infinity;

            for (const corner of corners) {
                if (corner.x < left) left = corner.x;
                if (corner.x > right) right = corner.x;
                if (corner.y < top) top = corner.y;
                if (corner.y > bottom) bottom = corner.y;
            }

            return { left, top, right, bottom };
        }
        default:
            return null;
    }
}

function getCircleCircleMtv(c1, c2) {
    // 1. Calculate the vector between the centers (d)
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;

    // 2. Calculate the distance squared and the required minimum distance squared
    const distanceSq = dx * dx + dy * dy;
    const radiiSum = c1.r + c2.r;
    const radiiSumSq = radiiSum * radiiSum;

    // 3. Check for separation (no collision)
    if (distanceSq >= radiiSumSq) {
        return null; // No collision
    }

    // 4. Collision detected. Calculate properties.
    const distance = Math.sqrt(distanceSq);
    const overlapDepth = radiiSum - distance;

    // Special Case: Perfectly overlapping centers (distance is 0)
    if (distance === 0) {
        // If distance is zero, pick an arbitrary separation axis (e.g., horizontal)
        const totalPush = radiiSum;
        return {
            x: totalPush,
            y: 0,
            depth: totalPush,
            normalX: 1, // Arbitrary normal (positive X)
            normalY: 0
        };
    }

    // 5. Calculate the collision normal (unit vector from c1 to c2)
    const normalX = dx / distance;
    const normalY = dy / distance;

    // 6. Calculate the total separation vector (MTV) needed
    // The vector to push c1 AWAY from c2 is -normal * overlapDepth
    // The vector to push c2 AWAY from c1 is normal * overlapDepth

    // We will return the total vector, which is the normal multiplied by the overlap depth.
    // The direction of the push for each circle must be handled by the caller.

    return {
        // The total vector components needed to push them apart
        x: normalX * overlapDepth,
        y: normalY * overlapDepth,
        // The magnitude of the overlap
        depth: overlapDepth,
        // The unit vector defining the axis of collision
        normalX: normalX,
        normalY: normalY
    };
}

function getCircleAABBMtv(cx, cy, r, aabb) {
    // --- 1. Find the Closest Point on the AABB to the Circle's Center ---

    // Clamp the circle's center to the AABB's boundaries.
    const closestX = Math.max(aabb.left, Math.min(cx, aabb.right));
    const closestY = Math.max(aabb.top, Math.min(cy, aabb.bottom));

    // --- 2. Calculate Distance from Circle Center to Closest Point ---

    const dx = closestX - cx;
    const dy = closestY - cy;

    const distanceSq = dx * dx + dy * dy;

    // --- 3. Check for Collision ---

    // Collision occurs if the distance squared is less than the radius squared.
    if (distanceSq >= r * r) {
        return null; // No collision
    }

    // --- 4. Calculate MTV (Separation Vector) ---

    let mtv = { x: 0, y: 0, depth: 0 };

    if (distanceSq === 0) {
        // Special Case: Circle Center is INSIDE the AABB

        // Calculate the overlap to all four edges
        const dL = cx - aabb.left;
        const dR = aabb.right - cx;
        const dT = cy - aabb.top;
        const dB = aabb.bottom - cy;

        // Find the minimum distance to an edge
        const minH = Math.min(dL, dR);
        const minV = Math.min(dT, dB);
        const minEdgeDist = Math.min(minH, minV);

        // The MTV depth is the radius plus the distance from the center to the closest edge.
        mtv.depth = r + minEdgeDist;

        // Determine the shortest exit axis and direction
        if (minH < minV) {
            // Push horizontally
            mtv.x = (dL < dR ? mtv.depth : -mtv.depth);
            mtv.y = 0;
        } else {
            // Push vertically
            mtv.x = 0;
            mtv.y = (dT < dB ? mtv.depth : -mtv.depth);
        }

    } else {
        // Standard Case: Closest point is on an edge or corner

        const distance = Math.sqrt(distanceSq);
        const overlap = r - distance;
        mtv.depth = overlap;

        // The MTV direction is the unit vector of the distance vector,
        // scaled by the overlap, and pointing AWAY from the AABB.

        // Unit vector of the collision normal (N)
        const normalX = dx / distance;
        const normalY = dy / distance;

        // MTV vector = -N * overlap (we want to push the circle OUT)
        mtv.x = -normalX * overlap;
        mtv.y = -normalY * overlap;
    }

    return mtv;
}

/**
 * Computes the minimum translation vector to separate two axis-aligned boxes, or `null` if they don't overlap.
 * @param {{left:number,right:number,top:number,bottom:number}} boxA
 * @param {{left:number,right:number,top:number,bottom:number}} boxB
 */
export function getAabbAabbMtv(boxA, boxB) {
    // 1. Calculate the distance between centers and the sum of half-extents

    // Horizontal distance between centers (signed)
    const distanceX = (boxA.left + boxA.right) / 2 - (boxB.left + boxB.right) / 2;
    // Vertical distance between centers (signed)
    const distanceY = (boxA.top + boxA.bottom) / 2 - (boxB.top + boxB.bottom) / 2;

    // Sum of half-widths
    const minSeparationX = (boxA.right - boxA.left) / 2 + (boxB.right - boxB.left) / 2;
    // Sum of half-heights
    const minSeparationY = (boxA.bottom - boxA.top) / 2 + (boxB.bottom - boxB.top) / 2;

    // 2. Calculate the overlap depth
    // Overlap = minSeparation - |distance|
    const overlapX = minSeparationX - Math.abs(distanceX);
    const overlapY = minSeparationY - Math.abs(distanceY);

    // --- Broad Phase Collision Check ---
    // If overlap is zero or negative on either axis, there is NO collision.
    if (overlapX <= 0 || overlapY <= 0) {
        return null;
    }

    // 3. Determine the Minimum Translation Vector (MTV)
    let mtv = { x: 0, y: 0 };

    // The MTV is the *smaller* of the two overlaps
    if (overlapX < overlapY) {
        // Separation must happen on the X-axis

        // Push direction is determined by the sign of the center distance
        const signX = Math.sign(distanceX);

        mtv.x = overlapX * signX;
        mtv.y = 0; // No separation needed on the Y-axis
    } else {
        // Separation must happen on the Y-axis (or both are equal)

        const signY = Math.sign(distanceY);

        mtv.x = 0; // No separation needed on the X-axis
        mtv.y = overlapY * signY;
    }

    return mtv;
}

/**
 * Tests a circle (x, y, r) against all walls and entities, returning an array of
 * `{ entity, x, y }` overlaps (x/y being the push-out vector for that collision).
 * Used for things like explosion radii or attack hitboxes rather than physical movement.
 */
export function checkCircleCollision(x, y, r, walls, entities, excludedEntity = null) {
    let collisions = [];

    for (let wall of walls) {
        let mtv = null;
        switch (wall.type) {
            case "AABB":
                mtv = getCircleAABBMtv(x, y, r, wall);
                break;
            case "circle":
                mtv = getCircleCircleMtv(
                    { x: wall.x, y: wall.y, r: wall.rad },
                    { x, y, r }
                );
                break;
            case "rhombus":
                mtv = getRhombusCircleMtv(wall, { x, y, r }, wall.scaleY);
                break;
            case "ellipse":
                mtv = getEllipseCircleMtv(wall, { x, y, r });
                break;
        }
        if (mtv) {
            collisions.push({ entity: wall.entity, x: mtv.x, y: mtv.y });
        }
    }

    //check entities
    for (let entity of entities) {
        if (entity.collision && entity.collisionEnabled && entity !== excludedEntity) {
            switch (entity.collision.type) {
                case "circle": {
                    let mtv = getCircleCircleMtv({ x, y, r }, getEntityCircle(entity));

                    if (mtv !== null) {
                        collisions.push({ entity, x: mtv.x, y: mtv.y });
                    }
                }
                    break;

                case "AABB": {
                    let aabb = entToAABB(entity);

                    let mtv = getCircleAABBMtv(x, y, r, aabb);
                    if (mtv !== null) {
                        collisions.push({ entity, x: mtv.x, y: mtv.y });
                    }
                }
                    break;

                case "rhombus": {
                    const rhombus = getEntityRhombus(entity);

                    let mtv = getRhombusCircleMtv(rhombus, { x, y, r }, rhombus.scaleY);
                    if (mtv !== null) {
                        collisions.push({ entity, x: mtv.x, y: mtv.y });
                    }
                }
                    break;

                case "ellipse": {
                    const ellipse = getEntityEllipse(entity);

                    let mtv = getEllipseCircleMtv(ellipse, { x, y, r });
                    if (mtv !== null) {
                        collisions.push({ entity, x: mtv.x, y: mtv.y });
                    }
                }
                    break;
            }
        }
    }

    return collisions;
}

/**
 * Finds the closest hit of a line segment (p1 -> p2) against walls and entities.
 * Useful for raycasts such as projectiles or line-of-sight checks.
 * @returns {{hit: boolean, t: number, hitPoint: ({x:number,y:number}|null), entity?: object}}
 */
export function checkSegmentCollision(p1, p2, excludedEntity, walls, entities) {
    let closestHit = {
        hit: false,
        t: 1.0, // Initialize t_min to the segment end (t=1.0)
        hitPoint: null,
    };

    //check walls
    for (const wall of walls) {
        switch (wall.type) {
            case "AABB": {
                const currentHit = lineSegmentAABBIntersection(p1, p2, wall);
                if (currentHit.hit && currentHit.t < closestHit.t) {
                    closestHit.hit = true;
                    closestHit.t = currentHit.t;
                    closestHit.hitPoint = currentHit.hitPoint;
                    closestHit.entity = wall.entity;
                }
            }
                break;
            case "circle": {
                const currentHit = lineSegmentCircleIntersection(p1, p2, { x: wall.x, y: wall.y, r: wall.rad });
                if (currentHit.hit && currentHit.t < closestHit.t) {
                    closestHit.hit = true;
                    closestHit.t = currentHit.t;
                    closestHit.hitPoint = currentHit.hitPoint;
                    closestHit.entity = wall.entity;
                }
            }
                break;
            case "rhombus": {
                const rhombus = wall;
                const currentHit = lineSegmentRhombusIntersection(p1, p2, rhombus);
                if (currentHit.hit && currentHit.t < closestHit.t) {
                    closestHit.hit = true;
                    closestHit.t = currentHit.t;
                    closestHit.hitPoint = currentHit.hitPoint;
                    closestHit.entity = wall.entity;
                }
            }
                break;
            case "ellipse": {
                const currentHit = lineSegmentEllipseIntersection(p1, p2, wall);
                if (currentHit.hit && currentHit.t < closestHit.t) {
                    closestHit.hit = true;
                    closestHit.t = currentHit.t;
                    closestHit.hitPoint = currentHit.hitPoint;
                    closestHit.entity = wall.entity;
                }
            }
                break;
        }
    }

    //check entities
    for (const ent of entities) {
        if (ent != excludedEntity && ent.collision && ent.collisionEnabled) {
            switch (ent.collision.type) {
                case "circle": {
                    const currentHit = lineSegmentCircleIntersection(p1, p2, getEntityCircle(ent, true));
                    if (currentHit.hit && currentHit.t < closestHit.t) {
                        closestHit.hit = true;
                        closestHit.t = currentHit.t;
                        closestHit.hitPoint = currentHit.hitPoint;
                        closestHit.entity = ent;
                    }
                }
                    break;
                case "AABB": {
                    let aabb = entToAABB(ent);
                    const currentHit = lineSegmentAABBIntersection(p1, p2, aabb);
                    if (currentHit.hit && currentHit.t < closestHit.t) {
                        closestHit.hit = true;
                        closestHit.t = currentHit.t;
                        closestHit.hitPoint = currentHit.hitPoint;
                        closestHit.entity = ent;
                    }
                }
                    break;
                case "rhombus": {
                    const rhombus = getEntityRhombus(ent, true);
                    const currentHit = lineSegmentRhombusIntersection(p1, p2, rhombus);
                    if (currentHit.hit && currentHit.t < closestHit.t) {
                        closestHit.hit = true;
                        closestHit.t = currentHit.t;
                        closestHit.hitPoint = currentHit.hitPoint;
                        closestHit.entity = ent;
                    }
                }
                    break;

                case "ellipse": {
                    const ellipse = getEntityEllipse(ent, true);
                    const currentHit = lineSegmentEllipseIntersection(p1, p2, ellipse);
                    if (currentHit.hit && currentHit.t < closestHit.t) {
                        closestHit.hit = true;
                        closestHit.t = currentHit.t;
                        closestHit.hitPoint = currentHit.hitPoint;
                        closestHit.entity = ent;
                    }
                }
                    break;
            }
        }
    }

    //this is used by entity.hit
    if (closestHit.hit) {
        closestHit.x = (closestHit.hitPoint.x - closestHit.entity.x) * -1;
        closestHit.y = (closestHit.hitPoint.y - closestHit.entity.y) * -1;
    }

    return closestHit;
}

function lineSegmentRhombusIntersection(p1, p2, rhombus) {
    const resolvedScaleY = rhombus.scaleY ?? 0.5;

    // Un-squash the segment for intersection tests in rhombus local space.
    const p1Unsquashed = {
        x: p1.x,
        y: rhombus.cy + (p1.y - rhombus.cy) / resolvedScaleY
    };
    const p2Unsquashed = {
        x: p2.x,
        y: rhombus.cy + (p2.y - rhombus.cy) / resolvedScaleY
    };

    // Transform segment into rhombus local space
    const cos = Math.cos(-rhombus.rotation);
    const sin = Math.sin(-rhombus.rotation);
    // Local segment points
    const lp1 = {
        x: (p1Unsquashed.x - rhombus.cx) * cos - (p1Unsquashed.y - rhombus.cy) * sin,
        y: (p1Unsquashed.x - rhombus.cx) * sin + (p1Unsquashed.y - rhombus.cy) * cos
    };
    const lp2 = {
        x: (p2Unsquashed.x - rhombus.cx) * cos - (p2Unsquashed.y - rhombus.cy) * sin,
        y: (p2Unsquashed.x - rhombus.cx) * sin + (p2Unsquashed.y - rhombus.cy) * cos
    };
    // Slab method for AABB in local space
    const dx = lp2.x - lp1.x;
    const dy = lp2.y - lp1.y;
    let tmin = 0, tmax = 1;
    const hw = rhombus.width / 2;
    const hh = rhombus.height / 2;
    // X slab
    if (Math.abs(dx) < epsilon) {
        if (lp1.x < -hw || lp1.x > hw) return { hit: false };
    } else {
        let tx1 = (-hw - lp1.x) / dx;
        let tx2 = (hw - lp1.x) / dx;
        let t1 = Math.min(tx1, tx2);
        let t2 = Math.max(tx1, tx2);
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
    }
    // Y slab
    if (Math.abs(dy) < epsilon) {
        if (lp1.y < -hh || lp1.y > hh) return { hit: false };
    } else {
        let ty1 = (-hh - lp1.y) / dy;
        let ty2 = (hh - lp1.y) / dy;
        let t1 = Math.min(ty1, ty2);
        let t2 = Math.max(ty1, ty2);
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
    }
    if (tmax < tmin || tmax < 0 || tmin > 1) return { hit: false };
    // Intersection point in local space
    const t_hit = tmin >= 0 ? tmin : tmax;
    const hitLocal = {
        x: lp1.x + (lp2.x - lp1.x) * t_hit,
        y: lp1.y + (lp2.y - lp1.y) * t_hit
    };
    // Transform back to world space
    const cosR = Math.cos(rhombus.rotation);
    const sinR = Math.sin(rhombus.rotation);
    const hitWorldUnsquashed = {
        x: rhombus.cx + hitLocal.x * cosR - hitLocal.y * sinR,
        y: rhombus.cy + hitLocal.x * sinR + hitLocal.y * cosR
    };
    const hitWorld = {
        x: hitWorldUnsquashed.x,
        y: rhombus.cy + (hitWorldUnsquashed.y - rhombus.cy) * resolvedScaleY
    };
    return { hit: true, t: t_hit, hitPoint: hitWorld };
}

function lineSegmentEllipseIntersection(p1, p2, ellipse) {
    const cos = Math.cos(-(ellipse.rotation || 0));
    const sin = Math.sin(-(ellipse.rotation || 0));

    const toLocal = point => {
        const dx = point.x - ellipse.cx;
        const dy = point.y - ellipse.cy;
        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    };

    const p1Local = toLocal(p1);
    const p2Local = toLocal(p2);
    const d = { x: p2Local.x - p1Local.x, y: p2Local.y - p1Local.y };

    const rxSq = ellipse.rx * ellipse.rx;
    const rySq = ellipse.ry * ellipse.ry;

    const A = (d.x * d.x) / rxSq + (d.y * d.y) / rySq;
    const B = (2 * p1Local.x * d.x) / rxSq + (2 * p1Local.y * d.y) / rySq;
    const C = (p1Local.x * p1Local.x) / rxSq + (p1Local.y * p1Local.y) / rySq - 1;

    if (Math.abs(A) < epsilon) {
        if (C <= 0) {
            return { hit: true, t: 0, hitPoint: { x: p1.x, y: p1.y } };
        }
        return { hit: false };
    }

    const discriminant = B * B - 4 * A * C;
    if (discriminant < 0) return { hit: false };

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-B - sqrtDisc) / (2 * A);
    const t2 = (-B + sqrtDisc) / (2 * A);

    let t = Infinity;
    if (t1 >= 0 && t1 <= 1) t = Math.min(t, t1);
    if (t2 >= 0 && t2 <= 1) t = Math.min(t, t2);

    if (t === Infinity) return { hit: false };

    return {
        hit: true,
        t,
        hitPoint: {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        }
    };
}

function lineSegmentCircleIntersection(p1, p2, circle) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // M = P1 - C (Vector from Circle center to P1)
    const M = { x: p1.x - circle.x, y: p1.y - circle.y };
    // D = P2 - P1 (Segment vector)
    const D = { x: dx, y: dy };

    // Quadratic equation terms: At^2 + Bt + C = 0
    const A = D.x * D.x + D.y * D.y; // D dot D
    const B = 2 * (M.x * D.x + M.y * D.y); // 2 * (M dot D)
    const C = M.x * M.x + M.y * M.y - circle.r * circle.r; // M dot M - R^2

    // If A is zero, P1 and P2 are the same point (A=0).
    if (Math.abs(A) < epsilon) {
        // Check if P1 is inside or on the edge of the circle
        if (C <= 0) {
            return { hit: true, t: 0, hitPoint: p1, entity: circle, type: "circle" };
        }
        return { hit: false };
    }

    // Calculate Discriminant (Delta)
    const discriminant = B * B - 4 * A * C;

    // No real intersection points (line misses the circle entirely)
    if (discriminant < 0) return { hit: false };

    // Find the two possible t values
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-B - sqrtDisc) / (2 * A);
    const t2 = (-B + sqrtDisc) / (2 * A);

    // Find the smallest non-negative t (first time the line enters the circle)
    let t_min = Math.min(t1, t2);

    // If the first calculated intersection point is behind P1 (t < 0),
    // the second intersection point (t_max) might be the exit point of the segment
    // if P1 is inside the circle.
    if (t_min < 0) {
        t_min = Math.max(t1, t2);
    }

    // Collision must happen on the segment (0 <= t <= 1)
    if (t_min >= 0 && t_min <= 1.0) {
        const hitPointX = p1.x + t_min * D.x;
        const hitPointY = p1.y + t_min * D.y;

        return {
            hit: true,
            t: t_min,
            hitPoint: { x: hitPointX, y: hitPointY },
            entity: circle,
            type: "circle"
        };
    }

    return { hit: false };
}

function lineSegmentAABBIntersection(p1, p2, wall) {
    let t_min = 0.0;
    let t_max = 1.0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // --- Check X-axis slab ---
    // Now using aabb.left and aabb.right directly
    const bboxMinX = wall.left;
    const bboxMaxX = wall.right;

    if (Math.abs(dx) < epsilon) {
        // Segment is parallel to the X-axis slabs (vertical).
        if (p1.x < bboxMinX || p1.x > bboxMaxX) return { hit: false };
    } else {
        let t1 = (bboxMinX - p1.x) / dx;
        let t2 = (bboxMaxX - p1.x) / dx;

        let nearT = Math.min(t1, t2);
        let farT = Math.max(t1, t2);

        // Update t_min (earliest entry) and t_max (latest exit)
        t_min = Math.max(t_min, nearT);
        t_max = Math.min(t_max, farT);
    }

    // If entry time is past exit time, no intersection possible.
    if (t_min > t_max) return { hit: false };

    // --- Check Y-axis slab ---
    // Now using aabb.top and aabb.bottom directly
    const bboxMinY = wall.top;
    const bboxMaxY = wall.bottom;

    if (Math.abs(dy) < epsilon) {
        // Segment is parallel to the Y-axis slabs (horizontal).
        if (p1.y < bboxMinY || p1.y > bboxMaxY) return { hit: false };
    } else {
        let t1 = (bboxMinY - p1.y) / dy;
        let t2 = (bboxMaxY - p1.y) / dy;

        let nearT = Math.min(t1, t2);
        let farT = Math.max(t1, t2);

        // Update t_min (earliest entry) and t_max (latest exit)
        t_min = Math.max(t_min, nearT);
        t_max = Math.min(t_max, farT);
    }

    // Final check:
    if (t_min <= t_max && t_min >= 0.0 && t_min <= 1.0) {
        // Collision confirmed! Calculate the exact hit point.
        const hitPointX = p1.x + t_min * dx;
        const hitPointY = p1.y + t_min * dy;

        return {
            hit: true,
            t: t_min,
            hitPoint: { x: hitPointX, y: hitPointY }
        };
    }

    return { hit: false };
}

//get an AABB obj from entity collision
function entToAABB(entity) {
    if (!entity.collision || entity.collision.type != "AABB") return false;
    return {
        left: entity.x + entity.collision.x * entity.scale,
        top: entity.y + entity.collision.y * entity.scale,
        right: entity.x + entity.collision.x * entity.scale + entity.collision.width * entity.scale,
        bottom: entity.y + entity.collision.y * entity.scale + entity.collision.height * entity.scale
    };
}

function getEllipseBounds(ellipse) {
    const rot = ellipse.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    const halfW = Math.sqrt(ellipse.rx * ellipse.rx * cos * cos + ellipse.ry * ellipse.ry * sin * sin);
    const halfH = Math.sqrt(ellipse.rx * ellipse.rx * sin * sin + ellipse.ry * ellipse.ry * cos * cos);

    return {
        left: ellipse.cx - halfW,
        top: ellipse.cy - halfH,
        right: ellipse.cx + halfW,
        bottom: ellipse.cy + halfH
    };
}

function getEllipsePoints(ellipse, segments = ELLIPSE_APPROX_SEGMENTS) {
    const points = [];
    const rot = ellipse.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const localX = Math.cos(t) * ellipse.rx;
        const localY = Math.sin(t) * ellipse.ry;
        points.push({
            x: ellipse.cx + localX * cos - localY * sin,
            y: ellipse.cy + localX * sin + localY * cos
        });
    }

    return points;
}

function getCirclePoints(circle, segments = ELLIPSE_APPROX_SEGMENTS) {
    const points = [];
    for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        points.push({
            x: circle.x + Math.cos(t) * circle.r,
            y: circle.y + Math.sin(t) * circle.r
        });
    }
    return points;
}

function getAabbPoints(aabb) {
    return [
        { x: aabb.left, y: aabb.top },
        { x: aabb.right, y: aabb.top },
        { x: aabb.right, y: aabb.bottom },
        { x: aabb.left, y: aabb.bottom }
    ];
}

function getPolygonCenter(points) {
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
}

function getPolygonAxes(points) {
    const axes = [];
    for (let i = 0; i < points.length; i++) {
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        const edge = { x: next.x - curr.x, y: next.y - curr.y };
        axes.push(normalize({ x: -edge.y, y: edge.x }));
    }
    return axes;
}

function getPolygonPolygonMtv(pointsA, pointsB) {
    const axes = [...getPolygonAxes(pointsA), ...getPolygonAxes(pointsB)];
    const centerA = getPolygonCenter(pointsA);
    const centerB = getPolygonCenter(pointsB);

    let minOverlap = Infinity;
    let mtvAxis = null;

    for (const axis of axes) {
        const projA = projectOntoAxis(pointsA, axis);
        const projB = projectOntoAxis(pointsB, axis);
        const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

        if (overlap <= 0) return null;

        if (overlap < minOverlap) {
            minOverlap = overlap;
            mtvAxis = axis;
        }
    }

    const centerDelta = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };
    if (centerDelta.x * mtvAxis.x + centerDelta.y * mtvAxis.y < 0) {
        mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
    }

    return {
        x: mtvAxis.x * minOverlap,
        y: mtvAxis.y * minOverlap,
        depth: minOverlap,
        normalX: mtvAxis.x,
        normalY: mtvAxis.y
    };
}

function getEllipseCircleMtv(ellipse, circle) {
    return getPolygonPolygonMtv(getEllipsePoints(ellipse), getCirclePoints(circle));
}

function getEllipseAabbMtv(ellipse, aabb) {
    return getPolygonPolygonMtv(getEllipsePoints(ellipse), getAabbPoints(aabb));
}

function getEllipseRhombusMtv(ellipse, rhombus) {
    const rhombusPoints = getRhombusCorners(
        rhombus.cx,
        rhombus.cy,
        rhombus.width,
        rhombus.height,
        rhombus.rotation,
        rhombus.scaleY ?? 0.5
    );
    return getPolygonPolygonMtv(getEllipsePoints(ellipse), rhombusPoints);
}

function getEllipseEllipseMtv(ellipseA, ellipseB) {
    return getPolygonPolygonMtv(getEllipsePoints(ellipseA), getEllipsePoints(ellipseB));
}

// --- Rhombus Collision Utilities ---

// Helper: Get rhombus corners in world space
function getRhombusCorners(cx, cy, width, height, rotation, scaleY = 1) {
    const hw = width / 2;
    const hh = height / 2;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    // Corners relative to center
    const corners = [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh }
    ];
    // Rotate and translate
    return corners.map(c => ({
        x: cx + c.x * cos - c.y * sin,
        y: cy + (c.x * sin + c.y * cos) * scaleY
    }));
}

// Helper: Project points onto axis
function projectOntoAxis(points, axis) {
    let min = Infinity, max = -Infinity;
    for (const p of points) {
        const proj = p.x * axis.x + p.y * axis.y;
        if (proj < min) min = proj;
        if (proj > max) max = proj;
    }
    return { min, max };
}

// Helper: Normalize a vector
function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

// Rhombus vs Rhombus collision (SAT)
function getRhombusRhombusMtv(rhombusA, rhombusB) {
    const aCorners = getRhombusCorners(
        rhombusA.cx,
        rhombusA.cy,
        rhombusA.width,
        rhombusA.height,
        rhombusA.rotation,
        rhombusA.scaleY ?? 0.5
    );
    const bCorners = getRhombusCorners(
        rhombusB.cx,
        rhombusB.cy,
        rhombusB.width,
        rhombusB.height,
        rhombusB.rotation,
        rhombusB.scaleY ?? 0.5
    );
    // Axes: normals of each edge (4 from A, 4 from B)
    const axes = [];
    for (let i = 0; i < 4; i++) {
        // A's edges
        let edgeA = {
            x: aCorners[(i + 1) % 4].x - aCorners[i].x,
            y: aCorners[(i + 1) % 4].y - aCorners[i].y
        };
        axes.push(normalize({ x: -edgeA.y, y: edgeA.x }));
        // B's edges
        let edgeB = {
            x: bCorners[(i + 1) % 4].x - bCorners[i].x,
            y: bCorners[(i + 1) % 4].y - bCorners[i].y
        };
        axes.push(normalize({ x: -edgeB.y, y: edgeB.x }));
    }
    let minOverlap = Infinity;
    let mtvAxis = null;
    for (const axis of axes) {
        const projA = projectOntoAxis(aCorners, axis);
        const projB = projectOntoAxis(bCorners, axis);
        const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
        if (overlap <= 0) return null; // Separating axis found
        if (overlap < minOverlap) {
            minOverlap = overlap;
            mtvAxis = axis;
        }
    }
    // MTV direction: from A to B in the same (potentially scaleY-adjusted) space.
    const centerA = aCorners.reduce((acc, c) => ({ x: acc.x + c.x / 4, y: acc.y + c.y / 4 }), { x: 0, y: 0 });
    const centerB = bCorners.reduce((acc, c) => ({ x: acc.x + c.x / 4, y: acc.y + c.y / 4 }), { x: 0, y: 0 });
    const d = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };
    if (d.x * mtvAxis.x + d.y * mtvAxis.y < 0) {
        mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
    }
    return { x: mtvAxis.x * minOverlap, y: mtvAxis.y * minOverlap, depth: minOverlap, normalX: mtvAxis.x, normalY: mtvAxis.y };
}

// Rhombus vs Circle collision
function getRhombusCircleMtv(rhombus, circle, scaleY = 0.5) {
    const resolvedScaleY = scaleY ?? rhombus.scaleY ?? 0.5;
    const rhombusPoints = getRhombusCorners(
        rhombus.cx,
        rhombus.cy,
        rhombus.width,
        rhombus.height,
        rhombus.rotation,
        resolvedScaleY
    );

    return getPolygonPolygonMtv(rhombusPoints, getCirclePoints(circle));
}

// Rhombus vs AABB: treat AABB as rhombus with rotation 0
function getRhombusAabbMtv(rhombus, aabb) {
    const aabbRhombus = {
        cx: (aabb.left + aabb.right) / 2,
        cy: (aabb.top + aabb.bottom) / 2,
        width: aabb.right - aabb.left,
        height: aabb.bottom - aabb.top,
        rotation: 0,
        scaleY: 1
    };
    return getRhombusRhombusMtv(rhombus, aabbRhombus);
}

function getEntityCircle(entity, includeZ = false) {
    const scale = entity.scale || 1;
    const zOffset = includeZ ? (entity.z || 0) : 0;
    const collision = entity.collision || {};

    return {
        x: entity.x + (collision.offsetX || 0) * scale,
        y: entity.y + (collision.offsetY || 0) * scale - zOffset,
        r: (collision.rad || 0) * scale
    };
}

function getEntityEllipse(entity, includeZ = false) {
    const scale = entity.scale || 1;
    const zOffset = includeZ ? (entity.z || 0) : 0;
    const collision = entity.collision || {};
    const rx = Math.max(epsilon, (collision.rx ?? collision.radX ?? collision.radiusX ?? collision.rad ?? 0) * scale);
    const ry = Math.max(epsilon, (collision.ry ?? collision.radY ?? collision.radiusY ?? collision.rad ?? 0) * scale);

    return {
        cx: entity.x + (collision.offsetX || 0) * scale,
        cy: entity.y + (collision.offsetY || 0) * scale - zOffset,
        rx,
        ry,
        rotation: collision.rotation || 0
    };
}

/** Builds the world-space rhombus collision shape (`cx, cy, width, height, rotation, scaleY`) for an entity, scaled and offset per its `collision` config. */
export function getEntityRhombus(entity, includeZ = false) {
    const scale = entity.scale || 1;
    const zOffset = includeZ ? (entity.z || 0) : 0;
    return {
        cx: entity.x + (entity.collision.offsetX || 0) * scale,
        cy: entity.y + (entity.collision.offsetY || 0) * scale - zOffset,
        width: entity.collision.width * scale,
        height: entity.collision.height * scale,
        rotation: entity.collision.rotation || 0,
        scaleY: entity.collision.scaleY ?? 0.5
    };
}

/** Returns the 4 corner points of a rhombus, applying `scaleY` to flatten it for isometric-style shapes. */
export function getScaledRhombusCorners(cx, cy, width, height, rotation, scaleY = 0.5) {
    return getRhombusCorners(cx, cy, width, height, rotation, scaleY);
}

// --- Point hit-testing (used for click/tap detection) ---

function isPointInAABB(px, py, aabb) {
    return px >= aabb.left && px <= aabb.right && py >= aabb.top && py <= aabb.bottom;
}

function isPointInCircle(px, py, circle) {
    const dx = px - circle.x;
    const dy = py - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
}

function isPointInEllipse(px, py, ellipse) {
    const rot = ellipse.rotation || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const dx = px - ellipse.cx;
    const dy = py - ellipse.cy;
    // rotate the point into the ellipse's local (unrotated) space
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    return (localX * localX) / (ellipse.rx * ellipse.rx) + (localY * localY) / (ellipse.ry * ellipse.ry) <= 1;
}

function isPointInConvexPolygon(px, py, points) {
    let sign = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
        if (cross !== 0) {
            const currSign = cross > 0 ? 1 : -1;
            if (sign === 0) sign = currSign;
            else if (sign !== currSign) return false;
        }
    }
    return true;
}

/** Tests whether world point (px, py) lies inside a dynamic entity's collision shape. */
export function isPointInEntityCollision(entity, px, py) {
    if (!entity.collision) return false;

    switch (entity.collision.type) {
        case "AABB":
            return isPointInAABB(px, py, entToAABB(entity));
        case "circle":
            return isPointInCircle(px, py, getEntityCircle(entity));
        case "ellipse":
            return isPointInEllipse(px, py, getEntityEllipse(entity));
        case "rhombus": {
            const rhombus = getEntityRhombus(entity);
            return isPointInConvexPolygon(px, py, getRhombusCorners(rhombus.cx, rhombus.cy, rhombus.width, rhombus.height, rhombus.rotation, rhombus.scaleY));
        }
        default:
            return false;
    }
}

/** Tests whether world point (px, py) lies inside a static wall's collision shape (as produced by `world.addStaticEntity`). */
export function isPointInWall(wall, px, py) {
    switch (wall.type) {
        case "AABB":
            return isPointInAABB(px, py, wall);
        case "circle":
            return isPointInCircle(px, py, wall);
        case "ellipse":
            return isPointInEllipse(px, py, { cx: wall.cx, cy: wall.cy, rx: wall.rx, ry: wall.ry, rotation: wall.rotation });
        case "rhombus":
            return isPointInConvexPolygon(px, py, getRhombusCorners(wall.cx, wall.cy, wall.width, wall.height, wall.rotation, wall.scaleY));
        default:
            return false;
    }
}
