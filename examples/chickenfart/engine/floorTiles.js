
let floorTilesResources = {};
let floorTilesPath = "src/floorTiles/";

/** Sets the base URL used to resolve `<name>.png`/`<name>.json` floor tile resource pairs. */
export function configure({path} = {}) {
    if (path) {
        floorTilesPath = new URL(path, document.baseURI).href;
    }
}

/** Loads (and caches) a floor tile's image and metadata by `name`. No-op if already loaded. */
export async function loadFloorTilesResources(name) {
    if (floorTilesResources[name]) return;

    const img = new Image();

    await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = new URL(`${name}.png`, floorTilesPath).href;
    });

    const tileJson = await fetch(new URL(`${name}.json`, floorTilesPath)).then(res => res.json());

    floorTilesResources[name] = {
        img,
        width: tileJson.width,
        height: tileJson.height,
        tileSize: tileJson.tileSize
    };
}

/** Returns the cached `{ img, width, height, tileSize }` for a loaded floor tile, or `undefined`. */
export function getFloorTilesResource(name) {
    return floorTilesResources[name];
}

/** Clears the floor tile resource cache; called by `canvas.clear()` between levels. */
export function clearFloorTilesResources() {
    floorTilesResources = {};
}

/**
 * Draws all floor tile chunks with the given camera/transform, called every frame by `canvas.draw()`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} floorTiles - Tile chunks keyed by id, each with a `name` and `tiles` map.
 */
export function drawFloorTiles(
    ctx,
    floorTiles,
    camPosX,
    camPosY,
    halfWidth,
    halfHeight,
    skewX = 0,
    skewY = 0,
    scaleX = 1,
    scaleY = 1,
    translateX = 0,
    translateY = 0,
    rotation = 0
) {
    const x = -camPosX + halfWidth;
    const y = -camPosY + halfHeight;

    ctx.save();

    ctx.setTransform(
        scaleX,
        skewY,
        skewX,
        scaleY,
        x + translateX,
        y + translateY
    );

    ctx.rotate(rotation * Math.PI / 180); // Convert rotation from degrees to radians

    Object.values(floorTiles).forEach((tile) => {
        const tileResource = getFloorTilesResource(tile.name);
        if (!tileResource) return;

        const img = tileResource.img;
        const tileSize = tileResource.tileSize;

        Object.values(tile.tiles).forEach((t) => {
            ctx.drawImage(
                img,
                t.sx,
                t.sy,
                tileSize,
                tileSize,
                t.x - 1.5, // -0.5 to prevent gaps between tiles due to rounding errors
                t.y - 1.5,
                tileSize + 1.5, // +0.5 to prevent gaps between tiles due to rounding errors
                tileSize + 1.5
            );
        });
    });

    ctx.restore();
}