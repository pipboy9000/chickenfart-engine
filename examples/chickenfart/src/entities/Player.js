import { setCamTarget } from "@chickenfart/engine/canvas";
import { keyboard, keyPressed, mouse, mousePressed } from "@chickenfart/engine/input";
import { addEntity, checkCircleCollision } from "@chickenfart/engine/world";
import * as Smoke from "./SmokePuff.js";
import * as Shuriken from "./Shuriken.js";
import { Entity } from "@chickenfart/engine/entitiesFactory";
import { checkSegmentCollision } from "@chickenfart/engine/world";
import { createPerpendicularLine } from "@chickenfart/engine/utils";
import ParticleSystem from "@chickenfart/engine/ParticleSystem";

let sixthPi = Math.PI / 6;

export async function create(x, y) {

    let entity = await Entity.create(x, y, "Player");
    // entity.scale = 1.5;
    entity.tag = "player";

    let wand = await Entity.create(x, y, "Wand2");
    wand.scale = 0.7;
    addEntity(wand);

    let ps = new ParticleSystem();
    addEntity(ps);

    let speed = 2;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    let dir;
    let attackRad = 15;
    let lookingRight = 1;
    let ray = null;
    let squiglyLinePoints = [];

    //timers
    let attackTimer = 0;
    let dashTimer = 0;
    let shurikenTimer = 0;
    let hitTimer = 0;

    //weapon select interface
    let rightClickStartX;
    let rightClickStartY;
    let weaponSelectAngle;
    let showWeaponSelect = false;

    let wandImage = new Image();
    wandImage.src = 'assets/interface/wand.png';

    let shurikenImage = new Image();
    shurikenImage.src = 'assets/interface/shuriken.png';

    let axeImage = new Image();
    axeImage.src = 'assets/interface/axe.png';

    let selectedWeapon = 2; //0 - wand, 1 - axe, 2 - shuriken

    entity.onAnimationEvent = (event) => {
        switch (event) {
            case "attack1":
                attack1();
        }
    }

    entity.onCollision = (other) => {
        // console.log(other.tag);   //console.log(`Player collided with ${other.tag}`);
    }

    entity.onUpdate = async (dt) => {

        //point to mouse
        const dx = mouse.worldX - entity.x;
        const dy = mouse.worldY - entity.y;

        dir = Math.atan2(dy, dx);
        const distToMouseSqr = dx * dx + dy * dy;

        if (mousePressed.right) {
            rightClickStartX = mouse.worldX;
            rightClickStartY = mouse.worldY;
        }

        if (mouse.right) {
            showWeaponSelect = true;
            weaponSelectAngle = Math.atan2(mouse.worldY - rightClickStartY, mouse.worldX - rightClickStartX);
        } else {
            showWeaponSelect = false;
        }

        if (dashTimer > 0) {
            dashTimer -= dt;
        }

        if (shurikenTimer > 0) {
            shurikenTimer -= dt;
        }

        if (hitTimer > 0) {
            hitTimer -= dt;
        } else if (attackTimer > 0) {
            attackTimer -= dt;
        } else {
            if (mouse.worldX > entity.x) {
                entity.setFlipX(false);
                lookingRight = 1;
            } else {
                entity.setFlipX(true);
                lookingRight = -1;
            }

            // if ((keyboard.KeyW || mouse.left) && distToMouseSqr > 300) {
            //     vx += Math.cos(dir) * speed;// * dt;
            //     vy += Math.sin(dir) * speed;// * dt;
            // }

            // if (keyboard.KeyS) {
            //     vx -= Math.cos(dir) * speed;// * dt;
            //     vy -= Math.sin(dir) * speed;// * dt;
            // }

            // if (keyboard.KeyD && distToMouseSqr > 300) {
            //     vx -= Math.cos(dir - Math.PI / 2) * speed;// * dt;
            //     vy -= Math.sin(dir - Math.PI / 2) * speed;// * dt;
            // }

            // if (keyboard.KeyA) {
            //     vx -= Math.cos(dir + Math.PI / 2) * speed;// * dt;
            //     vy -= Math.sin(dir + Math.PI / 2) * speed;// * dt;
            // }

            if (mouse.left) {
                switch (selectedWeapon) {
                    case 0:
                        shootRay();
                        break;

                    case 1:
                        axeAttack();
                        break;

                    case 2:
                        if (shurikenTimer <= 0) {
                            throwShuriken();
                        }

                }
            } else {
                ray = null;
                ps.on = false;
            }

            if (keyboard.ArrowLeft || keyboard.KeyA) {
                vx -= speed;// * dt;
                entity.setFlipX(true);
                lookingRight = -1;
            }

            if (keyboard.ArrowRight || keyboard.KeyD) {
                vx += speed;// * dt;
                entity.setFlipX(false);
                lookingRight = 1;
            }

            if (keyboard.ArrowUp || keyboard.KeyW) {
                vy -= speed;// * dt;
            }

            if (keyboard.ArrowDown || keyboard.KeyS) {
                vy += speed;// * dt;
            }

            if (keyPressed.Space) {
                if (entity.z === 0) {
                    vz = 1;
                    entity.setState("jump");
                    let puff = await Smoke.create(entity.x, entity.y);
                    addEntity(puff);
                    // playRandomFart();    
                    setTimeout(() => {
                        entity.setState("idle")
                    }, 400)
                }
            }
        }

        vx *= 0.8;
        vy *= 0.8;
        vz -= 0.08;

        //normalize 
        if (dashTimer <= 0) {
            let len = Math.sqrt(vx * vx + vy * vy);
            if (len > speed) {
                vx = (vx / len) * speed;
                vy = (vy / len) * speed;
            }
        }

        entity.x += vx;
        entity.y += vy;
        entity.z += vz;

        if (Math.abs(vx) < 0.01) vx = 0;
        if (Math.abs(vy) < 0.01) vy = 0;
        if (entity.z < 0) {
            entity.z = 0;
            vz = 0;
        }

        setCamTarget(entity.x, entity.y);


        if (hitTimer <= 0 && attackTimer <= 0) {
            if ((vx !== 0 || vy !== 0) && entity.z === 0) {
                entity.setState("run");
                entity.animFrameDelay = 100;
            } else if (entity.z === 0) {
                entity.setState("idle");
                entity.animFrameDelay = 100;
            }
        }

        //wand
        if (selectedWeapon === 0) {
            wand.active = true;
            wand.x = entity.x;
            wand.y = entity.y + 0.1;
            wand.z = entity.z;
            wand.rot = dir + Math.PI / 2;
        } else {
            wand.active = false;
        }
    }

    entity.onDrawBehind = (ctx) => {

        //draw laser beam
        try {
            if (ray != null) {
                let lineWidth = Math.random() * 100;
                let perp = createPerpendicularLine(entity.x, entity.y, ray.x, ray.y, lineWidth)
                const gradient = ctx.createLinearGradient(perp.x1, perp.y1, perp.x2, perp.y2);
                gradient.addColorStop(0, '#ffff8800');
                gradient.addColorStop(0.43, '#ffff8833');
                // gradient.addColorStop(0.5, '#ffffffcc');
                gradient.addColorStop(0.57, '#ffff8833');
                gradient.addColorStop(1, '#ffff8800');

                ctx.globalCompositeOperation = "color-dodge";

                ctx.strokeStyle = gradient;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(ray.sx, ray.sy);
                ctx.lineTo(ray.x, ray.y);
                ctx.stroke();

                //glow where laser hit
                const hitPointSize = 5 + Math.random() * 5;
                const hitPointGradient = ctx.createRadialGradient(ray.x, ray.y, 2, ray.x, ray.y, hitPointSize)
                hitPointGradient.addColorStop(0, "#ffffff88");
                hitPointGradient.addColorStop(1, "#ffff3300");
                ctx.beginPath();
                ctx.fillStyle = hitPointGradient;
                ctx.arc(ray.x, ray.y, hitPointSize, 0, Math.PI * 2);
                ctx.fill();
            }

            //vision light
            // ctx.globalCompositeOperation = "hard-light";
            // const lightGlow = ctx.createRadialGradient(entity.x, entity.y, 1, entity.x, entity.y, 100);
            // lightGlow.addColorStop(0, "#ffffff25");
            // lightGlow.addColorStop(1, "#ffff3300");
            // ctx.beginPath();
            // ctx.fillStyle = lightGlow;
            // ctx.arc(entity.x, entity.y, 100, 0, Math.PI * 2);
            // ctx.fill();
        }
        catch (err) {
            debugger;
            console.error(err);
        }
    }

    entity.onDraw = (ctx) => {
        if (ray) {

            const glowX = entity.x + Math.sin(dir + Math.PI * 0.5) * 25;
            const glowY = entity.y - entity.z - (Math.cos(dir + Math.PI * 0.5) * 25);

            const r = Math.random() * 10 + 5;

            const wandGlow = ctx.createRadialGradient(glowX, glowY, 2, glowX, glowY, r);
            wandGlow.addColorStop(0, "#ffffff88");
            wandGlow.addColorStop(1, "#ffff3300");

            ctx.beginPath();
            ctx.fillStyle = wandGlow
            ctx.arc(glowX, glowY, r, 0, Math.PI * 2);
            ctx.fill();

            //squigly lines
            ctx.beginPath();
            ctx.strokeStyle = "#ffffcccc";
            ctx.lineWidth = Math.random() * 5 + 1;
            ctx.globalCompositeOperation = "lighten";
            ctx.moveTo(squiglyLinePoints[0].x, squiglyLinePoints[0].y);
            squiglyLinePoints.forEach(pt => {
                ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
        }


    }

    entity.drawOverEverything = (ctx) => {
        if (showWeaponSelect) {

            //background circle
            ctx.beginPath();
            ctx.fillStyle = "#33333344";
            ctx.arc(rightClickStartX, rightClickStartY, 50, 0, Math.PI * 2);
            ctx.fill();

            // console.log(weaponSelectAngle);

            if (weaponSelectAngle > sixthPi && weaponSelectAngle <= sixthPi * 5) {
                //bottom third (wand)
                selectedWeapon = 0
            } else if (weaponSelectAngle > sixthPi * 5 || weaponSelectAngle < -sixthPi * 3) {
                //left third (axe)
                selectedWeapon = 1;
            } else {
                //right third (shuriken)
                selectedWeapon = 2;
            }

            if (selectedWeapon === 0) {
                ctx.beginPath();
                ctx.fillStyle = "#dd333380";
                ctx.arc(rightClickStartX, rightClickStartY, 50, sixthPi * 5, sixthPi, true);
                ctx.lineTo(rightClickStartX, rightClickStartY);
                ctx.fill();
            } else if (selectedWeapon === 1) {
                ctx.beginPath();
                ctx.fillStyle = "#dd333380";
                ctx.arc(rightClickStartX, rightClickStartY, 50, -sixthPi * 3, sixthPi * 5, true);
                ctx.lineTo(rightClickStartX, rightClickStartY);
                ctx.fill();
            } else if (selectedWeapon === 2) {
                ctx.beginPath();
                ctx.fillStyle = "#dd333380";
                ctx.arc(rightClickStartX, rightClickStartY, 50, sixthPi, -sixthPi * 3, true);
                ctx.lineTo(rightClickStartX, rightClickStartY);
                ctx.fill();
            }

            //wand
            ctx.save();
            ctx.scale(1, 1);
            ctx.translate(rightClickStartX, rightClickStartY)
            ctx.drawImage(wandImage, -7, 0 + 10);
            ctx.restore();

            //axe
            ctx.save();
            ctx.scale(1, 1);
            ctx.translate(rightClickStartX, rightClickStartY)
            ctx.drawImage(axeImage, -50, -40);
            ctx.restore();

            //shuriken
            ctx.save();
            ctx.translate(rightClickStartX, rightClickStartY)
            ctx.scale(1.25, 1.25);
            ctx.drawImage(shurikenImage, 10, -25);
            ctx.restore();

        }
    }

    entity.hit = (col, dmg) => {
        vx += col.x;
        vy += col.y;
        hitTimer = 300;
        attackTimer = 0;
        entity.flash(300, "red");
        entity.setState("hit");
    }

    function attack1() {
        let collisions = checkCircleCollision(entity.x + 12 * lookingRight, entity.y, attackRad);
        collisions.forEach(col => {
            if (col.entity === entity) return;
            if (col.entity.hit) {
                col.x /= 3;
                col.y /= 3;
                col.entity.hit(col, 20);
            }
        });
    }

    async function throwShuriken() {
        let s = await Shuriken.create(entity.x, entity.y, Math.cos(dir), Math.sin(dir), entity);
        entity.setState("dash");
        addEntity(s);
        shurikenTimer = 300;
    }

    function shootRay() {
        let cosVal = Math.cos(dir);
        let sinVal = Math.sin(dir);

        let p1 = { x: entity.x + cosVal * 25, y: entity.y + sinVal * 25 - entity.z }
        let p2 = { x: entity.x + cosVal * 1000, y: entity.y + sinVal * 1000 }

        let col = checkSegmentCollision(p1, p2, entity);
        if (col.hit) {
            ray = { sx: p1.x, sy: p1.y, x: col.hitPoint.x, y: col.hitPoint.y }

            //particle system
            ps.x = col.hitPoint.x;
            ps.y = col.hitPoint.y;
            ps.on = true;

            if (col.entity.hit) {
                col.x *= 0.005;
                col.y *= 0.005;
                col.entity.hit(col, 1);
            }
        } else {
            ray = {
                sx: p1.x, sy: p1.y,
                x: entity.x + cosVal * 500,
                y: entity.y + sinVal * 500
            }
            ps.on = false;
        }

        let dist = 1000;
        if (col.hit) {
            dist = Math.hypot(col.hitPoint.x - p1.x, col.hitPoint.y - p1.y);
        }

        // console.log(dist);

        //set points for squigly lines
        squiglyLinePoints = [{ x: p1.x, y: p1.y }]; //first point is the starting point
        let ptNum = Math.floor(dist / 60) + 2; //number of points along the line + 2 points for start and finish
        for (let i = 1; i < ptNum; i++) {
            squiglyLinePoints.push({
                x: p1.x + cosVal * i / ptNum * dist + (Math.random() * 10 - 5),
                y: p1.y + sinVal * i / ptNum * dist + (Math.random() * 10 - 5),
            });
        }

        squiglyLinePoints.push({ x: ray.x, y: ray.y }); //last point is the point of hit

    }

    function axeAttack() {
        entity.setState("attack1");
        entity.animFrameDelay = 50;
        attackTimer = 500;
        dashTimer = 300;
        vx += lookingRight * 5;
    }

    return entity;
}
