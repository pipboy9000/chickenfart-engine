import { ctx } from "./canvas.js";
import { getScaledRhombusCorners } from "./collision.js";

// Resource cache for lazy loading
const resources = {};
let entityResourcesPath = "src/entities/resources/";

/** Sets the base URL used to resolve `<AssetName>/<AssetName>.json` and `.png` resource pairs. */
export function configure({resourcesPath} = {}) {
    if (resourcesPath) {
        entityResourcesPath = new URL(resourcesPath, document.baseURI).href;
    }
}

// Lazy load a resource by name, cache it in resources
async function getResource(resName) {
    if (resources[resName]) return resources[resName];

    // Fetch JSON metadata
    const resourceBaseUrl = new URL(`${resName}/`, entityResourcesPath);
    const json = await fetch(new URL(`${resName}.json`, resourceBaseUrl));
    if (!json.ok) {
        throw new Error(`HTTP error! status: ${json.status}`);
    }
    const data = await json.json();

    // Load sprite sheet
    const spriteSheet = new Image();
    spriteSheet.src = new URL(`${resName}.png`, resourceBaseUrl).href;
    await spriteSheet.decode();

    // Build resource object
    const resource = {
        spriteSheet,
        width: data.width,
        height: data.height,
        anchorX: data.anchorX,
        anchorY: data.anchorY,
        animations: data.animations,
        states: data.states
    };

    // Load collision data and calculate radSqr
    if (data.collision !== undefined) {
        resource.collision = data.collision;
        switch (resource.collision.type) {
            case "circle":
                resource.collision.radSqr = Math.pow(resource.collision.rad, 2);
                break;
        }
    }

    resources[resName] = resource;
    return resource;
}

/**
 * A sprite-backed game object. Create instances with `Entity.create(x, y, assetName)`
 * rather than the constructor directly. Extend behavior by assigning lifecycle hooks:
 * `onStart`, `onUpdate`, `onDraw`, `onDrawBehind`, `onCollision`, `onAnimationEvent`,
 * `onClick`, `onMouseEnter`, and `onMouseLeave`.
 */
export class Entity {
    constructor(x, y, resource) {

        if (!resource) throw ("Resource undefined, did you forget to add it to defaultRresources?");

        this.id = crypto.randomUUID();
        this.active = true;
        this.res = resource;
        this.collision = resource.collision;
        this.collisionEnabled = true;
        this.tag = "";
        this.x = x;
        this.y = y;
        this.z = 0;
        this.rot = 0;
        this.scale = 1;
        this.anchorX = 0;
        this.anchorY = 0;
        this.opacity = 1;

        this.onStart = null; //called once the engine starts, can be used for delayed initialization that require all entities to be loaded
        this.onUpdate = null;
        this.onDraw = null; //draw above the sprinte
        this.onDrawBehind = null; //draw behind the sprite
        this.drawOverEverything = null; //draw above everything (for sprite related interfaces)
        this.onCollision = null;
        this.onAnimationEvent = null;
        this.onClick = null; //called when a mouse click/tap lands inside this entity's collision shape
        this.onMouseEnter = null;
        this.onMouseLeave = null;
        this.isMouseOver = false;

        //anim data
        this.currState = resource.states[0];
        this.animFrameDelay = 100; //ms per frame
        this.time = 0;
        this.flipX = false;
        this.flipY = false;
        this.currFrame = 0;
        this.blendMode = "source-over";


        //animation events tracker
        //animation are index by animation state name and frame number like attack1-4
        this.animationEventsFired = {};

        //effects
        this.flashTimer = 0;
        this.maxFlashTimer = 0;
    }

    /**
     * Loads (and caches) the sprite sheet/metadata for `assetName` and creates an Entity at (x, y).
     * @param {number} x
     * @param {number} y
     * @param {string} assetName - Resource folder name under the configured resources path.
     */
    static async create(x, y, assetName) {
        // Lazy load resource if not present
        const res = await getResource(assetName);
        let ent = new Entity(x, y, res);

        // load animation events
        Object.keys(res.animations).forEach((animName) => {
            if (res.animations[animName].events !== undefined) {
                Object.keys(res.animations[animName].events).forEach(frameNumber => {
                    ent.animationEventsFired[`${animName}-${frameNumber}`] = false;
                });
            }
        });
        return ent;
    }



    /** Draws the current animation frame, honoring flip, rotation, opacity, and flash effects. Called every frame by `world.js`. */
    draw = () => {
        // if(!ctx) return;
        if (this.active) {
            ctx.save();
            if (this.onDrawBehind) {
                this.onDrawBehind(ctx);
            }
            ctx.restore();

            const sourceX = this.currFrame * this.res.width;
            const sourceY = this.res.states.indexOf(this.currState) * this.res.height;

            ctx.save();

            ctx.globalAlpha = this.opacity;

            ctx.globalCompositeOperation = this.blendMode;

            ctx.translate(
                this.x,
                this.y - this.z,
            )

            ctx.rotate(this.rot);

            //flip if needed
            if (this.flipX) {
                if (this.flipY) {
                    ctx.scale(-this.scale, -this.scale);
                } else {
                    ctx.scale(-this.scale, this.scale);
                }
            } else if (this.flipY) {
                ctx.scale(this.scale, -this.scale);
            } else {
                ctx.scale(this.scale, this.scale);
            }

            //effects
            if (this.flashTimer > 0) {
                let f = this.flashTimer / this.maxFlashTimer;

                switch (this.flashColor) {
                    case "red":
                        ctx.filter = `grayscale(${f * 3}) sepia(${f * 3}) saturate(${f * 3}) hue-rotate(317deg) brightness(${1 + f * 1})`;
                        break;

                    case "cyan":
                        ctx.filter = `grayscale(${f * 3}) sepia(${f * 3}) saturate(${f * 3}) hue-rotate(170deg) brightness(${1 + f * 2})`;
                        break;

                    case "yellow":
                        ctx.filter = `grayscale(${f * 3}) sepia(${f * 3}) saturate(${f * 3}) hue-rotate(23deg) brightness(${1 + f * 2})`;
                        break;
                }
            }

            //entity
            ctx.drawImage(
                this.res.spriteSheet,
                sourceX, sourceY,
                this.res.width,
                this.res.height,
                - this.res.anchorX,
                - this.res.anchorY,
                this.res.width,
                this.res.height
            );

            ctx.restore();

            ctx.save();

            if (this.onDraw) {
                this.onDraw(ctx);
            }

            ctx.restore();
        }
    }

    /** Advances animation time, fires `onUpdate`/`onAnimationEvent`, and ticks the flash timer. Called every frame by `world.js`. */
    update = async (dt) => {

        if (this.active) {

            if (this.onUpdate) this.onUpdate(dt);

            this.time += dt;

            const totalFrames = this.res.animations[this.currState].length;

            this.currFrame = Math.floor(this.time / this.animFrameDelay % totalFrames);

            //check for animation events
            if (this.onAnimationEvent !== null) {

                const events = this.res.animations[this.currState].events;

                if (events && events[this.currFrame] !== undefined) {

                    const animEventName = events[this.currFrame];

                    if (this.animationEventsFired[`${this.currState}-${this.currFrame}`] === false) {
                        this.onAnimationEvent(animEventName);
                        this.animationEventsFired[`${this.currState}-${this.currFrame}`] = true;
                    }
                }
            }

            //check if a cycle finished
            if (this.time >= this.animFrameDelay * totalFrames) {
                this.resetAnimationEventsFired();
                this.time -= this.animFrameDelay * totalFrames;
            }

            if (this.flashTimer > 0) {
                this.flashTimer -= dt;
            }
        }
    }

    /** Switches to a different animation state (e.g. "idle", "walk"), resetting frame time. No-op if already in that state. */
    setState = (state) => {
        if (state != this.currState) {
            this.resetAnimationEventsFired();
            this.currState = state
            this.time = 0;
        }
    }

    /** Mirrors the sprite horizontally when `flip` is true. */
    setFlipX = (flip) => {
        this.flipX = flip;
    }

    /** Mirrors the sprite vertically when `flip` is true. */
    setFlipY = (flip) => {
        this.flipY = flip;
    }

    /** Clears fired-state for all animation events so they can fire again next cycle. */
    resetAnimationEventsFired = () => {
        Object.keys(this.animationEventsFired).forEach(animName => {
            this.animationEventsFired[animName] = false;
        });
    }

    /** Applies a colored screen-flash effect (e.g. on taking damage) that fades out over `time` ms. */
    flash = (time, color = "red") => {
        this.flashTimer = time;
        this.maxFlashTimer = time;
        this.flashColor = color;
    }

    /** Draws this entity's collision shape as a debug outline (toggled by the 'P' key). */
    drawCollisionShape = () => {
        ctx.save();

        if (this.collision) {
            switch (this.collision?.type) {
                case "AABB":
                    ctx.strokeStyle = "orange";
                    ctx.strokeRect(this.x + this.collision.x * this.scale, this.y - this.z + this.collision.y * this.scale, this.collision.width * this.scale, this.collision.height * this.scale);
                    break;
                case "circle":
                    const circleScale = this.scale || 1;
                    const circleCx = this.x + (this.collision.offsetX || 0) * circleScale;
                    const circleCy = this.y + (this.collision.offsetY || 0) * circleScale - (this.z || 0);
                    ctx.beginPath();
                    ctx.strokeStyle = "orange";
                    ctx.arc(circleCx, circleCy, (this.collision.rad || 0) * circleScale, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case "ellipse": {
                    const scale = this.scale || 1;
                    const collision = this.collision;
                    const rx = (collision.rx ?? collision.radX ?? collision.radiusX ?? collision.rad ?? 0) * scale;
                    const ry = (collision.ry ?? collision.radY ?? collision.radiusY ?? collision.rad ?? 0) * scale;
                    const cx = this.x + (collision.offsetX || 0) * scale;
                    const cy = this.y + (collision.offsetY || 0) * scale - (this.z || 0);

                    ctx.beginPath();
                    ctx.strokeStyle = "orange";
                    ctx.ellipse(cx, cy, rx, ry, collision.rotation || 0, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case "rhombus":
                    ctx.strokeStyle = "orange";
                    ctx.beginPath();
                    const cx = this.x + (this.collision.offsetX || 0) * (this.scale || 1);
                    const cy = this.y + (this.collision.offsetY || 0) * (this.scale || 1) - (this.z || 0);
                    const width = this.collision.width * (this.scale || 1);
                    const height = this.collision.height * (this.scale || 1);
                    const rotation = this.collision.rotation || 0;
                    const scaleY = this.collision.scaleY ?? 0.5;
                    const corners = getScaledRhombusCorners(cx, cy, width, height, rotation, scaleY);
                    ctx.moveTo(corners[0].x, corners[0].y);
                    for (let i = 1; i < 4; i++) {
                        ctx.lineTo(corners[i].x, corners[i].y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;
            }

            ctx.restore();
        }
    }
}
