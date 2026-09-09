import { Entity } from "@chickenfart/engine/entitiesFactory";
import { checkCircleCollision, addEntity, getEntityByTag, removeEntity } from "@chickenfart/engine/world";
import { valueToRedToGreen, getEntitiesDistanceSqr } from "/src/utils.js";
import { Sound } from "@chickenfart/engine/sound";
import * as Crystal from "./Crystal.js";
import ParticleSystem from "./ParticleSystem.js"
import WhiteSmoke from "./WhiteSmoke.js";


export async function create(x, y) {

    let target;

    let entity = await Entity.create(x, y, "Orc");

    // let sounds = await Sound.create({ "fart": "../sounds/fart0.mp3" }, entity);

    let whiteSmoke = await WhiteSmoke.create(x, y, 6000);

    entity.tag = "enemy";
    entity.opacity = 0;
    entity.collisionEnabled = false;

    let speed = 0.2;
    let vx = 0;
    let vy = 0;
    let state = "spawn";

    let walkToX;
    let walkToY;

    let cooldownTimer;
    let attackTimer;
    let walkTimer;
    let idleTimer = 500;
    let hitTimer;
    let spawnTimer = 3000;

    let lookingRight = 1;

    let attackRad = 8;

    let hp = 10;

    // let fartTimer = 3000;

    entity.onStart = () => {
        target = getEntityByTag("player");
    }

    entity.onMount = () => {
        target = getEntityByTag("player");
    }

    entity.onAnimationEvent = (event) => {
        switch (event) {
            case "attack1":
                attack1();
                break;

            case "death":
                death();
                break;
        }
    }

    entity.onUpdate = async (dt) => {

        if (entity.currState === "death") return;

        if (state === "spawn") {
            spawnTimer -= dt;
            entity.opacity = 1 - spawnTimer / 3000;
            if (spawnTimer <= 0) {
                setState("idle");
                entity.opacity = 1;
                entity.collisionEnabled = true;
            }
            return;
        }

        //flip to face target
        if (target.x > entity.x) {
            entity.setFlipX(false);
            lookingRight = 1;
        } else {
            entity.setFlipX(true);
            lookingRight = -1;
        }

        const distToWalkPointSqr = getEntitiesDistanceSqr(entity, { x: walkToX, y: walkToY });

        if (hitTimer > 0) {
            hitTimer -= dt;
            if (hitTimer <= 0) {
                setState("idle");
            }
        }

        if (distToWalkPointSqr <= 5 && state !== "attack" && state !== "cooldown") {
            setState("attack");
        }

        if (state === "attack") {
            attackTimer -= dt;
            if (attackTimer <= 0) {
                setState("cooldown");
            }
        }

        if (state === "cooldown") {
            cooldownTimer -= dt;
            if (cooldownTimer <= 0) {
                setState("walk");
            }
        }

        if (state === "walk") {
            walkTimer -= dt;
            if (walkTimer <= 0) {
                setState("idle");
            }
        }

        if (state === "idle") {
            idleTimer -= dt;
            if (idleTimer <= 0) {
                setState("walk");
            }
        }

        if (state === "walk") {
            let dir = Math.atan2(walkToY - entity.y, walkToX - entity.x);
            vx += Math.cos(dir) * speed;
            vy += Math.sin(dir) * speed;
        }

        //fart sound
        // fartTimer -= dt;
        // if (fartTimer <= 0) {
        //     // sounds.play("fart", 0.5);
        //     fartTimer = 1000 + Math.random() * 2000;
        //     let smoke = await Smoke.create(entity.x + 2 * lookingRight, entity.y);
        //     addEntity(smoke);
        // }

        vx *= 0.8;
        vy *= 0.8;

        entity.x += vx;
        entity.y += vy;
    }

    entity.onDraw = (ctx) => {
        // if (state === "attack") {
        //     ctx.beginPath();
        //     ctx.arc(entity.x + 10 * lookingRight, entity.y, attackRad, 0, Math.PI * 2);
        //     ctx.fillStyle = "red";
        //     ctx.fill();
        // }

        // if (state === "walk") {
        //     ctx.beginPath();
        //     ctx.arc(walkToX, walkToY, 2, 0, Math.PI * 2);
        //     ctx.fillStyle = "blue";
        //     ctx.fill();
        // }

        if (hp > 0) {
            const color = valueToRedToGreen(hp / 10);
            ctx.fillStyle = color;
            ctx.fillRect(entity.x - 10, entity.y - 14, hp / 10 * 20, 2);
        }
    }

    function attack1() {
        let collisions = checkCircleCollision(entity.x + 10 * lookingRight, entity.y, attackRad);
        collisions.forEach(col => {
            if (col.entity === entity) return;
            if (col.entity.hit) {
                col.entity.hit(col, 10);
            }
        });
    }

    function death() {
        removeEntity(entity);
    }

    async function setState(newState) {
        if (state === newState) return;
        state = newState;
        switch (newState) {
            case "idle":
                vx = 0;
                vy = 0;
                entity.setState("idle");
                idleTimer = 100 + Math.random() * 300;
                entity.animFrameDelay = 300;
                break;

            case "walk":
                walkToX = target.x - 15 * lookingRight;
                walkToY = target.y;
                entity.setState("walk");
                walkTimer = 100 + Math.random() * 300;
                entity.animFrameDelay = 300;
                break;

            case "cooldown":
                vx = 0;
                vy = 0;
                entity.setState("idle");
                entity.animFrameDelay = 300;
                cooldownTimer = 300 + Math.random() * 200;
                break;

            case "attack":
                vx = 0;
                vy = 0;
                entity.setState("attack1");
                entity.animFrameDelay = 100;
                attackTimer = 600;
                break;

            case "hit":
                entity.setState("hit");
                hitTimer = 800;
                entity.flash(800, "red");
                entity.setState("hit");
                break;

            case "death":
                entity.setState("death");
                entity.animFrameDelay = 200;
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                addEntity(await Crystal.create(entity.x, entity.y, target));
                break;

        }
    }

    entity.hit = (col, dmg) => {
        vx += col.x;
        vy += col.y;
        hp -= dmg;
        if (hp <= 0) {
            setState("death");
        } else {
            setState("hit");
        }
    }

    return entity;

}