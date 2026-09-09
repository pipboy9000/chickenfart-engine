import { Entity } from "@chickenfart/engine/entitiesFactory";
import { addEntity,checkCircleCollision, removeEntity, getEntityByTag } from "@chickenfart/engine/world";
import { valueToRedToGreen } from "../utils.js";
import * as Orc from "./Orc.js";

export async function create(x, y) {

    let entity = await Entity.create(x, y, "WarriorKing");

    let target;

    entity.tag = "wk";

    let vx = 0, vy = 0;
    let speed = 0.1;

    let lookingRight = 1;

    let attackRad = 15;

    let idleTimer = 1000;
    let walkTimer = 0;
    let hitTimer = 0;
    let attackTimer = 0;
    let attack2Timer = 0;
    let tauntTimer = 0;

    let hp = 100;

    entity.onStart = () => {
        target = getEntityByTag("player");
    }

    entity.onAnimationEvent = (eventName) => {
        switch (eventName) {
            case "attack1-1":
                attack();
                break;
            case "attack1-2":
                attack();
                break;
            case "attack1-3":
                attack();
                break;
            case "attack2":
                attack2();
                break;
            case "taunt":
                spawnOrcs();
                break;

            case "death":
                console.log("worrior king death")
                removeEntity(entity);
                break;
        }
    }

    entity.hit = (col, dmg) => {
        vx += col.x * 0.05;
        vy += col.y * 0.05;
        entity.flash(1000);

        hp -= dmg;

        if (hp <= 0) {
            setState("death");
            entity.collision = null;
        }
    }

    entity.onDraw = (ctx) => {
        if (hp > 0) {
            const color = valueToRedToGreen(hp / 100);
            ctx.fillStyle = color;
            ctx.fillRect(entity.x - 10 * entity.scale, entity.y - 30 * entity.scale, hp / 100 * 20 * entity.scale, 2 * entity.scale);
        }
    }

    function attack() {
        let collisions = checkCircleCollision(entity.x + 10 * lookingRight, entity.y - 2, attackRad);
        collisions.forEach(col => {
            if (col.entity === entity) return;
            if (col.entity.hit) {
                col.entity.hit(col, 10);
            }
        });
    }

    function attack2() {
        let collisions = checkCircleCollision(entity.x, entity.y, 30, entity);
        collisions.forEach(col => {
            if (col.entity === entity) return;
            if (col.entity.hit) {
                col.entity.hit(col, 10);
            }
        });
    }

    async function spawnOrcs() {
        for (let i = 0; i < 3; i++) {
            let angle = (i / 3) * Math.PI * 2;
            let spawnX = entity.x + Math.cos(angle) * 30;
            let spawnY = entity.y + Math.sin(angle) * 30;
            let orc = await Orc.create(spawnX, spawnY);
            addEntity(orc);
        }
    }

    entity.onUpdate = async (dt) => {

        if (entity.currState === "death") return;

        //flip to face target
        if (target.x > entity.x) {
            entity.setFlipX(false);
            lookingRight = 1;
        } else {
            entity.setFlipX(true);
            lookingRight = -1;
        }

        if (hitTimer > 0) {
            hitTimer -= dt;
            if (hitTimer <= 0) {
                setState("idle");
            }
        } else if (idleTimer > 0) {
            idleTimer -= dt;
            if (idleTimer <= 0) {
                let r = Math.random();
                if (r < 0.3) {
                    setState("taunt");
                } else {
                    setState("walk")
                }
            }
        } else if (walkTimer > 0) {

            let dx = target.x - 15 * lookingRight - entity.x;
            let dy = target.y - entity.y

            let dir = Math.atan2(dy, dx);

            vx += Math.cos(dir) * speed;
            vy += Math.sin(dir) * speed;

            let dist = Math.hypot(dy, dx);

            if (dist < 10) {
                if (Math.random() < 0.5) {
                    setState("attack1");
                } else {
                    setState("attack2");
                }
            } else {
                walkTimer -= dt;
                if (walkTimer <= 0) {
                    if (Math.random() < 0.5) {
                        setState("taunt");
                    } else {
                        setState("idle");
                    }
                }
            }
        } else if (attackTimer > 0) {
            attackTimer -= dt;
            if (attackTimer <= 0) {
                setState("idle")
            }
        } else if (attack2Timer > 0) {
            attack2Timer -= dt;
            if (attack2Timer <= 0) {
                setState("idle")
            }
        } else if (tauntTimer > 0) {
            tauntTimer -= dt;
            if (tauntTimer <= 0) {
                setState("idle");
            }
        }

        vx *= 0.8;
        vy *= 0.8;

        entity.x += vx;
        entity.y += vy;
    }



    function resetTimers() {
        idleTimer = 0;
        walkTimer = 0;
        hitTimer = 0;
        attackTimer = 0;
        tauntTimer = 0;
    }

    function setState(state) {

        entity.setState(state);

        resetTimers();

        switch (state) {
            case "idle":
                entity.animFrameDelay = 300;
                idleTimer = 500;
                break;

            case "walk":
                entity.animFrameDelay = 200;
                walkTimer = 3000;
                break;

            case "attack1":
                entity.animFrameDelay = 50;
                attackTimer = 1500;
                break;

            case "attack2":
                entity.animFrameDelay = 50;
                attack2Timer = 1200;
                break;

            case "taunt":
                entity.animFrameDelay = 100;
                tauntTimer = 1800;
                break;

            case "death":
                entity.animFrameDelay = 200;

        }
    }


    return entity;

}