import { Entity } from "@chickenfart/engine/entitiesFactory";
import { checkCircleCollision, removeEntity, getEntityByTag } from "@chickenfart/engine/world";
import { valueToRedToGreen } from "@chickenfart/engine/utils";

export async function create(x, y) {

    let entity = await Entity.create(x, y, "Samurai");

    let target;

    entity.tag = "samurai";

    let vx = 0, vy = 0;
    let speed = 1;

    let lookingRight = 1;

    let attackRad = 12;

    let idleTimer = Math.random() * 2000 + 1000;
    let runTimer = 0;
    let hitTimer = 0;
    let attackTimer = 0;
    let deathTimer = 0;

    let hp = 100;

    entity.onStart = () => {
        target = getEntityByTag("player");
    }

    entity.onAnimationEvent = (eventName) => {
        switch (eventName) {
            case "attack1":
                attack();
                break;
        }
    }

    function attack() {
        let collisions = checkCircleCollision(entity.x + 10 * lookingRight, entity.y, attackRad);
        collisions.forEach(col => {
            if (col.entity === entity) return;
            if (col.entity.hit) {
                col.entity.hit(col, 30);
            }
        })
    }

    entity.hit = (col, dmg) => {
        vx += col.x;
        vy += col.y;
        entity.flash(1500);

        hp -= dmg;

        if (hp <= 0) {
            setState("death");
            entity.collision = null;
        } else {
            setState("hit");
        }
    }

    entity.onUpdate = async (dt) => {

        if (deathTimer > 0) {
            deathTimer -= dt
            entity.opacity = deathTimer / 2000;
            if (deathTimer <= 0) {
                removeEntity(entity);
            }
        }

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
                setState("run")
            }
        } else if (runTimer > 0) {

            let dx = target.x - 15 * lookingRight - entity.x;
            let dy = target.y - entity.y
            let dir = Math.atan2(dy, dx);
            vx += Math.cos(dir) * speed;
            vy += Math.sin(dir) * speed;

            let dist = Math.hypot(dy, dx);

            if (dist < 10) {
                setState("attack");
            } else {
                runTimer -= dt;
                if (runTimer <= 0) {
                    setState("idle");
                }
            }
        } else if (attackTimer > 0) {
            attackTimer -= dt;
            if (attackTimer <= 0) {
                setState("idle")
            }
        }

        vx *= 0.8;
        vy *= 0.8;

        entity.x += vx;
        entity.y += vy;
    }

    entity.onDraw = (ctx) => {
        if (hp > 0) {
            const color = valueToRedToGreen(hp / 100);
            ctx.fillStyle = color;
            ctx.fillRect(entity.x - 10, entity.y - 50, hp / 100 * 20, 2);
        }
    }

    function resetTimers() {
        idleTimer = 0;
        runTimer = 0;
        hitTimer = 0;
        attackTimer = 0;
    }

    function setState(state) {

        entity.setState(state);

        resetTimers();

        switch (state) {
            case "idle":
                entity.animFrameDelay = 300;
                idleTimer = Math.random() * 2000 + 1000;
                break;

            case "run":
                entity.animFrameDelay = 50;
                runTimer = Math.random() * 1200 + 400;
                break;

            case "attack":
                entity.animFrameDelay = 50;
                attackTimer = 350;
                break;

            case "hit":
                entity.animFrameDelay = 100;
                hitTimer = 100;
                break;

            case "death":
                entity.setState("hit");
                deathTimer = 2000;
                break;
        }
    }


    return entity;

}