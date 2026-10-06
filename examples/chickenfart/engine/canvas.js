
import { drawFloorTiles, clearFloorTilesResources } from "./floorTiles.js";

export let ctx;
export let canvas;

let followSpeed = 0.01;
export let camPosX = 0;
export let camPosY = 0;

export let width, height;
export let halfWidth, halfHeight;

let targetCamPosX = 0;
let targetCamPosY = 0;

let floorTiles = []; //loaded from the level

export let worldWidth;
export let worldHeight;

let skewX = 0;
let skewY = 0;
let floorTilesScaleX = 1;
let floorTilesScaleY = 1;
let floorTilesTranslateX = 0;
let floorTilesTranslateY = 0;
let floorTilesRotation = 0;
let backgroundImage = null;
let backgroundFillColor = "black";

/** Sets the shear (in pixels) applied when rendering floor tiles, for pseudo-isometric looks. */
export function setSkew(x, y) {
    skewX = x;
    skewY = y;
}

/** Sets scale/translate/rotation applied to the floor tile layer independent of the camera. */
export function setFloorTilesTransform(scaleX = 1, scaleY = 1, translateX = 0, translateY = 0, rotation = 0) {
    floorTilesScaleX = scaleX;
    floorTilesScaleY = scaleY;
    floorTilesTranslateX = translateX;
    floorTilesTranslateY = translateY;
    floorTilesRotation = rotation;
}

let floorEntities = [];

export let canvasGeometry = {};

let viewLimits = {
    left: 0,
    right: 400,
    top: 0,
    bottom: 400
};

/**
 * Resolves the canvas element, sizes it for pixelation, and prepares the 2D context.
 * Called internally by `world.init`; not usually called directly by game code.
 * @param {object} [options]
 * @param {string|HTMLCanvasElement} [options.canvas] - Canvas element or its DOM id.
 * @param {number} [options.pixelation] - Integer downscale factor for a pixel-art look.
 */
export async function init({canvas: canvasTarget = "canvas", pixelation = 2} = {}) {

    canvas = typeof canvasTarget === "string"
        ? document.getElementById(canvasTarget)
        : canvasTarget;

    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Engine initialization requires a canvas element or canvas ID.");
    }
    
    const canvasRect = canvas.getBoundingClientRect();
    
    canvas.width = canvasRect.width /= pixelation; //scale up for pixel art
    canvas.height = canvasRect.height /= pixelation; //scale up for pixel art

    width = canvas.width;
    height = canvas.height;

    halfWidth = width / 2;
    halfHeight = height / 2;

    camPosX = halfWidth;
    camPosY = halfHeight;
    targetCamPosX = camPosX;
    targetCamPosY = camPosY;

    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false

    //canvas geometries
    const rect = canvas.getBoundingClientRect();

    // 2. Calculate and store the scaling factors and offsets
    // this is used in input.js to convert mouse coordinates to canvas coordinates - do not remove
    canvasGeometry.scaleX = canvas.width / rect.width;
    canvasGeometry.scaleY = canvas.height / rect.height;
    canvasGeometry.left = rect.left;
    canvasGeometry.top = rect.top;
}

/** Sets the world-space point the camera eases toward over time (see `setFollowSpeed`). */
export function setCamTarget(x, y) {
    targetCamPosX = x;
    targetCamPosY = y;
}

/** Immediately snaps the camera (and its follow target) to a world-space point. */
export function setCamPos(x, y) {
    camPosX = x;
    camPosY = y;
    targetCamPosX = x;
    targetCamPosY = y;
}

function moveCam() {

    const x = -camPosX + halfWidth;
    const y = -camPosY + halfHeight;

    // console.log(`Cam Pos: (${camPosX.toFixed(2)}, ${camPosY.toFixed(2)})`);

    ctx.setTransform(
        1,
        0,
        0,
        1,
        x,
        y
    );
}

/** Advances the camera toward its target (see `setCamTarget`) and clamps it to view limits. Call once per frame. */
export function update(dt) {
    camPosX += (targetCamPosX - camPosX) * followSpeed * dt;
    camPosY += (targetCamPosY - camPosY) * followSpeed * dt;

    camPosX = Math.max(camPosX, viewLimits.left + halfWidth);
    camPosX = Math.min(camPosX, viewLimits.right - halfWidth);

    camPosY = Math.max(camPosY, viewLimits.top + halfHeight);
    camPosY = Math.min(camPosY, viewLimits.bottom - halfHeight);

    moveCam();
}

/**
 * Controls how quickly the camera eases toward its target set via `setCamTarget`.
 * @param {number} speed - 0 (no movement) to 1 (instant movement to the target).
 */
export function setFollowSpeed(speed) {
    followSpeed = speed;
}

/** Registers an entity to be drawn as part of the floor layer (behind regular entities). */
export function addFloorItem(entity) {
    floorEntities.push(entity);
}

/** Adds a single floor tile chunk to the currently rendered floor tile set. */
export function addFloorTile(tile) {
    floorTiles.push(tile);
}

/** Replaces the entire floor tile set, as loaded from level JSON. */
export function setFloorTiles(tiles) {
    floorTiles = tiles;
}

/** Resets floor items/tiles and background state; called by `world.loadLevel` between levels. */
export function clear() {
    floorEntities = [];
    floorTiles = [];
    clearFloorTilesResources();
    backgroundImage = null;
    backgroundFillColor = "black";
}

/** Sets the solid background color used when no background image is set. */
export function setBackgroundFillColor(color) {
    backgroundFillColor = color;
}

/** Removes the current background image, falling back to the solid fill color. */
export function clearBackgroundImage() {
    backgroundImage = null;
}

/**
 * Loads and sets a full-screen background image.
 * @param {string} src - Image URL, or falsy to clear the background image.
 * @returns {Promise<void>} Resolves once the image has loaded.
 */
export function setBackgroundPng(src) {
    if (!src) {
        backgroundImage = null;
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            backgroundImage = img;
            resolve();
        };
        img.onerror = (err) => {
            reject(err);
        };
        img.src = src;
    });
}

function drawBackground() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, width, height);
        return;
    }

    ctx.fillStyle = backgroundFillColor;
    ctx.fillRect(0, 0, width, height);
}

/** Clears the canvas and paints the background (image or fill color). */
export function clearCanvas() {
    drawBackground();
}

/** Sets the logical world dimensions, used for the (currently unused) debug world-bounds outline. */
export function setWorldSize(width, height) {
    worldWidth = width;
    worldHeight = height;
}

/** Sets the world-space rectangle the camera is clamped within. */
export function setViewLimits({ left, right, top, bottom }) {
    viewLimits.left = left;
    viewLimits.right = right;
    viewLimits.top = top;
    viewLimits.bottom = bottom;
}

function drawBounds() {
    ctx.setTransform(1, skewY, skewX, 1, 0, 0);
    ctx.strokeStyle = "red";
    ctx.strokeRect(0, 0, worldWidth, worldHeight);
}

function drawFloorEntities() {
    floorEntities.forEach((entity) => {
        entity.draw();
    });
}

/** Renders the background, floor tiles, and floor items for the current frame. Entities themselves are drawn by `world.js`. */
export function draw() {

    clearCanvas();

    moveCam();

    drawFloorTiles(
        ctx,
        floorTiles,
        camPosX,
        camPosY,
        halfWidth,
        halfHeight,
        skewX,
        skewY,
        floorTilesScaleX,
        floorTilesScaleY,
        floorTilesTranslateX,
        floorTilesTranslateY,
        floorTilesRotation
    );

    drawFloorEntities();

    // drawBounds();
}