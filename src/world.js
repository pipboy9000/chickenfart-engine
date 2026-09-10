import { addFloorItem, ctx } from "./canvas.js";
import { Entity, configure as configureEntities } from "./entitiesFactory.js";
import * as canvas from "./canvas.js";
import * as input from "./input.js";
import { configure as configureFloorTiles, loadFloorTilesResources } from "./floorTiles.js";
import {
    stepStaticCollisions,
    stepCollisions,
    checkCircleCollision as checkCircleCollisionInternal,
    checkSegmentCollision as checkSegmentCollisionInternal,
    getEntityRhombus,
    getScaledRhombusCorners,
    getAabbAabbMtv,
    isPointInEntityCollision,
    isPointInWall
} from "./collision.js";


let lastFrame = performance.now();

let entities = [];

let walls = [];

let soundObjects = [];

let drawDebug = false;

/** Finds the first active entity with a matching `tag`, or `undefined` if none exists. */
export function getEntityByTag(tag) {
    return entities.find(ent => ent.tag === tag);
}

/** Registers a `Sound` instance so its `update()` is called every frame with camera position. */
export function addSoundObject(soundObj) {
    soundObjects.push(soundObj);
}
/** Unregisters a `Sound` instance previously added with `addSoundObject`. */
export function removeSoundObject(soundObj) {
    const idx = soundObjects.indexOf(soundObj);
    if (idx !== -1) soundObjects.splice(idx, 1);
}

let paused = false;
let paths = {
    levels: "levels/",
    levelScripts: "levels/",
    entityScripts: "src/entities/",
    entityResources: "src/entities/resources/",
    floorTiles: "src/floorTiles/"
};

/**
 * Boots the engine: resolves asset paths, initializes canvas/input, and starts the game loop.
 * Must be called once before `loadLevel`.
 * @param {object} [options]
 * @param {string|HTMLCanvasElement} [options.canvas] - Canvas element or its DOM id.
 * @param {number} [options.pixelation] - Integer downscale factor for a pixel-art look.
 * @param {object} [options.paths] - Overrides for levels/levelScripts/entityScripts/entityResources/floorTiles directories.
 */
export async function init({canvas: canvasTarget = "canvas", pixelation = 2, paths: configuredPaths = {}} = {}) {

    paths = Object.fromEntries(
        Object.entries({...paths, ...configuredPaths}).map(([name, path]) => [
            name,
            new URL(path, document.baseURI).href
        ])
    );
    configureEntities({resourcesPath: paths.entityResources});
    configureFloorTiles({path: paths.floorTiles});

    await canvas.init({canvas: canvasTarget, pixelation});
    await input.init();

    window.requestAnimationFrame(gameLoop);

};

async function gameLoop(time) {

    let dt = time - lastFrame;

    lastFrame = time;

    input.update();

    canvas.update(dt);

    update(dt);

    canvas.draw(); //background and floor

    // --- Sound engine update ---
    for (let snd of soundObjects) {
        if (typeof snd.update === "function") {
            snd.update(
                canvas.camPosX,
                canvas.camPosY,
                canvas.width,
                canvas.height
            );
        }
    }

    draw();

    input.draw(); //needed to clear keypressed states

    if (!paused) {
        window.requestAnimationFrame(gameLoop);
    }
}

/** Stops the game loop from scheduling further frames. Entities stop updating and drawing continues to be skipped. */
export function pause() {
    paused = true;
}

/** Resumes the game loop after `pause()`. */
export function resume() {
    paused = false;
    window.requestAnimationFrame(gameLoop);
}

function update(dt) {
    for (let entity of entities) {
        if (entity.update) {
            entity.update(dt);
        }
    }
    stepStaticCollisions(entities, walls);
    stepCollisions(entities);

    if (input.mousePressed.left || input.mousePressed.right || input.mousePressed.middle) {
        handleClick();
    }

    if (input.keyPressed["KeyP"]) {
        drawDebug = !drawDebug;
    }
}

/** Fires `onClick` on every entity/static entity whose collision shape contains the current mouse position. Called once per frame on mouse-down. */
function handleClick() {
    const { worldX, worldY } = input.mouse;

    for (const entity of entities) {
        if (entity.onClick && isPointInEntityCollision(entity, worldX, worldY)) {
            entity.onClick(input.mouse);
        }
    }

    for (const wall of walls) {
        if (wall.entity.onClick && isPointInWall(wall, worldX, worldY)) {
            wall.entity.onClick(input.mouse);
        }
    }
}

function draw() {
    //depth sort by entity y position
    entities.sort((a, b) => (a.y - b.y));

    for (let entity of entities) {
        entity.draw(ctx);
    }

    //draw over everything
    for (let entity of entities) {
        if (entity.drawOverEverything) {
            entity.drawOverEverything(ctx);
        }
    }

    if (drawDebug) {
        drawCollisionShapes();
    }
}

function drawWallCollisionShape(wall) {
    switch (wall.type) {
        case "AABB":
            ctx.strokeStyle = "orange";
            ctx.strokeRect(wall.left, wall.top, wall.right - wall.left, wall.bottom - wall.top);
            break;
        case "circle":
            ctx.beginPath();
            ctx.strokeStyle = "orange";
            ctx.arc(wall.x, wall.y, wall.rad, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case "ellipse":
            ctx.beginPath();
            ctx.strokeStyle = "orange";
            ctx.ellipse(wall.cx, wall.cy, wall.rx, wall.ry, wall.rotation || 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case "rhombus":
            ctx.strokeStyle = "orange";
            ctx.beginPath();
            const corners = getScaledRhombusCorners(
                wall.cx,
                wall.cy,
                wall.width,
                wall.height,
                wall.rotation,
                wall.scaleY ?? 0.5
            );
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 4; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            break;
    }
}

function drawAnchor(entity) {
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(entity.x, entity.y, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawCollisionShapes() {
    for (let wall of walls) {
        // drawAnchor(wall.entity);
        drawWallCollisionShape(wall);
    }

    for (let entity of entities) {
        // drawAnchor(entity);
        if (entity.collision) {
            entity.drawCollisionShape();
        }
    }
}

// export { getAabbAabbMtv };

/** Adds a dynamic (movable, collidable) entity to the world and fires its `onMount` hook. */
export function addEntity(entity) {
    entities.push(entity);

    if (entity.onMount) {
        entity.onMount();
    }
}

/**
 * Adds an entity as an immovable collision wall derived from `entity.collision`.
 * The entity's `collision` property is consumed and removed; the entity itself is
 * still added to the draw/update list.
 */
export function addStaticEntity(entity) {
    if (entity.collision !== undefined)
        switch (entity.collision.type) {
            case "AABB":
                walls.push({
                    type: "AABB",
                    id: entity.id,
                    left: entity.x + entity.collision.x * entity.scale,
                    right: entity.x + entity.collision.x * entity.scale + entity.collision.width * entity.scale,
                    top: entity.y + entity.collision.y * entity.scale,
                    bottom: entity.y + entity.collision.y * entity.scale + entity.collision.height * entity.scale,
                    entity,
                });
                break;

            case "circle":
                {
                const scale = entity.scale || 1;
                const collision = entity.collision;
                walls.push({
                    type: "circle",
                    id: entity.id,
                    x: entity.x + (collision.offsetX || 0) * scale,
                    y: entity.y + (collision.offsetY || 0) * scale,
                    rad: (collision.rad || 0) * scale,
                    entity
                });
                }
                break;

            case "ellipse": {
                const scale = entity.scale || 1;
                const collision = entity.collision;
                walls.push({
                    type: "ellipse",
                    id: entity.id,
                    cx: entity.x + (collision.offsetX || 0) * scale,
                    cy: entity.y + (collision.offsetY || 0) * scale,
                    rx: (collision.rx ?? collision.radX ?? collision.radiusX ?? collision.rad ?? 0) * scale,
                    ry: (collision.ry ?? collision.radY ?? collision.radiusY ?? collision.rad ?? 0) * scale,
                    rotation: collision.rotation || 0,
                    entity
                });
            }
                break;

            case "rhombus":
                // Rhombus collision shape
                // entity.collision should have: width, height, offsetX, offsetY, rotation (radians), scale, scaleY
                const rhombus = getEntityRhombus(entity);
                walls.push({
                    type: "rhombus",
                    id: entity.id,
                    cx: rhombus.cx,
                    cy: rhombus.cy,
                    width: rhombus.width,
                    height: rhombus.height,
                    rotation: rhombus.rotation,
                    scaleY: rhombus.scaleY,
                    entity
                });
                break;
        }

    delete entity.collision; //remove collision from entity because the collision box was added to walls

    entities.push(entity);
}

/** Removes an entity (and its static wall, if any) from the world, firing `onRemove` if present. */
export function removeEntity(entity) {

    // check if entity is a static wall
    let wallIndex = walls.findIndex(wall => wall.id === entity.id);
    if (wallIndex !== -1) {
        walls.splice(wallIndex, 1);
    }

    let index = entities.indexOf(entity);
    if (index !== -1) {
        if(entity.onRemove) {
            entity.onRemove();
        }
        entities.splice(index, 1);
    }
}

/** Returns collisions between a circle (x, y, r) and all walls/entities, excluding `excludedEntity`. */
export function checkCircleCollision(x, y, r, excludedEntity) {
    return checkCircleCollisionInternal(x, y, r, walls, entities, excludedEntity);
}

/** Returns the closest hit of a line segment (p1 -> p2) against walls/entities, excluding `excludedEntity`. Useful for raycasts, e.g. projectiles or line-of-sight. */
export function checkSegmentCollision(p1, p2, excludedEntity) {
    return checkSegmentCollisionInternal(p1, p2, excludedEntity, walls, entities);
}

/**
 * Loads a level by name: fetches `<level>.json`, dynamically imports each referenced
 * entity's script (falling back to a generic `Entity` if none exists), instantiates
 * entities/floor tiles, then imports and runs `<level>.js`'s `run()` function.
 * @param {string} level - Level name, resolved against the configured level paths.
 * @param {(progress: number) => void} [onProgress] - Called with 0..1 as assets load.
 */
export async function loadLevel(level, onProgress) {

    pause();

    entities = [];
    walls = [];

    canvas.clear();

    let lvlJson = await fetch(new URL(`${level}.json`, paths.levels)).then(res => res.json());

    let entScripts = {};

    const progressTotal = lvlJson.entities.length + lvlJson.floorTiles.length;
    let progress = 0;

    let entScriptPromises = lvlJson.entities.map(ent => {
        return import(new URL(`${ent.name}.js`, paths.entityScripts).href)
            .then(module => {
                entScripts[ent.name] = module;
                console.log(`Loaded script for entity ${ent.name}.`);
                progress++;
                if (onProgress) onProgress(progress / progressTotal);
            })
            .catch(e => {
                console.log(`No script found for entity ${ent.name}, loading as generic entity.`, e);
                progress++;
                if (onProgress) onProgress(progress / progressTotal);
            });
    });

    await Promise.all(entScriptPromises);


    // entities
    for (const ent of lvlJson.entities) {
        let entScript = entScripts[ent.name];

        let _ent;
        if (entScript && entScript.create) {
            _ent = await entScript.create(ent.x, ent.y);
            _ent.scale = ent.scale;
            _ent.rot = ent.rot;
            _ent.tag = ent.tag ? ent.tag : _ent.tag || "";
            addEntity(_ent);
        } else {
            _ent = await Entity.create(ent.x, ent.y, ent.name);
            _ent.scale = ent.scale;
            _ent.rot = ent.rot;
            _ent.tag = ent.tag ? ent.tag : _ent.tag || "";

            if (ent.isFloorItem) {
                addFloorItem(_ent);
            } else if (ent.isStatic) {
                // _ent.tag = "wall";
                addStaticEntity(_ent);
            } else {
                addEntity(_ent);
            }
        }
    }

    // floor tiles
    const floorTilesSettings = lvlJson.settings || {};

    canvas.setFloorTiles(lvlJson.floorTiles);
    canvas.setSkew(floorTilesSettings.tilesSkewX || 0, floorTilesSettings.tilesSkewY || 0);
    canvas.setFloorTilesTransform(
        floorTilesSettings.scaleX ?? 1,
        floorTilesSettings.scaleY ?? 1,
        floorTilesSettings.translateX ?? 0,
        floorTilesSettings.translateY ?? 0,
        floorTilesSettings.rotation ?? 0
    );
    
    canvas.setViewLimits(lvlJson.settings.viewLimits);

    const tilesPromises = lvlJson.floorTiles.map(tile => {
        return loadFloorTilesResources(tile.name).then(() => {
            progress++;
            if (onProgress) onProgress(progress / progressTotal);
        });
    });

    await Promise.all(tilesPromises);

    //settings
    canvas.setWorldSize(floorTilesSettings.width, floorTilesSettings.height);
    
    //call onStart for all entities after they are loaded and the level script is run, this allows entities to do delayed initialization that require other entities to be loaded
    entities.forEach(e => {
        if (e.onStart) {
            e.onStart();
        }
    });
    
    const { run } = await import(new URL(`${level}.js`, paths.levelScripts).href);

    await run();

    resume();
}
