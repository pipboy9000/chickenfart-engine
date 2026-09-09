import { Entity } from "@chickenfart/engine/entitiesFactory";
import { getEntityByTag } from "@chickenfart/engine/world";

const PI_OVER_FOUR = Math.PI / 4;
const THREE_PI_OVER_FOUR = 3 * PI_OVER_FOUR; // 3 * PI/4 (135 degrees)

export async function create(x, y) {

    let entity = await Entity.create(x, y, "Rabbit");

    let player;

    let vx = 0, vy = 0, vz = 0;

    let jumpTimer = 3000;

    let dir;

    let facingDirection = "down";

    entity.onMount = () => {
        player = getEntityByTag("player");
    }

    entity.onStart = () => {
        player = getEntityByTag("player");
    }

    entity.onUpdate = (dt) => {

        let distToPlayer = Math.hypot(player.y - entity.y, player.x - entity.x);

        if (distToPlayer < 100 && entity.z === 0) {
            jumpAway();
        }

        if (jumpTimer > 0) {
            jumpTimer -= dt;

            if (jumpTimer <= 0) {
                jump();
            }
        }

        entity.x += vx;
        entity.y += vy;
        entity.z += vz;

        vz -= 0.1; //gravity;

        if (entity.z <= 0) {
            entity.z = 0;

            vx = 0;
            vy = 0;
            vz = 0;

            switch (facingDirection) {
                case "up":
                    entity.setState("idleUp");
                    break;

                case "right":
                    entity.setState("idleRight");
                    break;

                case "down":
                    entity.setState("idle");
                    break;

                case "left":
                    entity.setState("idleLeft");
                    break;
            }
        }

    }

    function jump() {

        jumpTimer = Math.random() * 1500;

        dir = Math.random() * Math.PI * 2 - Math.PI;

        vz = 1.5;
        vx = Math.cos(dir) * .5;
        vy = Math.sin(dir) * .5;

        calcFacingDirection();

        switch (facingDirection) {
            case "up":
                entity.setState("jumpUp");
                break;

            case "right":
                entity.setState("jumpRight");
                break;

            case "down":
                entity.setState("jumpDown");
                break;

            case "left":
                entity.setState("jumpLeft");
                break;
        }

    }

    function jumpAway() {

        jumpTimer = 1500;

        dir = Math.atan2(entity.y - player.y, entity.x - player.x);

        vz = 1.5;
        vx = Math.cos(dir) * .5;
        vy = Math.sin(dir) * .5;

        calcFacingDirection();

        switch (facingDirection) {
            case "up":
                entity.setState("jumpUp");
                break;

            case "right":
                entity.setState("jumpRight");
                break;

            case "down":
                entity.setState("jumpDown");
                break;

            case "left":
                entity.setState("jumpLeft");
                break;
        }
    }

    function calcFacingDirection() {
        if (dir > -PI_OVER_FOUR && dir <= PI_OVER_FOUR) {
            facingDirection = "right";
        } else if (dir > PI_OVER_FOUR && dir <= THREE_PI_OVER_FOUR) {
            facingDirection = "down";
        } else if (dir > THREE_PI_OVER_FOUR || dir <= -THREE_PI_OVER_FOUR) {
            facingDirection = "left";
        } else {
            facingDirection = "up";
        }
    }

    return entity;

}