import { pause, resume } from "@chickenfart/engine/world";

let all; //interface + canvas
let mainMenu;

export function init(newGame) {

    mainMenu = document.getElementById("mainMenu");

    all = document.getElementById("all");

    let newGameBtn = document.getElementById("newGame");

    document.onkeydown = (e) => {
        if(e.key === "Escape") {
            if(mainMenu.style.display != 'none') {
                hideMenu();
                resume();       
            } else {
                pause();
                showMenu();
            }
        }
    };

    newGameBtn.onclick = () => {
        newGame();
    }

    hideMenu();
}

export function hideMenu() {
    mainMenu.style.display = "none";
}

export function showMenu() {
    mainMenu.style.display = "flex";
}

export async function fadeOut(delay) {
    all.style.transition = `filter ${delay}ms ease-out`;
    all.style.filter = `brightness(0)`;
}

export async function fadeIn(delay) {
    all.style.transition = `filter ${delay}ms ease-out`;
    all.style.filter = `brightness(1)`;
}



