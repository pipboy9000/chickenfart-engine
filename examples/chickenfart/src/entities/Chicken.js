import { Entity } from "@chickenfart/engine/entitiesFactory";
import { keyboard, keyPressed } from "@chickenfart/engine/input";
import { setCamTarget } from "@chickenfart/engine/canvas";
import { Sound } from "@chickenfart/engine/sound";

export async function create(x, y) {
    
    const chicken = await Entity.create(x,y,"Chicken");
    const sounds = await Sound.create({
        fart: new URL("../../sounds/fart0.mp3", import.meta.url).href
    }, chicken);

    let vx = 0;
    let vy = 0;
    let vz = 0;

    const speed = 0.02; // Adjust this value to control the speed of the chicken

    chicken.onUpdate = async (dt) => {

        if(keyboard.ArrowLeft) {
            vx -= speed;
            chicken.flipX = false; // Flip the chicken sprite when moving left
        }
        if(keyboard.ArrowRight) {
            vx += speed;
            chicken.flipX = true; // Flip the chicken sprite when moving right
        }
        if(keyboard.ArrowUp) {
            vy -= speed;
        }
        if(keyboard.ArrowDown) {
            vy += speed;
        }

        if(keyPressed.Space && chicken.z === 0) {
            vz = 0.15; // Jump velocity
            sounds.play("fart");
        }

        // Update the chicken's position based on its velocity
        chicken.x += vx * dt;
        chicken.y += vy * dt;
        chicken.z += vz * dt;

        vx *= 0.8; // Apply some friction to slow down over time
        vy *= 0.8;  
        vz -= 0.01;

        if(vx > 0.01 || vx < -0.01 || vy > 0.01 || vy < -0.01) {
            chicken.setState("walk");
        } else {
            chicken.setState("idle");
        }

        if(chicken.z < 0) {
            chicken.z = 0;
            vz = 0;
        }

        setCamTarget(chicken.x, chicken.y);

    }

    return chicken;
}